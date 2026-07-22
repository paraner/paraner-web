# GÖREVLER — paraner-web

> Sadece açık görevler. Tamamlananlar için `DAILY_LOG.md` + git geçmişi.

## ✅ UÇTAN UCA CANLI TEST GEÇTİ (2026-07-21) — 20.07 oturumunun tamamı doğrulandı
> Gerçek tarayıcıyla, **canlı prod'da** (deploy = `ee87245`, Vercel'den teyitli), gerçek müşteri
> hesabı açılıp uçtan uca koşuldu. Ölçümler:
> 1. ✅ **Admin yanıtı yenilenmeden görünüyor — 1,1 sn** (üstelik müşteri tarafında da canlı: 2,1 sn)
> 2. ✅ **Ekli talep `/admin/destek`'e ANLIK düştü — 4,2 sn**, sayfa YENİLENMEDEN
>    (3 sn boğazlama düşünülürse beklenen aralık). Bekleyen rozeti 3→**4**, sayaçlar
>    (5 talep · 4 yanıt bekliyor) canlı güncellendi, çanda nokta çıktı.
>    Satırda müşteri bağlamı doğru: e-posta · ad · Ücretsiz · "Üye: bugün" · 1 profil · Teknik.
> 3. ✅ **Ek dosya imzalı linkle açıldı** — yeni sekme, `…/storage/v1/object/sign/ticket-attachments/…`,
>    **HTTP 200 · image/png**. (Private bucket + `createSignedUrl` zinciri sağlam.)
> 4. ✅ **Silme sebebi zorlaması çalışıyor:** sebep seçilmeden "Kalıcı olarak sil" **kapalı**,
>    seçilince açılıyor. Silme başarılı (eski FK 500 hatası YOK → SET NULL migration'ı iş görüyor).
> 5. ✅ **`/admin/destek`:** *"hesap silindi · admin@paraner.com · Test / dahili hesap · 21 Tem 2026"*
> 6. ✅ **`/admin/denetim`:** *"Hesap KALICI silindi · mgzrcom@gmail.com / admin@paraner.com ·
>    21 Tem 2026 14:32 / 1 destek talebi bu hesaba aitti · Sebep: Test / dahili hesap"*
> ✅ Commit + push YAPILDI (`ee87245`) ve canlıda. *(Eski "commit/push yapılmadı" notu bayattı.)*
- [x] ✅ **TALEP SİLME EKLENDİ (2026-07-21, Mehmet talebi)** — aşağıdaki bloğa bak.
      Test artığı (`ZZTEST ekli talep 11:29:27` + eki) artık panelden silinebilir; deploy sonrası
      bu talebin silinmesi aynı zamanda özelliğin canlı testi olacak.
- [x] ✅ **Denetim listesindeki ham anahtar düzeltildi** (2026-07-21) — `staff_removed` artık
      "Personel ekipten çıkarıldı"; yeni `ticket_deleted`/`ticket_delete_failed` de sözlükte.

## Şimdiki

### 💳 ÜCRETSİZ DENEME 14 GÜN + FİYAT/PLAN HİZALAMASI ✅ TAMAMLANDI (2026-07-17)
> Deneme 7→**14 gün** (Mehmet kararı). ⚠️ **Süreyi belirleyen yer kod DEĞİL, DB'deki `get_trial_status`
> RPC'si** — mobil `checkTrialStatusServer` ile onu okuyor (`checkTrialStatus` yerel fonksiyonu hiç
> kullanılmıyor). Bu yüzden App Store sürümü gerekmedi. Çalıştırıldı + canlı doğrulandı:
> `paraner-app/supabase/trial-14-gun.sql` (guard korundu) · `trial-expire-cron.sql` · `supabase functions deploy ai-chat`.
> Süre değişirse ÜÇÜ birlikte: RPC + `paraner-app/lib/trial.ts TRIAL_DAYS` + `ai-chat/index.ts TRIAL_DAYS` (+ `paraner-web/lib/plans.ts` gösterim).
- [x] **Zombi premium çözüldü:** deneme bitişini SADECE mobil istemci yapıyordu (uygulamayı açmayan sonsuza kadar premium; `ai-chat` de `is_premium`'a bakıp sınırsız AI veriyordu = para sızıntısı). Artık günlük `expire-stale-trials` cron'u (03:00 UTC) düşürüyor. 3 zombi temizlendi.
- [x] **Fiyatlar tek doğru kaynağa (mobil `app/premium.tsx`) hizalandı:** web ana sayfa ₺129/₺349 → **₺149,90 / ₺490**, `layout.tsx` AggregateOffer şeması (**Google'a yayınlanıyor**) 0/149.90/490. Onboarding hesap türüne göre; işletmede ücretsiz plan YOK (mobil paritesi), bireysel/işletme **Max kaldırıldı** (mobil Max'a deneme vermiyor + ödeme sistemi yok).
- [ ] ⚠️ **ÖDEME ENTEGRASYONU GELİNCE (kritik):** (1) `trial-expire-cron.sql` ÖDEYEN müşteriyi de düşürür — satın alımda `trial_plan` temizlenmeli ya da cron'a "aboneliği yok" koşulu. (2) Max planları web'e mobil ile BİRLİKTE geri eklenir. (3) `lib/lifecycle.ts` "paid" ayrımı gerçek abonelikten okumalı.
- [ ] **Eski test verisi:** aktif 3 deneme `business_max_monthly` planında — artık sunulmayan plan (düzeltme öncesi açılmış). Bozuk değil, temizlenebilir.
- [ ] **Fiyat/plan sözlüğü tek kaynak notu:** `paraner-web/lib/plans.ts` mobil `stores/authStore.ts`'ten kopya — mobil tier listesi değişirse burası da güncellenmeli (DB'de CHECK constraint YOK, uydurma değer sessizce yazılır).

### 🔍 ADMIN PANEL DENETİMİ (2026-07-18) — tam liste: `docs/DENETIM-ADMIN-2026-07-18.md`
> 4 paralel ajan (güvenlik·doğruluk·SQL·UX), her kritik bulgu elle doğrulandı. Mimari sağlam
> (service_role sızmıyor, tüm server action'lar guard'lı, enjeksiyon/IDOR/XSS yok). Kusurlar:
> **DURUM (2026-07-18):** K1·K2·K3 + Y1-Y6 + O12 **KODLANDI** (tsc + build temiz).
> ✅ **3 SQL de çalıştırıldı (2026-07-18).** K3·K1·K2·Y3·O8 canlı DOĞRULANDI (5/5 ✅).
> O1·O3·O4 da çalıştırıldı → DOĞRULAMA 8/8 ✅ (2026-07-18, ekran görüntüsüyle teyit).
> 🔁 **Durum kontrolü:** `sql/admin/admin-denetim-DOGRULAMA.sql` — sadece OKUR, 8 satır ✅/❌ + eksikse dosya adı.
> ⛔️ `paraner-app/supabase/ai-usage-rpc-fix.sql` **GEÇERSİZ** — tekrar çalıştırılırsa K2'yi sessizce geri alır.
- [x] 🔴 **K1 — AI maliyet geçmişi HER PAZAR siliniyor:** silme cron'u Pazar 00:00, rollup her gün 02:00 (yani SONRA) + `ON CONFLICT DO UPDATE SET x=EXCLUDED.x` körlemesine eziyor → kısmi ay tam özeti eziyor. Fix: `GREATEST(...)`. ⚠️ SQL'deki "rollup daha erken" yorumu YANLIŞ.
- [x] 🔴 **K2 — `/admin/ai` geçmiş ayları eksik gösteriyor:** `NOT EXISTS` çift-sayma koruması K1 durumunda TAM olanı atıp EKSİK olanı seçiyor. Fix: varlığa göre değil AYA göre ayır (canlı ay=günlük, geçmiş=aylık).
- [x] 🔴 **K3 — müşteri `sender_type='agent'` mesaj yazabiliyor:** destek personeli taklidi + bilet `answered` olup agent kuyruğundan DÜŞÜYOR + Resend e-postası tetikleniyor. Fix: `messages_insert` WITH CHECK'e rol koşulu.
- [x] 🟠 **Y1** `/admin/page.tsx` service_role okuyor ama sayfa guard'ı YOK (diğer 5 sayfada var, Next 16 layout-guard'ı önermiyor) · **Y2** premium/free tek tıkla, onay yok + `trial_*` null'lanıyor (geri alınamaz) · **Y3** `ai_usage_rollup()` PUBLIC EXECUTE (REVOKE yok) · **Y4** destek sorgusu patlarsa pano "hepsi yanıtlandı" der · **Y5** `inviteStaff` rol hatasını yutup "davet edildi" der · **Y6** `/admin/canli` tüm hataları yutup "kimse yok" der
- [x] 🟡 **Orta bulgular (2. tur):** O1 indeks · O3 count(*)→reltuples (8sn timeout) · O4 ölü-kayıt sayacı ayrı RPC · O5 10.000 kırpma uyarısı · O7 "Kayıp" segmenti · O8 FK CASCADE · O9 audit target_user_id · O10 silme-başarısız telafi kaydı · O11 loading.tsx · D3 kolon seçimi. **Kalan:** O2 (K2 ile çözüldü) · O6 kart-segment birim çelişkisi (pano PROFİL, segment KİŞİ sayıyor + "Premium profil" kartı seg=paid ile uyuşmuyor) — birim etiketi veya kişi-bazlı hesap kararı gerek
- [ ] 🟢 ~18 cila (loading.tsx yok, PageHead deseni kullanılmıyor, terminoloji Müşteri/Üye/Kullanıcı karışık, klavye erişimi, boş durum 3 ayrı sınıf…) — raporda

### 🗑️ TALEP SİLME (2026-07-21) — admin-only, ⏳ CANLI TEST BEKLİYOR
> Mehmet: "adminler talebi silebilsin ama çalışanlar değil; hem açık hem kapalı talepleri
> kendim temizlerim." Kararlar: **detay + listede çoklu seçim** · **denetim kaydı VAR, sebep YOK**.
> ⚠️ tsc + build temiz, **canlıda denenmedi** (deploy sonrası ilk iş).
- [x] **SQL/şema GEREKMEDİ** — `ticket_messages.ticket_id → support_tickets` zaten CASCADE
      (`destek-faz0.sql:27`). ⚠️ **RLS'e DELETE politikası BİLEREK EKLENMEDİ:** politika yoksa
      hiçbir istemci (müşteri de agent de) talep silemez; silme yalnız guard'lı server action'dan
      geçer. Politika eklemek yetki kapısını ikinci bir yere kopyalamak olurdu.
- [x] **`deleteTickets()`** (`lib/adminActions.ts`) — `requireAdmin()` (agent reddedilir) +
      talep başına `ticket_deleted` denetim kaydı (başlık/durum/departman, silmeden ÖNCE yazılır) +
      başarısızlıkta `ticket_delete_failed` telafi kaydı. Tavan: **50 talep/işlem**.
- [x] 🔴 **Cascade'in KAPSAMADIĞI iki şey elle siliniyor** (asıl iş buydu):
      **(1) Ek dosyalar** — storage FK bilmez, `ticket-attachments/<talep_id>/…` yetim kalırdı
      (private bucket → kimse göremez ama disk + "sildim" dediğin veri durur).
      **(2) Bildirimler** — `notifications.data.ticket_id` **jsonb, FK DEĞİL** → çanda silinmiş
      talebe giden ölü bağlantı kalırdı (tıklayınca 404).
- [x] **UI:** talep detayında "Sil" · listede satır seçimi + "Görünenleri seç" + "Seçilenleri sil".
      İkisi de `confirmDialog` ile onaylı. Buton yalnız `role === "admin"` iken çizilir.
- [x] **Seçim deseni Shopify'a hizalandı** (Mehmet, 2026-07-22, sipariş listesi ekran görüntüsü):
      ayrı **"Seçimi bırak" butonu KALDIRILDI** (yıkıcı butonun yanında duruyordu = yanlış tıklama
      riski). Ekranda **tek ana kutu** var: seçim yokken panelde "Görünenleri seç (N)", seçim
      başlayınca yerini çubuktaki kutu alıyor (kısmi seçimde **belirsiz** hâli). Seçimi bırakmanın
      iki yolu: o kutuya bas ya da **boş bir yere tıkla**.
      ⚠️ Boş-yer dinleyicisi BELGE seviyesinde: bileşenin kendi `<div>`'ine koymak YETMEDİ —
      listenin altındaki boşluk o div'e dahil değil (ölçümle görüldü, ilk denemede çalışmadı).
      Dışlananlar: satır/kutu/çubuk/araç çubuğu + `.confirm-overlay` (onay diyaloguna basınca
      seçim uçarsa silinecek talepler kaybolurdu).
- [x] **`ThreadClient` müşteriyle ORTAK** → silme kodu içine gömülmedi, `headerAction` yuvası
      eklendi. Sebep: admin server-action referansı müşteri paketine sızmasın.
- [x] **Yan düzeltme:** `/admin/destek/[id]` sayfasının **kendi guard'ı yoktu** (yalnız layout'a
      güveniyordu — CLAUDE.md kural 5 ihlali, denetim Y1'in aynısı). `requireStaffPage()` eklendi.
- [x] ✅ **DOĞRULANDI (2026-07-21, yerel prod build + CANLI Supabase — `admin.localhost:3999`):**
      admin seçim kutularını görüyor · **tekil silme çalıştı** (ZZTEST talebi gerçekten silindi,
      listeden düştü) · toplu seçim çubuğu (3 seçildi · "Seçilenleri sil" · "Seçimi bırak") ·
      onay diyalogu çıkıyor ve **İPTAL edilince hiçbir şey silinmiyor** (3/3 duruyor) ·
      denetim kaydı doğru detayla düştü (konu · durum · departman · ticket_id · sahibi-silinmiş).
- [x] 🔴 **Test SIRASINDA iki kusur bulundu ve düzeltildi:**
      **(1) "Sil" butonu TIKLANAMIYORDU** — `.admin-top-actions` mutlak konumlu (top:26/right:32)
      ve içeriğin üstünde yüzüyor; `.thread-head` tam genişlikte flex satır olduğu için sondaki
      butonlar kümenin ALTINA giriyordu. ⚠️ Sorun benim butonumla göründü ama **öncesinde de
      vardı**: uzun konu başlığında "Çözüldü" aynı yere düşüyor. Admin kabuğunda başlığa sağ
      rezervasyon eklendi (720px altında küme akışa döndüğü için rezervasyon kalkıyor).
      **(2) Yeni aksiyon denetimde HAM ANAHTAR** ("ticket_deleted") çiziliyordu → sözlüğe eklendi;
      aynı boşluktaki eski `staff_removed` de etiketlendi (yukarıdaki 🟡 madde kapandı).
- [x] ✅ **(a) EK DOSYA SİLME KANITLANDI (2026-07-22, service_role denetimi):** denetim kaydındaki
      **6 silinmiş talebin hiçbirinde dosya kalmamış** (3'ünün eki vardı). Genel yetim taraması da
      temiz: bucket'taki tek klasör hâlâ yaşayan bir talebe ait. Betik: `22-storage-denetim.mjs`
      (scratchpad) — denetim kaydından silinen id'leri alıp storage'da arıyor.
- [x] ✅ **(b) AGENT SİLEMİYOR — 13/13 DOĞRULANDI (2026-07-22, gerçek agent hesabıyla, CANLIDA).**
      Geçici hesap açıldı → `agent` + yalnız `oneri` departmanı verildi → test → hesap silindi
      (rol/departman FK CASCADE ile gitti, SQL temizliği gerekmedi).
      **Arayüz:** listede seçim kutusu YOK · başlıkta "hepsini seç" YOK · talep detayında yalnız
      "Çözüldü" var, **"Sil" YOK** · sol menü sadece "Genel Bakış | Destek" · `/admin/musteriler`
      elle yazılınca **404**.
      **Departman ayrımı (İLK KEZ TARAYICIDA):** 5 talepten yalnız 1'ini gördü (`cdscsc`, oneri).
      🔴 **DB katmanı da ayrıca test edildi** — "UI'ı gizlemek güvenlik değildir": agent'ın KENDİ
      JWT'siyle doğrudan PostgREST'e gidildi → gördüğü talebi silemedi (0 satır) · görmediğini
      silemedi · mesajları silemedi · talep sayısı 5→5 değişmedi. `support_tickets`'ta DELETE
      politikası bilerek YOK → hiçbir istemci silemiyor, yalnız guard'lı server action siliyor.
      **Denetim:** agent'e ait hiç `ticket_deleted` kaydı düşmedi.

### 🐞 MÜŞTERİ TALEP AÇMA: 3 KUSUR (2026-07-22, Mehmet canlıda buldu) — ⏳ 1 SQL BEKLİYOR
> "Talep açınca sayfayı yenilemeden görünmüyor · çok yavaş · 'talebiniz oluşturuldu' bildirimi
> ne çanda ne bildirim sayfasında." Üçü de doğrulandı, üçü de AYRI sebepti.
- [x] 🔴 **Liste bayat kalıyordu — CLAUDE.md kural 1 ihlali.** `submitTicket` yalnız `router.push`
      yapıyordu, **`router.refresh()` YOKTU** → `staleTimes.dynamic:30` yüzünden kullanıcı listeye
      dönünce yeni talebini GÖREMİYORDU. ⚠️ **Kendi test boşluğum:** 21.07'de admin tarafının
      canlı düştüğünü ölçmüştüm ama MÜŞTERİ listesini hiç test etmemiştim.
      Doğrulandı: uygulama içi geri ile 6 → 7 talep, yenileme yok.
- [x] ⚡ **Yavaşlık ölçüldü ve yarıya indi: 2,23 sn → 1,49 sn (−%33).**
      Ölçüm (ek dosyalı): `getUser` 164ms → ticket 282ms → **yükleme 669ms** → mesaj 341ms, hepsi ARDIŞIK.
      (1) `getUser()` → `getSession()`: getUser her çağrıda Supabase'e gidiyor, getSession yerel okuyor.
      Güvenlik kaybı yok — gerçek kapı RLS'in `user_id = auth.uid()`'i, oradaki id JWT'den okunuyor.
      (2) **Ek yükleme ile mesaj yazımı PARALEL.** Mümkün oldu çünkü yol yüklemeden ÖNCE
      üretilebiliyor (`ticketFilePath`). ⚠️ **"Önce mesajı yaz, sonra attachment_url'i UPDATE et"
      YOLU SEÇİLMEDİ:** realtime yalnız INSERT dinliyor (`subscribeMessages`) → sonradan UPDATE
      karşı tarafa GİTMEZ, ek ancak yenilemede görünürdü = sessiz regresyon.
      Yükleme düşerse kolon temizleniyor (ölü yol kalmasın), talep yine açılıyor.
      ℹ️ Kalan süre büyük ölçüde 3 zorunlu tur + yazışma sayfasının sunucu render'ı.
- [ ] ⏳ **ÇALIŞTIRILACAK: `sql/destek/destek-sahibe-bildirim.sql`** — bildirim eksiğinin KÖK NEDENİ
      `destek-departman.sql:125`'teki `WHERE s.user_id <> NEW.user_id` satırıydı: talebi açan kişi
      bildirim listesinden dışlanıyordu. Doğru amaçla yazılmıştı (ekip üyesi kendi talebine "Yeni
      destek talebi" İŞ bildirimi almasın) ama sonucu **hiçbir müşterinin onay bildirimi almaması**
      oldu. Fix: iki AYRI bildirim → ekibe `support_new` (/admin/...), sahibe `support_created`
      "Talebin alındı" (/panel/...). Sahip ekip sorgusundan hâlâ dışlı → çift bildirim yok.
      ⚠️ **MOBİL DE ETKİLENİR ve bu İSTENEN:** mobil çan aynı tabloyu okuyor, mobil kod değişmiyor.
      Dosya sonunda 2 satırlık doğrulama sorgusu var.
- [x] **Anlık geri bildirim:** "Talebin alındı" toast'u eklendi (çandaki kalıcı kayıttan ayrı).
- [x] **Yan kazanç:** test talepleri yeni TOPLU SİLME ile temizlendi → toplu silme gerçek veriyle
      de uçtan uca doğrulanmış oldu (4 talep tek işlemde).

### 🛠️ ADMIN / İÇ EKİP PANELİ — canlı (admin.paraner.com)
> Plan: `docs/ADMIN-PANEL.md`. Mehmet: kurucu+çalışanlar için müşteri yönetim paneli (üyeleri tür/abonelik
> analiz + destek). Aynı repo içinde `/admin` route (Next code-split → müşteri bundle'ını şişirmez).
> Kuruldu: rol guard (`lib/adminGuard`), service_role client (`lib/supabase/admin`, server-only),
> layout+sidebar (Müşteriler/Ekip admin-only), Dashboard (metrik), Müşteriler (liste+filtre), Destek
> (ticket listesi), Ekip (yakında).
- [x] **service_role key** — `.env.local` + Vercel Production ✓ (anahtar canlı doğrulandı: auth admin API 200). ⚠️ Preview'e EKLENMEDİ (Vercel ortam dropdown'ı Production sayfasından kilitli; gerekirse Environments → Preview → ayrıca ekle).
- [x] **admin@paraner.com admin yapıldı** (2026-07-17, service_role ile `user_roles`'e insert; `agent` satırı da duruyor, kod admin>agent okuyor).
- [x] **`admin.paraner.com` host bağlama (kod)** — 2026-07-17 `b21300c`: proxy `isAdmin`/`isPrivate`, kök→`/admin`, giriş admin host'unda, `/kayit` kapalı, `admin.*/panel`→`app.*`; AuthForm.goPanel + LogoutButton admin-farkında.
- [x] **`admin.paraner.com` DNS/Vercel Domains** — eklendi, adres açılıyor (2026-07-18 teyit).
- [x] **İç ekip giriş ekranı** (`3f01f6c`) — admin.paraner.com/giris: e-posta+şifre, kayıt/sosyal YOK.
- [x] **Müşteri detay + aksiyonlar + ekip yönetimi** (`62a10ab`, canlı doğrulandı): kişi bazlı liste (e-posta ile arama), detay (profiller + işlem/fatura/hesap + son hareket), şifre sıfırlama maili · premium/free · askıya al (Supabase ban) · kalıcı sil, ekip davet/rol ver-al.
- [x] **`sql/admin/admin-audit-log.sql` çalıştırıldı** (2026-07-17) — yazma + gizlilik (anon 0 satır) canlı doğrulandı.
- [x] **Müşteri listesi yenilendi** — durum `is_premium`'dan DEĞİL, `trial_start_date + 14` ile HESAPLANIYOR (`lib/lifecycle.ts`). Segmentler (zombi/bitiyor/denemede/yeni/ücretli/ücretsiz/kayıp/askıda, sayaçlı) + sıralama (kayıt·son giriş·deneme bitişi·e-posta) + URL'de saklama (`?seg=&sort=&tur=`).
- [x] **Canlı GÖZ teyidi** — admin.paraner.com giriş + panel + buton dili + sağ üst bekleyen-talep rozeti onaylandı (2026-07-18).
- [x] ✅ **Şifre sıfırlama maili ön koşulu KARŞILANDI** (2026-07-21, Mehmet ekran görüntüsüyle teyit):
      Supabase → Auth → URL Configuration → Redirect URLs'te `https://paraner.com/sifre-sifirla` **var**.
      Listedeki 5 URL: `paraner.com/auth/callback` · `app.paraner.com/auth/callback` ·
      `localhost:3000/auth/callback` · `paraner.com/sifre-sifirla` · `admin.paraner.com/sifre-olustur`.
      ℹ️ DAILY_LOG'daki *"dev `localhost:3137`"* notu YANLIŞMIŞ: `package.json` düz `next dev`
      (port yok) → varsayılan **3000**, yani kayıtlı `localhost:3000/auth/callback` doğru adres.
      Yerelde şifre sıfırlama akışı denenecekse `http://localhost:3000/sifre-sifirla` eklenmeli.
- [x] ~~audit log'u panelde GÖSTER~~ — **BU MADDE BAYATMIŞ**: `/admin/denetim` ekranı zaten yazılmış
      (`app/admin/denetim/page.tsx` + `DenetimClient.tsx`). 2026-07-20'de fark edildi.
- [ ] **Sonraki (kod):** müşterinin destek talepleri detay sayfasında · trial/abonelik analizi.
- [ ] **Karar:** `app.paraner.com/admin` hâlâ açık (rol-korumalı, açık değil). DNS canlıya alınınca admin host'una redirect edilsin mi (tek adres) — Mehmet.
- [ ] **Ölçek notu:** Dashboard "Toplam Üye" = distinct `auth_user_id` (PostgREST'te distinct count yok → kolon çekilip Set'leniyor, `.limit(10000)`). Binlerce profilde RPC gerekir → **DB şeması = önce sor**.

### 🤖 AI TOKEN + MALİYET TAKİBİ (/admin/ai) ✅ TAMAMLANDI (2026-07-17)
> "Hangi hesap ne kadar AI harcadı?" — Gemini `usageMetadata` (token) döndürüyordu ama `ai-chat`
> atıyordu. Fiyat kodda sabit (`lib/aiPricing.ts`) — **Google fiyat API'si yok**, değişirse orası elle.
> ⚠️ İKİ REPO + DB + EDGE, SIRA KRİTİK: web `sql/admin/admin-panel-rpc.sql` → mobil `ai-token-maliyet.sql` → EN SON `functions deploy ai-chat`.
- [x] **DB** (`paraner-app/supabase/ai-token-maliyet.sql`) çalıştırıldı + **service_role ile canlı doğrulandı**: `daily_ai_usage`'a `prompt_tokens`+`completion_tokens` (DEFAULT 0, kota mantığı korunur) · `increment_ai_usage` 3→5 param (eski çağrılar hâlâ çalışır) · `ai_usage_monthly` özet tablosu · `ai_usage_rollup()` + 02:00 UTC cron · `admin_ai_usage(p_ay)` panel RPC'si (`assert_admin` guard, canlı ay + geçmiş UNION, çift sayma korumalı).
- [x] **Edge** `supabase functions deploy ai-chat` (`oqhonmmbcqrkcaoijgnb`) — `readUsage()` ile token okunup RPC'ye geçiliyor.
- [x] **Web** `/admin/ai` paneli (ay seçici + hesap bazlı token/maliyet tablosu) + `lib/aiPricing.ts`.
- [ ] ⚠️ **GERİYE DÖNÜK VERİ YOK:** token bu deploy'dan sonra başlar; `daily_ai_usage` şu an boş → panel yeni kullanımla dolar.
- [x] **Canlı teyit:** token kaydı ÇALIŞIYOR (veri geldi) — ama panel `admin_ai_usage` hatasıyla patladı ↓
- [x] **`paraner-app/supabase/ai-usage-rpc-fix.sql` çalıştırıldı (2026-07-18) — panel dolu, canlı doğrulandı.** Hata: "structure of query does not match function result type". Sebep: `RETURNS TABLE ... bigint` ama sorguda `sum(bigint)` → **numeric** dönüyor. 17.07'de fark edilmedi çünkü tablo BOŞTU (Postgres tipi satır dönerken denetler → 0 satırda hata yok). Fix: dört `sum`'a `::bigint`. Şema/imza değişmiyor, mobil etkilenmez.
- [ ] **Ders (yeni RPC'lerde):** `RETURNS TABLE`'lı RPC'yi boş tabloyla doğrulama — VERİ ile çalıştır. `sum(integer)`→bigint ama `sum(bigint)`→numeric.

### 🎫 DESTEK DEPARTMAN YÖNLENDİRME (2026-07-18) — plan: `docs/DESTEK-DEPARTMAN-PLAN.md`
> Mehmet kararı: **4 departman** (Teknik/Satış/Faturalandırma/Öneri) · öncelik müşteriye SORULMAZ
> (herkes "yüksek" seçer → alan bilgi taşımaz; departmandan türetiliyor, agent değiştirir).
- [x] **Adım 1-3 TAMAM + canlı doğrulandı:** `sql/destek/destek-departman.sql` çalıştırıldı (department kolonu
      `DEFAULT 'teknik'` → **mobil eski sürüm kırılmadı**; `staff_departments`; `staff_sees_department()`;
      yeni talep → ekip+admin bildirimi). Müşteri formunda kart seçimi, admin'de rozet + filtre.
- [x] **Adım 4 — RLS DARALTMASI ÇALIŞTIRILDI** (2026-07-19, `destek-departman-DOGRULAMA.sql` 13/13 ✅).
      ⚠️ **AMA DEPARTMAN AYRIMI HİÇ TEST EDİLMEDİ** — "agent yalnız kendi departmanını görüyor mu"
      sorusu açık. Test için agent-rolünde bir hesap gerek; `mgzrco@gmail.com` ekipten çıkarıldı,
      şu an tek personel admin (o her şeyi görür, ayrımı göstermez). İlk gerçek personelden ÖNCE
      `sql/destek/destek-departman-TEST.sql` ile doğrula.
      *(eski not: KOD HAZIR, ÇALIŞTIRILMADI)* `sql/destek/destek-departman-rls.sql`.
      4 politika (`tickets_select`/`tickets_update`/`messages_select`/`messages_insert`) →
      `is_support_agent() AND staff_sees_department(...)`. K3 (sender_type↔rol) korundu,
      `tickets_update`'e WITH CHECK eklendi (agent talebi başka departmana taşıyamasın).
      ⚠️ **FAIL-CLOSED:** departman ataması olmayan agent HİÇ talep göremez → yeni personelde atama ŞART.
      ⚠️ Test C admin rolünü geçici kaldırıyor → geri alma satırlarını atlama.
- [x] **Adım 5 — EKİBE E-POSTA TAMAM** (2026-07-19): `support-new-ticket-notify` deploy edildi,
      SQL çalıştırıldı, markalı mail canlı gönderilerek doğrulandı (`{"sent":true}`).
      *(eski not: KOD HAZIR, DEPLOY+SQL BEKLİYOR)* `sql/destek/destek-departman-bildirim.sql`
      + yeni edge `support-new-ticket-notify`. **SIRA: önce `supabase functions deploy
      support-new-ticket-notify --no-verify-jwt`, SONRA SQL.**
      ⚠️ Eski not ("`support-reply-notify` alıcıyı departmana göre seçsin") **YANLIŞTI** — o fonksiyon
      agent yanıtını MÜŞTERİYE yollar, alıcısı hep talep sahibi; seçilecek alıcı yok. Gerçek eksik:
      yeni talepte ekibe yalnız çan gidiyordu, e-posta gitmiyordu.
      ⚠️ Tetikleyici `support_tickets` DEĞİL `ticket_messages` (ilk müşteri mesajı) — createTicket
      önce ticket'ı sonra mesajı yazıyor, ticket INSERT'inde gövde henüz yok.
      Kapsam: yalnız İLK mesaj mail atar (takip yanıtları gürültü olmasın); istenirse `v_first` bloğu kalkar.
- [x] **Adım 6 — MOBİL TAMAM (2026-07-19, `paraner-app` `7685aa5`)** — `createTicket` artık departman
      + türetilmiş öncelik yazıyor, yeni talep ekranında web'le birebir 4 departman kartı (başlık+ipucu).
      İmza `(subject, category, body)` → **`(subject, body, department='teknik')`** (web ile aynı sıra).
      Eski 6 kategori çipi KALDIRILDI: yazdığı `category` hiçbir yerde okunmuyordu ve "web feedback
      ekranıyla hizalı" yorumu yanlıştı (o ekran yok). `category` ölü alan olarak tipte kaldı.
      **Canlı doğrulandı:** 4 departmanın dördü de müşteri JWT'siyle RLS'ten geçti, öncelikler doğru
      (teknik=normal · satis/faturalama=high · oneri=low). Test kayıtları+hesabı silindi.
      ⚠️ **KOD HAZIR, KULLANICIDA DEĞİL:** App Store sürümü çıkana kadar sahadaki mobil sürümler
      hâlâ departmansız talep açar → DB DEFAULT `'teknik'` devrede (kırılma yok, yanlış kuyruk var).
- [x] **/admin/ekip departman atama + davet akışı (2026-07-18)** — davette rol + departman seçilir;
      `agent` için departman ZORUNLU (fail-closed RLS yüzünden departmansız kişi hiçbir talep göremez,
      sessiz çıkmaz sokaktı). Listede departman rozeti + "Değiştir", departmansız destekçiye uyarı,
      "Davet bekliyor" rozeti + "Daveti yenile". `grantRole` da aynı kuralı uyguluyor.
      **Markalı davet maili** (`lib/staffInvite.ts`): `generateLink('invite')` + Resend.
      Şifre kurma sayfası davet-farkında: metin değişiyor, **e-posta ekranda görünüyor**,
      personel şifre kurunca **admin.paraner.com**'a gidiyor (eskiden app.paraner.com'a atıyordu — hataydı).
- [x] ~~`RESEND_API_KEY` Vercel'e eklenmeli~~ — **GEREKMEDİ**: davet maili edge function'a taşındı
      (`staff-invite-notify`), anahtar zaten orada. Vercel'e yeni env eklenmedi.
- [ ] **İleride:** talebe not/atama (`assignee_id` kolonu duruyor, kullanılmıyor) · ek dosya (`ticket-attachments` bucket).

### 🎫 DESTEK SİSTEMİ — Faz 0 ✅ TAMAMLANDI (2026-07-16, uçtan uca doğrulandı)
> Detay: `docs/DESTEK-SISTEMI.md` + `docs/DESTEK-SEMA-MOBIL.md` + `sql/destek/destek-faz0.sql`. Web+mobil (ortak Supabase,
> iki Claude mutabakatı). **Uçtan uca ÇALIŞIYOR:** agent yanıtı → çan bildirimi (realtime web+mobil) +
> e-posta (Resend, `merhaba@paraner.com`). Mehmet canlı doğruladı (web çanı yandı + mail geldi).
> ⚠️ E-posta Database Webhook UI ile DEĞİL (o "supabase_functions does not exist" verdi) → webhook'suz:
> `notify_on_agent_reply` trigger'ı `pg_net.http_post` ile support-reply-notify'ı çağırıyor, secret Vault'ta
> (`support_webhook_secret`) + Edge Function Secrets (`SUPPORT_WEBHOOK_SECRET`) — ikisi aynı değer.
- [x] **Test verisi temizlendi** (2026-07-20) — ZZTEST kaydı kalmadı.
- [x] **VERİTABANI SIFIRLANDI (2026-07-20, Mehmet talebi):** admin@paraner.com HARİÇ 8 hesabın
      tamamı kalıcı silindi (hepsi Mehmet'e ait test adresleriydi). Kalan: 1 kullanıcı · 1 profil ·
      3 talep · 2 işlem. Yetim kayıt taraması temiz (profiles/tickets/messages/devices/notifications/
      roles/departments + transactions/invoices/bank_accounts/savings_assets/products/employees).
      ⚠️ Bu iş sırasında yukarıdaki **"Kalıcı sil" FK hatası** keşfedildi.
      ℹ️ Yan tespit: `contacts` gerçekten **`profile_id`** kolonunu kullanıyor (web kodu doğruymuş —
      eski açık soru kapandı; tablo şu an boş).
- [ ] **Gerçek destek ekibi hesapları** `user_roles`'e (şu an sadece admin@paraner.com agent).
- [ ] **Faz 1:** mobil push — mobilde `withNoPushEntitlement` yüzünden remote push KAPALI, **ücretli Apple hesabı + APNs** ister (Mehmet kararı).
- [ ] **Faz 2 (opsiyonel):** kullanıcı yeni mesajında agent'a bildirim · agent atama/öncelik/filtre · ek dosya yükleme (ticket-attachments bucket) · çanda "tümünü okundu".

### 🔴 ADMIN "KALICI SİL" KIRIK — destek yazmış müşteri SİLİNEMİYOR (2026-07-20 keşfi)
> Veritabanı temizliği sırasında ortaya çıktı: `auth.users` silme isteği **HTTP 500** veriyor.
> `{"code":"23503", "constraint":"ticket_messages_sender_id_fkey"}` — `ticket_messages.sender_id
> → auth.users` FK'sinde **ON DELETE davranışı YOK**. 8 hesabın 3'ü ilk denemede bu yüzden silinemedi.
> ⚠️ Denetim O8'de "FK CASCADE" düzeltilmişti ama o `ticket_messages.ticket_id → support_tickets`
> içindi; **`sender_id → auth.users` ATLANMIŞ.**
- [x] 🔴 **Etkisi ürün hatası:** `/admin/musteriler` → "Kalıcı sil", destek talebi açmış HERHANGİ bir
      müşteride patlar. Bugün 3/8 hesapta patladı → gerçek müşteride de patlayacak.
      Geçici çare (bugün kullanıldı): önce `support_tickets`'ı sil (mesajlar CASCADE ile gider), sonra hesabı sil.
- [x] **KARAR VERİLDİ (Mehmet, 2026-07-20): seçenek (b) `ON DELETE SET NULL`** — yazışma geçmişi
      kalır, "silinmiş kullanıcı" olarak görünür (destek yazışması = denetim/anlaşmazlık kaydı).
      **KOD + SQL HAZIR, ÇALIŞTIRILMADI ↓**
- [x] ✅ **ÇALIŞTIRILDI (2026-07-20): `sql/destek/destek-hesap-silme-set-null.sql`** —
      `destek-hesap-silme-DOGRULAMA.sql` **6/6 ✅**. Genel FK denetimi: 16 satır, **🔴 YOK**
      (8 Supabase `auth.*` + 5 bizim tablo CASCADE = doğru; 3 destek FK'si SET NULL).
      Sahipsiz kayıt sayacı 0/0 — beklenen, henüz kimse silinmedi.
      ⚠️ Doğrulama betiğinde ilk denemede 42601 aldık: kolon takma adı `notnull` idi,
      **NOTNULL Postgres'te ayrılmış kelime** (`x NOTNULL` = `x IS NOT NULL`) → `zorunlu` yapıldı.
      ⚠️ **TEK FK YETMİYOR — asıl tuzak buydu:** `sender_id`'yi SET NULL yapmak tek başına hiçbir
      şeyi korumaz, çünkü `support_tickets.user_id` **CASCADE**'di (faz0.sql:11) → kullanıcı silinince
      talep gider, talep gidince mesajlar CASCADE ile peşinden giderdi. Hata kaybolur, VERİ DE kaybolurdu.
      Migration 3 FK'yi birden çeviriyor: `ticket_messages.sender_id` · `support_tickets.user_id` ·
      `support_tickets.assignee_id` (**uyuyan kopya**: atama özelliği açılınca personel silme aynı 23503'ü verirdi).
- [x] ✅ **EDGE DEPLOY TAMAM (2026-07-20):** `support-reply-notify` (v3) +
      `support-new-ticket-notify` (v2) — ikisi de ACTIVE, NULL guard'ları canlıda.
      🔴 **Bu sırada gizli bir tuzağa düştüm ve düzelttim:** `support-reply-notify`'ın
      `config.toml`'da KAYDI YOKTU → `verify_jwt=false` yalnız `--no-verify-jwt` BAYRAĞIYLA
      tutuluyordu. Bayrağı vermeden deploy edince ayar sıfırlanıyor; trigger `Authorization`
      göndermediği için gateway 401 verir ve **agent yanıtı e-postaları sessizce durur**
      (talep akışı bozulmaz → kimse fark etmez). Artık `config.toml`'da kayıtlı, bayrağa bağlı değil.
      **Canlı doğrulandı:** sahte secret'la POST → dönen `Unauthorized` gateway'in değil
      FONKSİYONUN kendi cevabı (`index.ts:74`) = JWT'siz istek geçiyor ✔ (kontrol grubu:
      config'te zaten false olan `support-new-ticket-notify` birebir aynı cevabı veriyor).
      ⚠️ **Ders:** edge ayarı bayrakta değil `config.toml`'da yaşamalı — yoksa bir sonraki
      deploy sessizce geri alır. Yeni fonksiyon eklerken config kaydını da yaz.
- [x] **Kod tarafı tamam (iki repo, tsc + build temiz):** web `Ticket.user_id`/`TicketMessage.sender_id`
      → `string | null`; `/admin/destek`, `/admin` panosu, `lib/adminLive.ts` null-guard'landı;
      yazışma ekranında "Silinmiş müşteri" / "Silinmiş kullanıcı" etiketi. Mobil UI **değişmedi**
      (balon hizalaması `sender_type` üzerinden yürüyor, `sender_id` okumuyor).
      ℹ️ **Güvenlik:** NOT NULL kalkması yeni yazma açığı AÇMAZ — RLS `user_id = auth.uid()` /
      `sender_id = auth.uid()` NULL'da true dönmez (fail-closed), NULL'a yalnız FK'nin kendisi yazar.
- [ ] ❓ **AÇIK KARAR (Mehmet):** silinen kişinin **e-posta snapshot'ı** talepte tutulsun mu?
      Şu an kimlik TAMAMEN kopuyor (KVKK/GDPR silme hakkıyla uyumlu taraf). Anlaşmazlıkta
      "kimdi bu" sorusunun cevabı kalmaz. Sonradan kolon eklemek kolay, sızmış veriyi geri almak zor
      → bilinçli olarak EKLENMEDİ. Detay: `docs/HESAP-SILME-VERI-SAKLAMA.md`.
- [x] ~~Silme akışı ham Postgres hatasını gösteriyor~~ — **YANLIŞ TESPİTTİ (2026-07-20 düzeltmesi).**
      `lib/adminActions.ts:326` hatayı yakalıyor, `user_delete_failed` telafi kaydı yazıyor (O10) ve
      "Silinemedi: …" döndürüyor. Akış sağlam, yalnız mesaj gövdesi teknik. FK `SET NULL` yapılınca
      hata zaten yok olacağı için metni ŞİMDİ düzeltmek boşa iş — karar sonrası bak.
      Aynı şekilde `/admin/destek` sahibi bulunamayan talebi zaten *"müşteri kaydı bulunamadı
      (silinmiş olabilir)"* diye çiziyor (`DestekListClient.tsx:191`) — orada da yapılacak iş yok.
> 📄 **Tüm analiz + sektör/hukuk bulguları: `docs/HESAP-SILME-VERI-SAKLAMA.md`** (araştırma YARIM —
> 106 doğrulama ajanının 68'i limite takıldı; Türk vergi mevzuatı saklama süreleri HİÇ araştırılmadı).
> **Mehmet'in kararı bekleniyor:** kimlik tamamen mi kopsun, yoksa e-posta snapshot'ı da tutulsun mu?

### 🔔 DESTEK: CANLILIK + EK DOSYA + SİLME DENETİMİ (2026-07-20) — plan: `docs/DESTEK-CANLI-EK-DENETIM-PLAN.md`
> Mehmet canlı kullanımda 4 eksik buldu. Kod TAMAM (tsc + build temiz), **2 SQL BEKLİYOR**.
- [x] **Kendi mesajını görememe ÇÖZÜLDÜ** — `sendMessage` artık eklenen satırı döndürüyor,
      `ThreadClient` iyimser ekliyor. Yanında iki gizli hata daha çıktı: (1) `useState(initialMessages)`
      prop değişimini yok sayıyordu → `router.refresh()` ekrana HİÇBİR ŞEY yansıtmıyordu, yalnız F5
      çalışıyordu; (2) realtime abonesinde `setAuth` await EDİLMİYORDU → kanal token'sız açılırsa
      RLS hiçbir satırı geçirmez ve olay **hata vermeden** düşer. Doğru sıra `NotificationBell`'de
      zaten vardı, destek ondan sapmıştı. **Mobil bu hataya hiç düşmemiş** (zaten iyimser ekliyor).
- [x] **Silme sebebi + not** — `SilModal` (sebep seçilmeden buton kapalı, "Diğer"de not zorunlu).
      Sebep **sunucuda da** doğrulanıyor (`lib/deleteReasons.ts` tek kaynak) — denetim kaydı kanıt
      olarak okunacak, istemciden uydurma değer yazılamamalı. **Şema değişikliği GEREKMEDİ**:
      `admin_audit_log.detail` zaten jsonb. `/admin/denetim` ekranı da ZATEN VARMIŞ (eski
      "audit log'u panelde göster" maddesi bayattı, kapatıldı) — detail artık okunur biçimde basılıyor.
- [x] **"Bu talebi kim, neden sildi"** — talep ↔ silinen kişi arasında join anahtarı KALMAMIŞTI
      (user_id SET NULL). Çözüm: `deleteUserAccount` silmeden ÖNCE o kişinin talep id'lerini
      `detail.ticket_ids`'e yazıyor, `/admin/destek` oradan eşleştirip "hesap silindi · kim · sebep"
      gösteriyor. ⚠️ Kişisel veri EKLEMİYOR (e-posta snapshot'ı değil) → KVKK duruşu korundu.
      ⚠️ Yalnız **admin** görür (audit RLS admin-only). ⚠️ 20.07'den ÖNCEKİ silmelerde çalışmaz.
- [x] **Admin panelinde bildirim çanı** — hiç yoktu; `NotificationBell` `components/`e taşındı,
      iki kabuk da kullanıyor (bildirimin kendi `link` alanına gidiyor, kabuk-farkında olması gerekmedi).
- [x] **Ek dosya (web)** — talep açarken + sohbette; `ticket_messages.attachment_url` ÖLÜ ALANDI,
      artık yazılıyor+render ediliyor. Bucket **private** → `getPublicUrl` yok, her görüntülemede
      `createSignedUrl`. ⚠️ Kolona TAM URL değil **YOL** yazılıyor (imzalı link süreli; URL saklansa
      kayıt dakikalar içinde ölü bağlantıya dönerdi). Ek silme/güncelleme policy'si BİLİNÇLİ YOK —
      destek eki yazışma kaydı, sonradan değiştirilememeli.
- [x] ✅ **ÇALIŞTIRILDI (2 SQL, 2026-07-20):** `sql/destek/destek-talep-realtime.sql` (yeni talep anlık
      düşsün — `support_tickets` yayında DEĞİLDİ, kod tek başına yetmezdi) · `sql/destek/destek-ek-dosya.sql`
      (private bucket + policy). İkisi de kendi doğrulama sorgusunu içeriyor, ikisi de ✅ döndü.
      *(2026-07-21'de fark edildi: bu madde "⏳ çalıştırılacak" olarak kalmış — bayattı.)*
- [ ] **Mobil ek dosya paritesi** — web önce bitti (Mehmet kararı). Mobilde seçici + sıkıştırma
      (`lib/imagePicker.ts`, `attachment-picker.tsx`) ZATEN HAZIR, yalnız bağlanacak + balonda render.
      ⚠️ Mobil de YOL→`createSignedUrl` kuralına uymalı. ⚠️ `attachmentStore` profil geçişinde
      temizlenmiyor (`paraner-app/diğer/docs/AUDIT_2026-04-24.md:52-54`) — destek formunda miras alma.
- [ ] **`LiveRefresh` /admin/destek için hâlâ 0** (periyodik yenileme kapalı, disk IO kararı).
      Artık gerek yok: `TicketsLive` olay-tabanlı tazeliyor (3 sn boğazlamalı). Bilinçli bırakıldı.

### ⚡ 2026-07-19 OTURUMUNDAN KALANLAR
> **Yeni sohbete başlarken önce buraya bak.** Sıra önerisi: 1 → 2 → 3.
- [x] **1) ✅ DEPARTMAN AYRIMI DOĞRULANDI (2026-07-19) — 7/7 geçti.** Geçici agent hesabı açılıp
      RLS **doğrudan JWT ile** sorgulandı (tarayıcı yerine; panel zaten bu sorgunun sarmalayıcısı):
      personel olmayan 0 · departmansız agent 0 (**fail-closed teyit**) · yalnız `oneri` verilince
      6 talepten SADECE 1'i görüyor · başka departmana taşıma 403 · kendi talebinin durumunu
      değiştirme 200 · göremediği talebin mesajları 0 ve yazma 403 · kendi departmanına yanıt 201
      (**pozitif kontrol** — fazla daraltılmamış) · `sender_type='user'` taklidi 403 (**K3 korunuyor**).
      Ortam başlangıç hâline geri alındı (hesap+mesaj silindi, `cdscsc` durumu `open`'a döndürüldü).
      ⚠️ **Ders:** `ticket_messages` insert'i `sender_id = auth.uid()` ŞART koşuyor — testte
      göndermeyi unutunca 403 alıp "politika fazla dar" diye yanlış alarm verecektim.
      ⚠️ **Kalan (RLS DEĞİL, kod guard'ı):** agent `/admin/musteriler` görmemeli — `requireAdminPage`
      kodda doğru duruyor ama sorguyla test edilemez, TARAYICI teyidi bekliyor.
- [x] **2) ✅ TEST CİHAZI KAYITLARI TEMİZLENDİ (2026-07-19)** — 17 → **2**. Silinen 15 kayıt:
      hepsi 19.07 03:23–05:07 arasında açılmış, neredeyse tümü **tek seferlik** (ilk=son görülme)
      → headless test artığı. Mehmet "yeni cihaz" maili ALMADI (kendi tarayıcısı korundu).
      **Kalan 2:** (a) 14.07'de açılıp 19.07'ye kadar kullanılan Bodrum kaydı = Mehmet'in güncel
      tarayıcısı · (b) 14.07–17.07 arası kullanılan **Yalıkavak** kaydı — tek seferlik DEĞİL,
      gerçek bir tarayıcı gibi duruyor, o yüzden DOKUNULMADI. **Mehmet'e sorulacak:** bu senin
      başka bir cihazın/tarayıcın mı, yoksa o da mı gitsin?
      *(Sebep düzeltildi: artık kalıcı profil + oturum tazeleme kullanılıyor, yeni çöp kayıt yok.)*
- [x] **3) ✅ MOBİL departman seçimi TAMAM** (2026-07-19) — detay yukarıda "Adım 6".
      ⚠️ Etkisi App Store sürümüyle sahaya çıkar.
- [x] ✅ **Departman ayrımı TARAYICIDA da doğrulandı (2026-07-22)** — geçici agent hesabıyla:
      5 talepten yalnız kendi departmanındaki 1'ini gördü. Daha önce yalnız doğrudan JWT
      sorgusuyla test edilmişti. Detay: yukarıdaki "TALEP SİLME" bloğu · `sql/destek/agent-yetki-TEST.sql`.
- [x] **Menü tıklamasında "hiç tepki yok" ÇÖZÜLDÜ (2026-07-19, `df28837`)** — sebep sunucu değildi:
      `loading.tsx` ekranı PREFETCH YÜKÜYLE geliyor (Next 16 docs `linking-and-navigating.md:231`),
      sol menü prefetch'i mount'ta BİR KEZ çalışıyordu, `staleTimes.dynamic: 30` onu 30 sn'de
      bayatlatıyordu → sekme arkada bekleyince gösterilecek hiçbir şey kalmıyordu. Eklendi:
      `NavPending` (useLinkStatus, prefetch'ten bağımsız, 100 ms gecikmeli) + `useRewarmPrefetch`
      (sekme öne gelince + fare menüye girince, 15 sn boğazlamalı — **periyodik DEĞİL**, disk IO).
      Admin + müşteri panelinin İKİSİNE de uygulandı. ⚠️ Prefetch DEV'de kapalı → **prod'da doğrula**.
- [ ] ⚡ **`listPeople()` ölçek borcu (yeni, 2026-07-19)** — `/admin/destek` ≤200 talebi etiketlemek için
      `auth.users`'ı SERİ sayfalayıp `profiles` + `user_devices` TAM TABLOSUNU (10.000 limit) çekiyor,
      **önbellek yok**. Bugün acıtmıyor (kullanıcı az; DB ölçüldü: sorgular 0.35-0.5 sn, throttle YOK) ama
      birkaç bin kullanıcıda sayfayı kilitler. Çözüm: taleplerden gelen `user_id` setiyle `.in(...)` daraltma.
      ⚠️ Daraltma sorguları SERİLEŞTİRİR (önce talepler, sonra kişiler) → küçük ölçekte net kayıp; **ölçek gelince** yapılacak.
- [ ] 🔴 **DONMA DEVAM EDİYOR (Mehmet, 2026-07-19 akşam):** "sekmeden çıkıp geri girince, Genel
      Bakış'tayken Destek'e basınca donuyor." ⚠️ **Düzeltmeler o an CANLIDA DEĞİLDİ** (5 commit
      push edilmemişti) → önce deploy edip TEKRAR bak; hâlâ sürüyorsa sebep ısıtma/gösterge değil,
      aşağıdaki soğuk lambda + `listPeople` maddeleri.
- [ ] **8-9 sn'nin kalanı ÖLÇÜLMEDİ** — DB temiz çıktığına göre kalan şüpheli **Vercel Hobby soğuk lambda**
      (aşağıda ayrı madde). Doğrulama: sekmeyi uzun süre arkada bırak, DevTools Network açıkken tıkla,
      RSC isteğinin **TTFB**'sine bak. Soğuk başlangıçsa TTFB yüksek, sunucu render'ı kısa olur.
- [ ] **ESLint yapılandırması yok** — `npm run lint` çalışmıyor, kod denetimi tsc + build'e kalmış.
      Kullanılmayan değişken / eksik hook bağımlılığı / erişilebilirlik yakalanmıyor.
- [ ] **Genel Bakış `transactions` limitsiz** (aşağıda da var) — panelin en yavaş sayfası (614 ms).
- [ ] **Favoriler eşiği:** favori sayısı 8-10'u geçerse daraltılmış ray uzar → o zaman
      "Favoriler" düğmesi + **TIKLAMAYLA** açılan liste değerlendirilir (hover DEĞİL; sebep
      DAILY_LOG 19.07). Şu an ikon olarak rayda duruyorlar, sorun yok.
- [ ] **Sayfa-özel iskeletler**: araştırma sonrası KARAR = şimdilik YAPMA. Bekleme nadir ve kısa
      (sıcakken 200-400 ms); iskeletin kazancı uzun/sık beklemede. Bir sayfa düzenli 1 sn'yi
      geçerse o zaman o sayfaya özel iskelet yazılır. (NN/G + LogRocket kaynakları DAILY_LOG'da.)

### 🐞 2026-07-14'te ortaya çıkan, HENÜZ YAPILMADI
- [ ] **Yanlış şifreyle girişte kullanıcı hata görmüyor** — canlı denemede giriş reddedildi ama ekranda kalıcı bir uyarı yok (toast birkaç saniyede kayboluyor). `/giris` şifre akışında inline hata gösterilmeli.
- [ ] **Apple "e-postamı gizle" (`@privaterelay.appleid.com`) + şifreyle giriş** — bu kullanıcılar giriş formuna hangi adresi yazacak? Web + mobil ortak soru; akış netleşmeli.
- [ ] **Sayfa-özel iskeletler** — tek `app/panel/loading.tsx` (3 KPI + 6 satır) 29 sayfada gösteriliyor; Stok/Ayarlar gibi benzemeyen sayfalarda "yanlış iskelet" hissi veriyor. (Prefetch sayesinde artık nadir görünüyor → düşük öncelik.)
- [ ] **`/panel/islemler` ikon yükü** — `lib/categoryIcons.tsx` 86 lucide ikonunu barrel import ediyor → o rotaya ~15 KB gzip (rota-özel yükün 2/3'ü). Tembel/parça import'a çevrilebilir.
- [ ] **Genel Bakış `transactions` limitsiz** — 6 ayın tüm işlemleri çekiliyor (limit yok). Yoğun hesapta payload şişer; özet için RPC gerekir → **DB şeması = önce sor**.
- [ ] **Vercel Hobby soğuk başlangıç** — prefetch maskeliyor ama ilk istek hâlâ soğuk. Pro + Fluid Compute değerlendirilebilir (ücret kararı Mehmet'te).

### Devam eden
- [ ] **Buton yenileme Adım 3** — nötr `btn-ghost` ikincil butonlar (duzenli-fatura "İlerlet", stok/veresiye "Hareket", duzenli-odemeler "Onayla", gelir-gider-raporu "CSV İndir") gözden geçirilecek. (Adım 1 AddButton + Adım 2 SaveButton bitti, 07-18'de canlı onaylandı.) Kalan teal `.btn-primary`'ler marka rengi netleşince toplu ele alınır.
- [ ] **Google'da yeni title** — Search Console → URL Denetimi → "Dizine eklenmeyi iste" (`/`, `/destek`, `/isletme`, `/bireysel`). *(Mehmet'in kişisel Google hesabındaki mülk.)*
- [ ] **Genel mobil tarama:** ana sayfa + auth ekranlarında telefonda taşma/bozulma var mı, tek tek bak. (Auth + rozetler 06-29'da elden geçti; ana sayfa/diğer bölümler kaldı. 07-02 headless taramada bulunan 320px hero taşması + iOS beam-input beyaz kaması düzeltildi ve onaylandı.)

## Rakip denetiminden çıkan (2026-07-13, `docs/RAKIP-defteran.md`)

### Web / pazarlama (sıradaki faz)
- [ ] **Panel tasarım turu — Genel Bakış PİLOT'u onaylandıysa diğer 33 modüle yay.** Sıra: İşlemler → Hesaplar → Faturalar (en yoğun sayfalar).
- [ ] **Mega-menüdeki alt sayfalar** (`/isletme/faturalar`, `/bireysel/butce` …). Şu an linkler segment sayfası içi `#çapa`lara gidiyor; sayfa açılınca `navData.ts`'te href değiştirmek yeterli. **Google sitelinks'i bunlar doğurur.**
- [ ] **Ana sayfayı iki segmente çatalla** (Mehmet karar vermedi): hero altına "İşletmem var" / "Bireysel kullanacağım" iki kart → `/isletme` ve `/bireysel`.
- [ ] **`llms.txt` + `llms-full.txt`** — Defteran yapmış, robots'ta ClaudeBot/GPTBot'u davet ediyor. Bizde yok. Ucuz AEO kazancı.
- [ ] **Ücretsiz hesaplayıcılar** — Defteran'ın GİRMEDİĞİ nişler: gecikme faizi/vade farkı, serbest meslek makbuzu + tevkifat, şahıs şirketi vergi yükü simülatörü, ücretsiz fatura oluşturucu, kâr marjı. (Onların KDV/maaş hesaplayıcıları hesaplama.net/EY'ye karşı kaybediyor.)
- [ ] **Sosyal kanıt** — sitede tek sayı bile yok. App Store puanı varsa hero'ya.

### Ürün (Defteran'da var, bizde yok)
- [ ] **Fatura kalem editörü** — ⚠️ EN KRİTİK TEKNİK BORÇ. e-Fatura + teklif→fatura + stok düşümü ÜÇÜ birden buna kilitli (`FaturalarClient.tsx:216` kendi notumuz).
- [ ] **Excel/CSV içe aktarım** (fatura + cari) — bizde sadece export var. Rakipten göç silahı, düşük efor/yüksek dönüşüm.
- [ ] **Mutabakatta güvenli paylaşım linki** — bizim mutabakat tamamen içeri dönük (bakiyeler elle giriliyor, "Gönderildi" bir dropdown; gönderecek bir şey yok). Token'lı public route + onay = küçük iş, güçlü anlatı.
- [ ] **Teklif → Fatura tek-tık dönüşümü** — `invoiced` durumu var ama dönüştüren kod yok.
- [ ] **Fatura → Stok otomatik hareketi** — alış artırmalı, satış azaltmalı; şu an stok manuel.
- [ ] **PDF rapor** — menüde `href: null`. KOBİ muhasebecisine CSV değil PDF yolluyor.
- [ ] **Puantaj** — çalışan/maaş/izin var, devam-mesai kaydı yok.
- [ ] **e-Fatura/GİB** — zaten "Sonraki Faz"da (aşağıda).

### Fiyatlandırma notu
- [ ] Defteran ₺750/ay **tek paket**, kullanıcı limiti belirsiz, **e-fatura kontörü hakkında TAM SESSİZ** ("kontör" kelimesi fiyat sayfasında 0 kez geçiyor) → *"gizli kontör yok"* bizim saldırı yüzeyimiz.

## İLERİDE
- [ ] **Toast sistemini iyileştir:** Sonner-tarzı çalışıyor; Mehmet daha iyi görünüm/UX araştıracak. Temel sistem oturduktan sonra.
- [x] **Mobil auth (giriş/kayıt) KOYU tema:** 06-29'da yapıldı — mobil (≤1024) artık SİYAH/koyu form (base tema), masaüstü beyaz form korundu. iOS güvenceleri (svh, 16px input) uygulandı. Detay: `DAILY_LOG.md` 06-29. (Cila/ince ayar gerekirse adım adım + onay.)
- [ ] **Hesap silme v2:** admin/dashboard silmede FARKLI mail (kullanıcı kendi silince "Görüşmek üzere" mevcut; biz silersek ayrı bildirim). Trigger'a silme kaynağı ayrımı (user-initiated bayrağı vs dashboard).

## Canlı göz kontrolü (kod tarafı doğrulandı, cihaz teyidi bekliyor)

**Cüzdanım**
- [ ] Canlıda Truncgil fiyatları geliyor mu? Toplam Değer / K-Z / Bugün dolu mu?
- [ ] Web'den eklenen varlık mobilde görünüyor mu (ortak `savings_assets`)? Tersi?
- [ ] İkinci alış → ağırlıklı ortalama maliyet doğru mu? Satış kısmi (maliyet korunur)/tam (varlık silinir)?
- [ ] `savings_asset_movements` mobil ile uyumlu mu? Altın görselleri + varlık türü seçici düzgün mü? İşletme profilinde mantıklı mı?

**Dashboard + kartlar + kategoriler**
- [ ] KPI'lar (Bakiye/Gelir/Gider/Net) doğru mu? Trend grafiği hover tooltip + donut + son işlemler?
- [ ] Hesap ekleme: kart tema seçici + canlı önizleme + para birimine göre IBAN/routing? Kart görselleri her boyutta düzgün mü?
- [ ] Web'de eklenen hesap mobilde doğru mu (card_theme/routing_no/account_no)? Tersi?
- [ ] Kategori ikonları mobil ile aynı mı? Özel kategori (ikon+renk) → işlem/liste/donut doğru mu?
- [ ] İşlem detayı açılınca liste sola kayıyor mu (drawer'ın altına girmiyor)?

**Sidebar**
- [ ] Çoklu para birimi çipi: birden fazla para birimli hesapta çıkıyor mu, filtre doğru süzüyor mu? Tek para birimlide gizli mi?

## Bekleyen

### App Store gönderimi (web destek)
- [ ] **Privacy Nutrition Labels** — App Store Connect anketi (panel işi, kod değil).
- [x] **Reviewer demo hesabı** — `admin@paraner.com` (2026-07-14, işletme profili hazır; şifre Mehmet'te — **repo public, şifre buraya yazılmaz**). Aynı hesap canlı ölçüm/doğrulama için de kullanılıyor. App Store Connect'e girilecek.
- [ ] Mobil gizlilik metnini değiştirirse `/gizlilik` ile eşitle.

### Auth / hesap
- [x] **Şifre Belirle / Şifre Değiştir (web, 2026-07-14):** Ayarlar → Hesap & Güvenlik. Mobil `change-password.tsx` paritesi: `user_metadata.has_password` ortak bayrağı (provider'a BAKMA — e-posta+OTP kullanıcısının da şifresi yok), belirlemede mevcut şifre sorulmaz, değiştirmede önce `signInWithPassword` ile doğrula + sonra diğer cihazlardan çıkış, şifre gücü göstergesi, Supabase hata metinleri TR'ye eşlendi.
- [ ] **Apple ile giriş yapanlar için de aynı şifre-oluşturma akışı (Mehmet'in notu):** Web'de akış zaten provider-bağımsız (bayrağa bakıyor) → Apple kullanıcısı da "Şifre Belirle" görüyor. **Doğrulanacak:** Apple gizli-mail (`@privaterelay.appleid.com`) ile kayıt olanlarda şifreyle giriş çalışıyor mu (o adrese mail gitmiyor; şifre girişi mail gerektirmez ama e-posta alanı relay adresidir → giriş formunda hangi adresi yazacak?). Mobil tarafta da aynı soru geçerli.
- [ ] Web kayıt akışı: ek onboarding adımları gözden geçirilecek (OTP + OnboardingModal var).
- [ ] İşletme hesabı eklemede **Stripe ödeme/trial kapısı** (şimdilik direkt açılıyor).

### İşletme paneli
- [ ] Her sayfanın tek tek **tasarım/UX cilası** (sıradaki faz).
- [ ] Dış-entegrasyon "Yakında": Fiş Tara (OCR), Döviz & Altın (API), PDF Rapor, SGK, e-Defter, Muhasebeci.

### Tasarım — opsiyonel cila
- [ ] Sidebar aç/kapa fade; native `confirm()` yerine özel onay diyaloğu + başarı toast; gerçek mobil menü (drawer).
- [ ] LineChart'a Shopify gibi kesik "önceki dönem" karşılaştırma çizgisi.

### Denetimden çıkan — karar/mobil-koordine bekleyen (2026-07-01)
- [ ] **Maaş ödemesi & düzenli-ödeme "Ödendi" → `transactions` oluşturmuyor** → Genel Bakış KPI + Bütçe "harcanan" bu çıkışları görmüyor. Mobil aynı işi transaction yazarak mı yapıyor? (Çift-kayıt olmasın → mobil parite teyidi sonrası eklenmeli.)
- [ ] **`contacts` `profile_id` kolonu mu?** (Web kodu tutarlı `profile_id` kullanıyor, muhtemelen doğru; diğer modüller `user_id`. Mobil şemasından teyit et.)
- [ ] **Defense-in-depth:** update/delete sorgularına `user_id`/`profile_id` filtresi (~11 modül). RLS `user_profile_ids()` zaten gate ediyor; istenirse eklenir.
- [ ] **Budget "harcanan" kategori eşleşmesi:** `transactions.category` gerçekten kategori-id mi? Değilse bütçeler 0 harcanan gösterir (muhtemelen id, çalışıyor — veri teyidi).
- [ ] **Panel server-side auth guard:** şu an yok (proxy host-bazlı + RLS koruyor). Preview/IP host'larında boş shell render olur (veri sızmaz). İstenirse layout'a getUser guard (perf: +1 sorgu).

### Denetimden çıkan — 2026-07-02 (baştan sona güvenlik+parite denetimi, 18 kalem düzeltildi → DAILY_LOG)
- [x] Güvenlik header'ları, CSV formül enjeksiyonu, çift-submit kilidi (22 handler), bütçe currency, profil-değiştirme kilitlenmesi, collection_in bakiye, düzenli fatura çift-üretim, fatura paritesi (numara/transactions/kalem/durum/due_date), KDV dönem sınırı, para birimi 6→30, findCategory sistem etiketleri, aktif profil is_primary fallback.
- [ ] **Mobil tarafı (koordine gerek):** mobil KDV raporu tüm para birimlerini topluyor (web düzeltildi → mobil de currency filtrelemeli); ai-chat client-kontrollü systemPrompt server'da sabitlensin; mobil token AsyncStorage şifresiz → expo-secure-store (GUVENLIK.md #16); aktif profil tam paritesi cihaz-yerel AsyncStorage yerine ortak DB alanı ister.

### 📱 Mobil Claude'a iletilecek
- [ ] **Faturalar web'de tek "akıllı hub" oldu (2026-07-01):** sol menüde tek "Faturalar" öğesi; içeride Tür sekmeleri (Tümü/Satış/Alış) + durum çipleri (Taslak/Gönderildi/Vadesi geçti/Ödendi, sayaçlı) + arama + tarih aralığı + CSV + satıra tıkla detay çekmecesi ("Ödendi işaretle"/Sil) + oluşturmada "Taslak" & alışta "Tedarikçi". Mobil menü paritesi ayrıştı → mobil de aynı tek-ekran hub'a getirilebilir. GÜNCELLEME 07-02: web artık gerçek `due_date` kolonunu okuyup yazıyor (eski "kolon yok" notu YANLIŞMIŞ); web faturaları da `transactions`'a (invoice_id ile) senkronluyor + atomik RPC numara (`PREFIX-000006`) + tek özet `invoice_items` + title yazıyor → mobil ile parite.
- [ ] Faturalar: `invoices-list` ekranı `?type=`'a göre başlık/filtre (2 ayrı ekran hissi olmasın).
- [ ] `businessMenu.ts`: "Çalışan Listesi" + "Harcama Kayıtları" ikisi de `/employee-expenses` → ayrıştır.
- [ ] **Özel kategoriler cihaz-yerel** (mobil AsyncStorage, web localStorage) → cihazlar arası senkron OLMUYOR. İstenirse ortak DB tablosuna (şema için sor).

## Sonraki Faz (lansman sonrası / v2 — şimdi DEĞİL)
> Önce: arayüzler + Stripe ödeme + app/web temel işler.
- [ ] **E-Fatura / GİB entegrasyonu** — entegratör API (öneri: **Nilvera**, REST/OAuth2). Fatura → UBL-TR XML + mali mühür → GİB. e-Fatura + e-Arşiv. Gerekli: entegratör anlaşması + müşteri mali mührü + kontör. `faturalar/` taslak→gönder akışına bağlanacak. → işletme planı ~699 ₺/ay olabilir.
- [ ] **SEO / AEO (AI görünürlüğü)** — "en iyi finans/gelir-gider uygulaması" aramaları + ChatGPT/AI önerilerinde Paraner. İçerik + schema + landing (ayrı plan).

## Notlar
- DB şemasına dokunma — mobil aynı şemayı kullanıyor; yeni kolon/tablo gerekiyorsa önce sor.
- Tüm yeni modüller: aktif profil (`is_active`) + `user_id = profil id` filtre, ₺/tarih `lib/format`, kategori `lib/categories`.
