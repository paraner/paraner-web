# GÖREVLER — paraner-web

> Sadece açık görevler. Tamamlananlar için `DAILY_LOG.md` + git geçmişi.

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

### 🛠️ ADMIN / İÇ EKİP PANELİ — kendi adresinde (admin.paraner.com), 1 adım bekliyor
> Plan: `ADMIN-PANEL.md`. Mehmet: kurucu+çalışanlar için müşteri yönetim paneli (üyeleri tür/abonelik
> analiz + destek). Aynı repo içinde `/admin` route (Next code-split → müşteri bundle'ını şişirmez).
> Kuruldu: rol guard (`lib/adminGuard`), service_role client (`lib/supabase/admin`, server-only),
> layout+sidebar (Müşteriler/Ekip admin-only), Dashboard (metrik), Müşteriler (liste+filtre), Destek
> (ticket listesi), Ekip (yakında).
- [x] **service_role key** — `.env.local` + Vercel Production ✓ (anahtar canlı doğrulandı: auth admin API 200). ⚠️ Preview'e EKLENMEDİ (Vercel ortam dropdown'ı Production sayfasından kilitli; gerekirse Environments → Preview → ayrıca ekle).
- [x] **admin@paraner.com admin yapıldı** (2026-07-17, service_role ile `user_roles`'e insert; `agent` satırı da duruyor, kod admin>agent okuyor).
- [x] **`admin.paraner.com` host bağlama (kod)** — 2026-07-17 `b21300c`: proxy `isAdmin`/`isPrivate`, kök→`/admin`, giriş admin host'unda, `/kayit` kapalı, `admin.*/panel`→`app.*`; AuthForm.goPanel + LogoutButton admin-farkında.
- [ ] **Mehmet: Vercel → Domains → `admin.paraner.com` ekle** (DNS). Yapılmadan adres açılmaz — kod hazır.
- [x] **İç ekip giriş ekranı** (`3f01f6c`) — admin.paraner.com/giris: e-posta+şifre, kayıt/sosyal YOK.
- [x] **Müşteri detay + aksiyonlar + ekip yönetimi** (`62a10ab`, canlı doğrulandı): kişi bazlı liste (e-posta ile arama), detay (profiller + işlem/fatura/hesap + son hareket), şifre sıfırlama maili · premium/free · askıya al (Supabase ban) · kalıcı sil, ekip davet/rol ver-al.
- [x] **`admin-audit-log.sql` çalıştırıldı** (2026-07-17) — yazma + gizlilik (anon 0 satır) canlı doğrulandı.
- [x] **Müşteri listesi yenilendi** — durum `is_premium`'dan DEĞİL, `trial_start_date + 14` ile HESAPLANIYOR (`lib/lifecycle.ts`). Segmentler (zombi/bitiyor/denemede/yeni/ücretli/ücretsiz/kayıp/askıda, sayaçlı) + sıralama (kayıt·son giriş·deneme bitişi·e-posta) + URL'de saklama (`?seg=&sort=&tur=`).
- [ ] **Canlı GÖZ teyidi:** admin.paraner.com → giriş → panel; müşteriye tıkla → detay; müşteri hesabıyla girince app.paraner.com/panel'e atılıyor mu?
- [ ] **Şifre sıfırlama maili ön koşulu:** Supabase → Auth → URL Configuration → Redirect URLs'te `https://paraner.com/sifre-sifirla` YOKSA link reddedilir (DAILY_LOG'da zaten bekleyen madde). Aksiyonu ilk kullanmadan teyit et.
- [ ] **Sonraki (kod):** audit log'u panelde GÖSTER (şu an yalnız yazılıyor) · müşterinin destek talepleri detay sayfasında · trial/abonelik analizi.
- [ ] **Karar:** `app.paraner.com/admin` hâlâ açık (rol-korumalı, açık değil). DNS canlıya alınınca admin host'una redirect edilsin mi (tek adres) — Mehmet.
- [ ] **Ölçek notu:** Dashboard "Toplam Üye" = distinct `auth_user_id` (PostgREST'te distinct count yok → kolon çekilip Set'leniyor, `.limit(10000)`). Binlerce profilde RPC gerekir → **DB şeması = önce sor**.

### 🎫 DESTEK SİSTEMİ — Faz 0 ✅ TAMAMLANDI (2026-07-16, uçtan uca doğrulandı)
> Detay: `DESTEK-SISTEMI.md` + `DESTEK-SEMA-MOBIL.md` + `destek-faz0.sql`. Web+mobil (ortak Supabase,
> iki Claude mutabakatı). **Uçtan uca ÇALIŞIYOR:** agent yanıtı → çan bildirimi (realtime web+mobil) +
> e-posta (Resend, `merhaba@paraner.com`). Mehmet canlı doğruladı (web çanı yandı + mail geldi).
> ⚠️ E-posta Database Webhook UI ile DEĞİL (o "supabase_functions does not exist" verdi) → webhook'suz:
> `notify_on_agent_reply` trigger'ı `pg_net.http_post` ile support-reply-notify'ı çağırıyor, secret Vault'ta
> (`support_webhook_secret`) + Edge Function Secrets (`SUPPORT_WEBHOOK_SECRET`) — ikisi aynı değer.
- [ ] **Test verisi temizle:** `delete from notifications where data->>'ticket_id' in (select id::text from support_tickets where subject like 'ZZTEST%'); delete from support_tickets where subject like 'ZZTEST%';`
- [ ] **Gerçek destek ekibi hesapları** `user_roles`'e (şu an sadece admin@paraner.com agent).
- [ ] **Faz 1:** mobil push — mobilde `withNoPushEntitlement` yüzünden remote push KAPALI, **ücretli Apple hesabı + APNs** ister (Mehmet kararı).
- [ ] **Faz 2 (opsiyonel):** kullanıcı yeni mesajında agent'a bildirim · agent atama/öncelik/filtre · ek dosya yükleme (ticket-attachments bucket) · çanda "tümünü okundu".
- [ ] ⚠️ **Google Workspace ödeme** — `merhaba@paraner.com` aboneliği 3 Ağu 2026'ya kadar yenilenmeli, yoksa TÜM sistem mailleri durur.

### 🔴 CANLI GÖZ TEYİDİ BEKLİYOR
> İŞE BAŞLARKEN İLK BUNU SOR. Kod tarafı + headless doğrulandı; gerçek cihaz/göz onayı yok.

**2026-07-15 turu (bu oturum)**
- [ ] **Ayarlar → Hesap Bilgileri** (Profil + Şirket bilgileri alt sekmeleri; logo yükleme) gözünde düzgün mü?
- [ ] **Fatura Yazdır/PDF** — bir faturayı yazdır, A4 çıktı (logo+VKN+kalem+toplam) düzgün mü?
- [ ] **Veri & Yedekleme** — CSV dışa/içe aktarma çalışıyor mu?
- [ ] **Köşe yarıçapı + bildirim çanı + Destek sayfası** genel görünüm.

**2026-07-14 turu**
- [ ] **Mobil/tablet panel hızı** — telefondan panele gir, menüde gez: iskelet çıkıyor mu? (Masaüstü canlıda ölçüldü: 14-26 ms, iskelet yok. Dokunmatikte hover olmadığı için ayrı teyit gerekir; 6 çekirdek rota peşin ısıtılıyor, alt menüdekiler dokunuşta.)
- [ ] **Yeni slogan** — hero/footer/CTA/`/bireysel` başlığında yazım + satır kırılması gözle düzgün mü?
- [ ] **Şifre Belirle akışı (mobil↔web)** — web'den şifre belirlenen hesap MOBİLDE de e-posta+şifre ile giriyor mu? Mobil Profil → Güvenlik'te etiket "Şifre Değiştir"e döndü mü (ortak `has_password` bayrağı)?
- [ ] **Ayarlar yeni yerleşim** — 4 sekme (Genel/İşletme/Bildirimler/Hesap & Güvenlik) senin gözünde de düzgün mü?

**2026-07-13 turundan kalan**
- [ ] **`/destek`** — SSS akordeonları açılıyor mu, WhatsApp kartı doğru numaraya gidiyor mu (`+90 532 237 99 09`)?
- [ ] **Mega-menü (masaüstü)** — İşletme/Bireysel üstüne gel: panel ORTADA sabit duruyor mu, geçişte kapanmadan içerik KAYARAK mı değişiyor?
- [ ] **Mobil menü** — drill-down (içeri giriş) akışı + kaydırma çubuğu artık yazılara değmiyor mu?
- [ ] **Tipografi** — Playfair başlıklar (`/`, `/isletme`, `/bireysel`, `/destek`, `/gizlilik`) düzgün mü? Türkçe ğ/ş/İ harfleri doğru fontta mı?
- [ ] **Google'da yeni title** — birkaç gün sürer. Search Console → URL Denetimi → "Dizine eklenmeyi iste" (`/`, `/destek`, `/isletme`, `/bireysel`).
- [x] **Genel Bakış / hesap kartları** — Mehmet onayladı ("kartlarım tarafında güzel gözüküyor").

### 🐞 2026-07-14'te ortaya çıkan, HENÜZ YAPILMADI
- [ ] **Yanlış şifreyle girişte kullanıcı hata görmüyor** — canlı denemede giriş reddedildi ama ekranda kalıcı bir uyarı yok (toast birkaç saniyede kayboluyor). `/giris` şifre akışında inline hata gösterilmeli.
- [ ] **Apple "e-postamı gizle" (`@privaterelay.appleid.com`) + şifreyle giriş** — bu kullanıcılar giriş formuna hangi adresi yazacak? Web + mobil ortak soru; akış netleşmeli.
- [ ] **Sayfa-özel iskeletler** — tek `app/panel/loading.tsx` (3 KPI + 6 satır) 29 sayfada gösteriliyor; Stok/Ayarlar gibi benzemeyen sayfalarda "yanlış iskelet" hissi veriyor. (Prefetch sayesinde artık nadir görünüyor → düşük öncelik.)
- [ ] **`/panel/islemler` ikon yükü** — `lib/categoryIcons.tsx` 86 lucide ikonunu barrel import ediyor → o rotaya ~15 KB gzip (rota-özel yükün 2/3'ü). Tembel/parça import'a çevrilebilir.
- [ ] **Genel Bakış `transactions` limitsiz** — 6 ayın tüm işlemleri çekiliyor (limit yok). Yoğun hesapta payload şişer; özet için RPC gerekir → **DB şeması = önce sor**.
- [ ] **Vercel Hobby soğuk başlangıç** — prefetch maskeliyor ama ilk istek hâlâ soğuk. Pro + Fluid Compute değerlendirilebilir (ücret kararı Mehmet'te).

### Devam eden
- [ ] **Genel mobil tarama:** ana sayfa + auth ekranlarında telefonda taşma/bozulma var mı, tek tek bak. (Auth + rozetler 06-29'da elden geçti; ana sayfa/diğer bölümler kaldı.)
  - 07-02: Headless tarama (320/360/390/560/768px, ana sayfa + /giris + /kayit): tek gerçek sorun 320px'te hero 11px yatay taşma (rozet satırı min-content 342px) → `.hero-text{width:100%}` fix (≤900 medya bloğu). Ayrıca iOS Safari mask-drop beyaz kaması (beam input) maskesiz tekniğe geçirilerek çözüldü — detay `DAILY_LOG.md` 07-02. İkisi de deploy edildi; **Mehmet'in telefonda göz teyidi bekliyor** (hero taşması + beam input görünümü).

## Rakip denetiminden çıkan (2026-07-13, `RAKIP-defteran.md`)

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
- [x] Güvenlik header'ları, CSV formül enjeksiyonu, çift-submit kilidi (22 handler), bütçe currency, profil-değiştirme kilitlenmesi, collection_in bakiye, düzenli fatura çift-üretim, fatura paritesi (numara/transactions/kalem/durum/due_date), KDV dönem sınırı, para birimi 6→30, findCategory sistem etiketleri, aktif profil is_primary fallback. **Canlı göz teyidi bekliyor** (fatura oluştur→mobilde görünüm; düzenli fatura "Şimdi Oluştur"; profil değiştir).
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
