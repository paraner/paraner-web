# Çoklu hesap / hesaplar arası geçiş — analiz + öneri

> 2026-07-14. Mehmet'in sorusu: Sidebar profil seçicisine "Yeni Hesap Ekle"nin yanına **"Farklı bir hesaba giriş yap"** eklensin mi (Instagram tarzı)? Senaryolar: (a) bir muhasebeci birden fazla işletmenin Paraner hesabına girmek istiyor, (b) bir kişinin 1'den fazla şirketi var.
> Karar BEKLİYOR — DB şeması değişikliği içerir → mobil ile koordine + Mehmet onayı şart.

## 1. Bugünkü model (kod okunarak çıkarıldı)

- **1 Supabase auth kullanıcısı → N `profiles` satırı** (`profiles.auth_user_id`, `MAX_PROFILES = 3`, `Sidebar.tsx:35`).
- "Hesap değiştir" bir auth işlemi DEĞİL: sadece `profiles.is_active` bayrağını taşımak (`Sidebar.tsx:352`, `AyarlarClient.tsx:104`).
- "Yeni Hesap Ekle" yeni auth kullanıcı açmaz, sadece `profiles`'a satır ekler (`Sidebar.tsx:368`).
- Veri izolasyonu **uygulama katmanında**: `.eq("user_id", profile.id)`. RLS (`user_profile_ids()`) sadece "bu satır BENİM profillerimden birine mi ait" diye bakıyor → **kullanıcı bazlı, profil bazlı değil**.
- Oturum: tek cookie `sb-<ref>-auth-token`, domain `.paraner.com`, `storageKey` default. **Aynı tarayıcıda ikinci bir oturum tutulamaz** — ikinci giriş birincisini ezer.

Sonuç: bir profile **yalnızca tek bir auth kullanıcı** erişebilir. Muhasebeci senaryosu bugün imkânsız (tek çare: şifreyi paylaşmak — kabul edilemez).

## 2. İki AYRI problem (karıştırılırsa yanlış şey inşa edilir)

| | Ne | Nerede çözülür |
|---|---|---|
| **A. Membership** (workspace/organization) | Tek kimlik → N şirkete **erişim yetkisi**. Muhasebeci kendi hesabıyla girer, müşterilerinin şirketleri listesinde çıkar. | Sunucu / RLS. Oturum TEK kalır. |
| **B. Multi-session** (Instagram/Gmail) | Aynı tarayıcıda **N ayrı kimliğin token'ı** duruyor, seçiciyle aktif kimlik değişiyor. | İstemci token yönetimi. |

**Kritik nokta:** Mehmet'in istediği *UX* ("giriş yapmadan hesaplar arası geçiş, Instagram gibi") **A ile de birebir elde ediliyor.** Zaten Sidebar'daki seçici, sektörün "org switcher"ının ta kendisi. B'ye ihtiyaç yok.

## 3. Sektör ne yapıyor (kaynaklı)

| Ürün | Muhasebeci daveti | Geçiş | Abonelik |
|---|---|---|---|
| **Paraşüt** | Ayarlar → Kullanıcılar → e-posta daveti (ayrı "muhasebeci rolü" yok, sınırsız kullanıcı) | Sağ üst menü → tek tıkla diğer firmaya (tekrar giriş YOK) | **Firma başına ayrı abonelik** |
| **QuickBooks** | Ayarlar → "Accounting Firms" → firmayı davet et | Muhasebeci kendi QBO Accountant panelinden müşteriye geçer | **2 muhasebeci ÜCRETSİZ**, kullanıcı limitine saymaz |
| **Xero** | Müşteri, danışmanı "advisor" rolüyle davet eder | Xero HQ müşteri listesi | Org başına abonelik, **kullanıcı sayısı sınırsız/ücretsiz** |
| **Logo İşbaşı** | Mükellef mali müşavirini davet eder | **Mali Müşavir Paneli** (tüm mükellefler tek yerde) | Müşavir paneli ayrı ürün |
| **Odoo** | Kullanıcıda "Allowed Companies" listesi | Sağ üstte şirket seçici | — |

**Hiçbiri çoklu oturum (B) yapmıyor.** Hepsi tek kimlik + membership + şirket seçici.
Kaynaklar: parasut.com/kullanim-kilavuzu/coklu-firma-yonetmek · quickbooks.intuit.com (managing accountant users) · central.xero.com (add client organisations) · isbasi.com/mali-musavirlere-ozel · odoo.com/documentation (multi_company) · workos.com/guide/a-guide-to-organization-modeling

## 4. Neden B (Instagram tarzı çoklu oturum) YAPILMAMALI

- `@supabase/auth-js` bunu **açıkça uyarıyor**: *"Multiple GoTrueClient instances detected in the same browser context… may produce undefined behavior under the same storage key"* (`GoTrueClient.js:140`). Ayrı `storageKey` ile teknik olarak mümkün ama **desteklenen desen değil** (Supabase Discussions #13983, #10237, #21027 — maintainer'lar "kendi storage'ını yaz" diyor, hazır çözüm yok).
- `@supabase/ssr` tek cookie adı etrafında kurgulu; biz üstüne `.paraner.com` cross-subdomain cookie kullanıyoruz. İkinci oturum = sunucu bileşenlerinde "hangi cookie aktif" mantığını elle yazmak. Resmî desen yok.
- **N refresh token = N kat sızıntı yüzeyi.** Tek XSS tüm hesapları alır.
- Ve en önemlisi: **bu iş görmüyor.** Muhasebecinin müşterinin şifresine ihtiyacı olurdu. Membership'te ihtiyaç yok.

## 5. ÖNERİ — Membership modeli (faz faz)

### Şema (EKLEME, mevcut kolonlara dokunmaz — mobil ile koordine + onay gerekir)

```
profile_members
  profile_id     → profiles.id      (erişilen şirket/hesap)
  auth_user_id   → auth.users.id    (erişen kişi)
  role           owner | editor | viewer
  status         active
  created_at

invitations
  profile_id, email, role, token, status(pending|accepted|revoked), expires_at, invited_by
```

- `user_profile_ids()` (SECURITY DEFINER) genişletilir: *kendi profilleri* **UNION** *`profile_members` üyelikleri*. RLS özyinelemesi olmaz (Supabase'in resmî önerisi tam da bu).
- Mevcut sahipler için `profile_members`'a `role='owner'` satırı backfill.

### ⚠️ Yakalanan tuzak: `profiles.is_active` kişiye özel DEĞİL
Bugün "aktif profil" profil SATIRINDA duruyor. Bir profile iki kişi bağlanınca (sahip + muhasebeci), biri hesap değiştirdiğinde **diğerinin de aktif hesabı değişir**. → Aktif seçim **kullanıcı bazına** taşınmalı: `profile_members.is_active` ya da basitçe bir `active_profile_id` cookie'si. Bu, membership'in ön koşulu.

### Fazlar
1. **Faz 1 — muhasebeci/ortak daveti (asıl değer).** `profile_members` + `invitations` + e-posta daveti + kabul sayfası. Roller baştan konur ama ilk sürümde `viewer` + `editor` yeter.
2. **Faz 2 — Sidebar seçici genişler.** "Hesaplarım" (sahip olduklarım) + "Erişimim olanlar" (davetle geldiklerim) iki grup. Geçiş = bugünküyle aynı, tek tık, tekrar giriş yok → **Instagram hissi zaten burada.**
3. **Faz 3 — roller/yetki matrisi** (Paraşüt'ün 3 kademesi: Tüm İşlemler / Sadece Görüntüleme / Yetki Yok).
4. **(Opsiyonel) Faz 4 — Mali Müşavir Paneli:** muhasebeciye özel giriş ekranı, tüm mükellefleri listeleyen dashboard (Logo İşbaşı deseni). Pazarlama silahı: muhasebeci = dağıtım kanalı.

### Fiyatlandırma (piyasa kanıtıyla)
- Abonelik **şirket başına** (Paraşüt + Xero birebir böyle).
- **Muhasebeci koltuğu ücretsiz.** QBO 2 muhasebeciyi ücretsiz veriyor ve kullanıcı limitine saymıyor; Xero'da tüm kullanıcılar ücretsiz. Muhasebeciyi ücretlendirmek benimsemeyi öldürür — o senin satış kanalın.

## 6. Yan bulgular (bu işten bağımsız, düzeltilmeli)
- `Sidebar.tsx:352` `switchTo` **ters sırada** update atıyor (önce hepsini pasifle → sonra hedefi aktifle). İkinci sorgu patlarsa **hiç aktif profil kalmaz**. `AyarlarClient.tsx:104` bilinçli olarak doğru sırada (önce aktifle). Sidebar hizalanmalı.
- Aktif profil çözümü iki yerde farklı: `lib/supabase/profile.ts` `is_active → is_primary → ilk`; Sidebar/layout `is_active → ilk`. `is_active` hiç set değilse sayfa verisi ile Sidebar'da görünen profil **ayrışır**.
- `MAX_PROFILES = 3` limiti membership'le birlikte yeniden düşünülmeli (kendi şirketlerin 3'le sınırlı olabilir ama *erişim verilen* şirket sayısı sınırsız olmalı — muhasebecinin 40 müşterisi olabilir).
