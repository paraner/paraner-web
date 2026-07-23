# Admin panel donması — CANLI ÖLÇÜM + kök neden (2026-07-23)

> Mehmet, 2026-07-19 akşamı: *"sekmeden çıkıp geri girince, Genel Bakış'tayken Destek'e
> basınca donuyor."* O gün yazılan düzeltmeler (`NavPending` + `useRewarmPrefetch`)
> **o an canlıda değildi** (5 commit push edilmemişti). Bugün canlıda, bu yüzden ölçüldü.
>
> Ölçüm: gerçek Chrome (headful, kalıcı test profili), **prod `admin.paraner.com`**,
> `admin@paraner.com` oturumu. Betik: scratchpad `donma-olcum.mjs`.
> Ölçülen an: menüdeki "Destek"e tıklama → `location.pathname === /admin/destek`
> **VE** `h1` metni "Destek Talepleri" olana kadar geçen süre.

## Sonuç: donma GERÇEK ve tekrarlanabilir

| # | Senaryo | Destek sayfası çizildi | Gösterge (`.nav-pending`) |
|---|---------|------------------------|---------------------------|
| **B**  | 40 sn gizli → öne gel → **0,8 sn sonra tıkla** (Mehmet'in senaryosu) | 🔴 **5 859 ms** | 10 ms |
| **B2** | aynısının tekrarı | 🔴 **3 359 ms** | 8 ms |
| **C**  | 40 sn gizli → öne gel → **15 sn bekle** → tıkla | ✅ **17 ms** | çıkmadı (gerek yok) |
| **A**  | sıcak kontrol: taze sayfa, hover + tıkla | ✅ **14 ms** | çıkmadı (gerek yok) |

**B/B2 ile C arasındaki tek fark, tıklamanın ısıtma patlamasının İÇİNE mi yoksa
SONRASINA mı düştüğü.** Aynı sayfa, aynı oturum, aynı veri: 5 859 ms ↔ 17 ms.

✅ **19.07'de eklenen `NavPending` işini yapıyor:** tıklamadan 8-10 ms sonra "Yükleniyor…"
çıkıyor. Yani *"hiçbir tepki yok"* şikâyetinin **gösterge** kısmı çözülmüş.
🔴 Çözülmeyen: **beklemenin kendisi** (3,4-5,9 sn).

## Kök neden: ısıtma patlaması, tıklamanın önünü kesiyor

Sekme öne geldiği anda AYNI ANDA şunlar tetikleniyor:

- `useRewarmPrefetch` → menüdeki **7 rotanın hepsine** `router.prefetch(kind:"full")`
- `LiveRefresh` (Genel Bakış'ta) → `router.refresh()` = `/admin`'in TÜM sorguları

Ölçülen dalga (senaryo B, sekme öne geldikten sonra, tıklamadan ÖNCE — 9 istek):

```
+    9 ms   6725 ms  200  /admin?_rsc=…            ← LiveRefresh'in tazelemesi
+   10 ms    138 ms  200  /admin/destek/<id>?_rsc=…  (hafif, kabuk prefetch'i)
+   10 ms    124 ms  200  /admin/destek/<id>?_rsc=…
+   10 ms    234 ms  200  /admin/destek/<id>?_rsc=…
+   10 ms    233 ms  200  /admin/destek/<id>?_rsc=…
+  134 ms   6395 ms  200  /admin/denetim?_rsc=…    ┐
+  148 ms   5683 ms  200  /admin/ekip?_rsc=…       │ kind:"full" ısıtma —
+  242 ms   5533 ms  200  /admin/ai?_rsc=…         │ hepsi AYNI ANDA
+  243 ms   6315 ms  200  /admin/destek?_rsc=…     ┘
```

Kullanıcı +800 ms'de tıklıyor. O anda **10 istek uçuyor**. Tıklama kendi rotasının
zaten uçmakta olan `full` prefetch'ine bağlanıyor — ve o istek kuyrukta sıkışmış
durumda (6 315 ms). Sayfa 5 859 ms'de çiziliyor. Aritmetik tutuyor.

### Arka uç eşzamanlılığı yok — istekler fiilen sıraya giriyor

Aynı rotalar **tek başına** koştuğunda (senaryo C'de, dalga bittikten sonra ölçüldü):

| rota | dalga İÇİNDE | tek başına |
|------|--------------|-----------|
| `/admin/musteriler` | — | 942 / 1 163 ms |
| `/admin/canli` | 434 ms | 470 ms |
| `/admin/destek/<id>` | 138-234 ms | 58-145 ms |
| `/admin/denetim` | 3 219-6 395 ms | — |
| `/admin/ekip` | 3 213-5 683 ms | — |
| `/admin/ai` | 3 447-5 533 ms | — |
| `/admin/destek` (full) | 3 974-6 315 ms | — |

5 ağır istek eşzamanlı → her biri ~4× yavaşlıyor. Bu, **kapasitenin fiilen tek isteği
seri işlediğinin** imzası (Vercel Hobby lambda eşzamanlılığı + Supabase Free disk IO).
Yani ısıtmayı paralel yapmak *ücretsiz değil* — tam da kullanıcının tıkladığı anda
sistemin tek şeridini dolduruyor.

### İroni

`useRewarmPrefetch` **tam bu senaryoyu hızlandırmak için** yazıldı (19.07). Ölçüm,
onun bu senaryoyu **yavaşlattığını** gösteriyor: ısıtma olmasaydı tıklama TEK bir
istek açacaktı (~1-1,5 sn, üstelik 10 ms'de gösterge ile). Isıtma patlaması yüzünden
3,4-5,9 sn sürüyor.

## Etki: yalnız admin değil, MÜŞTERİ PANELİ de aynı

`useRewarmPrefetch` ORTAK (`app/components/useRewarmPrefetch.ts`):
- `app/admin/AdminSidebar.tsx` → 7 rota
- `app/panel/Sidebar.tsx` → `CORE_PREFETCH_LIST` = 6 rota

Yani `app.paraner.com`'da da sekmeden dönüp menüye basan müşteri aynı kuyruğa giriyor.
**Müşteri panelinde ölçülmedi** — düzeltmeden sonra orada da ölçülmeli.

## YAPILDI (2026-07-23) — kod + yerel doğrulama

### ① Isıtma patlaması kaldırıldı — HER İKİ PANELDE
- `app/components/useRewarmPrefetch.ts` **silindi** (sekme-öne-gelince + fare-menüye-girince
  tüm rotaları birden `kind:"full"` ısıtan hook). Her iki `<aside>`'daki `onMouseEnter/onFocus`
  tetikleyicileri de gitti.
- `AdminSidebar`: linklerdeki `prefetch` (=**true** = tam rota + verisi) kaldırıldı → `auto`.
- `panel/Sidebar`: `CORE_PREFETCH` listesi + `prefetch={… ? true : undefined}` kaldırıldı → `auto`.
- Her iki menüde `unstable_dynamicOnHover` **KALDI**: niyet gösterilen TEK rota Full'e yükseliyor.
- ⚠️ Eski gerekçenin ikinci ayağı da çürüdü: *"dokunmatikte hover yok"* doğru ama Next'in Link'i
  **dokunmayı da niyet sayıyor** — `onTouchStart` → `onNavigationIntent(el, upgrade)`, hover ile
  birebir aynı Full yükseltmesi (`next/dist/client/app-dir/link.js:340-354`).

### ② `listPeople()` sunucu önbelleği
`lib/adminUsers.ts` → `listPeopleCached()` (`unstable_cache`, 60 sn, etiket `admin-kisiler`).
`/admin/destek` + `/admin/musteriler` onu kullanıyor. Önbelleğe girmesi güvenli: `createAdminClient`
yalnız env okuyor, **çerez okumuyor** (19.07'de paneli patlatan tuzak bu ayrımdı).
Hata **önbelleğe alınmıyor** (hata hâlinde `throw` → `unstable_cache` yalnız başarıyı saklar).

**Düşürme:** kişi/profil değiştiren 6 server action `updateTag("admin-kisiler")` çağırıyor
(`updateProfileInfo` · `changeUserEmail` · `setProfilePlan` · `setUserBanned` ·
`deleteUserAccount` · `inviteStaff`).
⚠️ `revalidateTag` DEĞİL: Next 16'da `revalidateTag(tag,"max")` **bayat içeriği servis edip**
arkada tazeliyor → yönetici sildiği müşteriyi bir kez daha listede görürdü. `updateTag` anında
düşürüyor ve sonraki istek taze veriyi bekliyor. İkisi de aynı iç `revalidate()`'e iniyor
(`revalidate.js:40-63`) → `unstable_cache` etiketleri kapsam içinde.

### ③ `LiveRefresh` odak tazelemesi 1,2 sn gecikmeli
Sekmeye dönüp hemen başka sayfaya geçen kullanıcı o tazelemeyi artık hiç ödemiyor.

### Doğrulama (yerel prod build + CANLI Supabase, `admin.localhost:3999`)
> Oturum kalıcı test profilinden kopyalandı → **yeni giriş yok, "yeni cihaz" maili yok.**

1. ✅ **Isıtma patlaması gitti:** `/admin` açılışında 29 RSC isteğinin **hepsi 2-14 ms**
   (ucuz kabuk prefetch'i). Eskiden 4-7 tanesi ağır tam-yük isteğiydi.
2. ✅ **Önbellek isabet ediyor** (sunucu süresi, tarayıcısız ölçüm):
   `/admin/musteriler` **2 194 → 451 / 531 / 545 ms** · `/admin/destek` **708 → 443 / 367 / 405 ms**.
3. ✅ **Yazma sonrası önbellek ANINDA düşüyor** (asıl risk buydu): test hesabının profil adı
   `MGZR LLC` → `MGZR LLC ZZ` yapıldı, liste **hemen** yeni adı gösterdi; ad geri alındı,
   liste eski hâline döndü. `updateTag` gerçekten `unstable_cache` etiketini düşürüyor.
4. ✅ Destek'e tıklama yerelde: gösterge 4-6 ms, sayfa 444-544 ms.
   ⚠️ Yereldeki mutlak süreler prod'la kıyaslanamaz (Vercel lambda eşzamanlılık sınırı yok).

### ⏳ KALAN: prod ölçümü
Asıl kanıt canlıda: deploy sonrası **aynı betik** (`donma-olcum.mjs`) tekrar koşulup
B/B2/C/A senaryoları ölçülecek ve bu dosyaya yazılacak. Beklenen: B'nin 5 859 ms'den
1 sn altına inmesi.

## Yapılacak (öneri — ÜÇÜ DE YUKARIDA UYGULANDI)

1. **Isıtma patlamasını kaldır.** Sekme öne gelince 7 rotayı birden ısıtma.
   Next 16 zaten NİYETE göre ısıtıyor: prefetch kuyruğu önceliği
   *"1) görüş alanındaki linkler, 2) niyet gösteren linkler (**hover VEYA DOKUNMA**)"*
   (`node_modules/next/dist/docs/01-app/02-guides/prefetching.md:196-203`).
   ⚠️ 19.07'de "dokunmatikte hover yok → peşin ısıtma şart" denmişti; **belge bunu
   çürütüyor**, dokunma da niyet sayılıyor. `unstable_dynamicOnHover` Link'te zaten açık.
2. **`listPeople()` önbelleği.** `/admin/destek` + `/admin/musteriler` dalganın iki ağır
   ayağı. Fonksiyon service_role ile çalışıyor, **çerez okumuyor** → `unstable_cache`'e
   uygun (`/admin` panosunda aynı desen zaten var, 120 sn).
3. **`LiveRefresh`'in odak tazelemesi geciktirilsin** (ör. ~1,2 sn): kullanıcı sekmeye
   dönüp hemen başka sayfaya geçiyorsa o tazeleme hem boşa gidiyor hem tıklamanın önünü
   kesiyor.

## Ölçüm betiğinin kendi hatası (kayıt için)

İlk sürümde "içerik geldi" dedektörü `.admin-ticket-row` idi — **o sınıf Genel Bakış
panosunda da kullanılıyor** (`app/admin/page.tsx:242`) → tıklamadan önce zaten DOM'daydı,
"1 ms'de geldi" diye YALAN ölçüyordu. Düzeltildi: `pathname === "/admin/destek"` **VE**
`h1` metni. **Ders (yine):** seçiciyi kaynağa bakmadan seçme; bir sınıfın hedef sayfaya
ÖZGÜ olduğunu varsayma.
