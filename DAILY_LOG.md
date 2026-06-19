# DAILY LOG — paraner-web

## 2026-06-19 — Gizlilik Politikası sayfası (App Store gönderimi için)

**Hedef:** App Store, zorunlu bir herkese-açık Privacy Policy URL'i istiyor. Mobildeki gizlilik metnini web'e uyarlayıp `https://paraner.com/gizlilik` adresinde yayınla.

- **`app/gizlilik/page.tsx`** (yeni, server component): Background + Nav + Footer desenli; mobil `app/privacy.tsx` ile eşleşen metin (toplanan veriler, kullanım, güvenlik=Supabase/RevenueCat, Parla=Gemini+Claude anonim & model eğitiminde kullanılmaz, çerez/analitik, haklar, **KVKK m.11** + veri sorumlusu MGZR LLC, iletişim destek@paraner.com). "Son güncelleme: 19.06.2026". Metadata: title + `alternates.canonical: "/gizlilik"`.
- **Çerez maddesi web'e uyarlandı:** mobil AsyncStorage + web yalnız zorunlu oturum çerezi, üçüncü taraf reklam/analitik yok (sitede analitik tespit edilmedi).
- **`globals.css`:** `.legal` okuma stili (760px, teal linkler, responsive).
- **`Footer.tsx`:** footer linklerine "Gizlilik". **`sitemap.ts`:** `/gizlilik` (monthly, 0.5). **`robots.ts`:** dokunulmadı — zaten `allow:"/"` altında taranabilir.
- tsc temiz. Commit `ea58ab9` → push → Vercel deploy.

**Sıradaki (App Store, kod işi DEĞİL):** Nutrition Labels anketi + reviewer demo hesabı (`admin@paraner.com`) App Store Connect panelinde doldurulacak. GOREVLER.md "App Store gönderimi" bölümünde.

---

## 2026-06-15 — PWA ikonu düzeltildi (dock'taki siyah kare) + bekleyen kontroller kod tarafı doğrulandı

**Sorun:** PWA (Chrome "yükle") ile kurunca dock'ta ikon **keskin köşeli, masif siyah kare** olarak çıkıyordu (Surfshark gibi yuvarlak/native durmuyordu). Sebep: `icon-512` kenardan kenara dolu, yuvarlatmasız, saf siyah PNG; Chrome PWA ikonu olduğu gibi kullanır, köşe yuvarlatmaz.

**Çözüm:** `sharp` ile ikonlar yeniden üretildi. **Logo rengi (teal) birebir korundu** — P pikselleri orijinalden alındı, yalnız zemin + köşe değişti (Mehmet: "logo rengimiz aynı kalmalı"):
- **icon-512/192 + app/icon.png:** Surfshark tarzı **canlı teal gradyan zemin** (#119E86→#0A5247, köşegen) + **orijinal teal P** (renk değişmedi), mac-stili yuvarlak köşe + şeffaf köşeler (`purpose: any`).
- **app/apple-icon.png:** tam kare gradyan zemin + teal P (iOS köşeyi kendi yuvarlar → şeffaflık konmaz).
- **public/icon-maskable-512.png (yeni):** Android adaptive — P %72 güvenli alanda, gradyan zemin dolu (`purpose: maskable`).
- **manifest.ts:** maskable eklendi, `purpose` belirtildi, `background/theme_color` saf siyah → koyu marka `#0B1F1C`.
- Orijinaller `/tmp/paraner-icon-backup/` (geçici). Karar evrimi: "masif teal + koyu P" → Mehmet logo rengi korunsun dedi → "koyu zemin + teal P" → Mehmet Surfshark gibi canlı yeşil zemin istedi → **teal P korunup zemin g2 teal gradyan** yapıldı. KISIT: zemin P'den parlak olursa teal P kaybolur; en parlak okunabilir ton ~g2 (g3'te logo siliniyor).
- **Not:** Kurulu PWA ikonu kurulum anında cache'lenir → yeni ikon için **uygulamayı kaldırıp yeniden kur**; ayrıca ikon canlıdan çekildiği için **deploy gerekir**.

**Açılış HIZI — service worker + self-contained boot.html (FINAL):** Higgsfield gibi "anında" açılış hedefi. SSR splash en erken [Vercel fonksiyonu + proxy auth turu] sonrası boyandığından gerçek "anında" olamıyordu; `/acilis` denemesi de globals.css+PNG'yi beklediği için yavaştı (geri alındı). Çözüm 3 parça: (1) **`public/boot.html`** — kendi-kendine yeten (inline CSS + logo base64 GÖMÜLÜ, dış dosya yok), 14KB, tek dosya anında boyanır; `fetch("/panel")` ile paneli ısıtır, 650ms sonra `location.replace("/panel")`. (2) **`public/sw.js`** — service worker, YALNIZ boot.html'i cache'ler (uygulama/veri cache'lenmez → bayat içerik yok); sonraki açılışlarda boot.html ağ beklemeden anında gelir. (3) `components/ServiceWorkerRegister.tsx` panel layout'ta kayıt. **`start_url`=`/boot.html`**, proxy matcher'dan boot.html+sw.js muaf (girişsizde /giris'e atılmaz). Dev'de doğrulandı: boot.html 200/4ms redirect yok, /panel hâlâ 307 korumalı. NOT: start_url + SW ancak PWA yeniden kurulunca aktif olur.

**Açılış HIZI — statik boot splash (`/acilis`) [VAZGEÇİLDİ]:** "Dock'a tıklayınca önce siyah, sonra logo" sorunu. Sebep: `start_url:"/"` → proxy `auth.getUser()` (~250ms) + rewrite `/panel` + `getProfiles` + sayfa sorguları (~3 ardışık Supabase turu) bitene kadar HTML dönmüyor, splash ancak o zaman boyanıyordu. Çözüm: PWA `start_url` artık **`/acilis`** — `force-static` (○ prerender) bir boot splash sayfası, **proxy matcher'dan muaf** → CDN'den fonksiyon/auth beklemeden **anında** servis edilir, logo ~anında boyanır (siyah yok). `AcilisRedirect` (client) `window.location.replace("/panel")` ile panele geçer; tam-sayfa navigasyonda tarayıcı /panel hazır olana dek /acilis splash'ını ekranda tutar → kesintisiz logo, panel kendi splash'ıyla dikişsiz devralır. Boot splash düz siyah (`.splash-boot`, arkada içerik yok). NOT: `start_url` değişikliği kurulu PWA'da ancak **yeniden kurulumla** okunur.

**Açılış (splash) ekranı — mobil ile aynı:** PWA açılırken/yüklenirken zemin **yeşil** görünüyordu. Sebep: `manifest.background_color/theme_color` = #0B1F1C (koyu teal → PWA açılış penceresi yeşil). Düzeltme: ikisi de **#000000** (siyah, mobil `Colors.dark.background` ile aynı). Ayrıca mobil `app/index.tsx` açılış animasyonu web'e taşındı: `components/SplashScreen.tsx` (client) — panel ilk yüklenince **siyah zemin + teal PARANER wordmark + soldan sağa beyaz shimmer** (wordmark CSS `mask`'i, `lib`siz saf CSS keyframe), ~0.9sn sonra yumuşak fade. Panel layout'a eklendi; yalnız hard load'da (PWA açılışı/yenileme) görünür, panel-içi soft navigasyonda tekrar tetiklenmez. (Panelde teal-glow `Background` zaten yok — yeşil tamamen manifest'tendi.)

**Ayrıca:** GOREVLER ⚠️ KONTROLLER listesinin **kod tarafı** baştan sona doğrulandı (Cüzdanım ort. maliyet/satış mantığı, Truncgil canlı API 200, Dashboard tek-sorgu türetimi, hesap ekleme mobil-ortak kolonlar, 24 kategori ikonu lucide eşleşmesi, detay paneli kayma CSS, para birimi çipi >1 koşulu). Geriye yalnız **cihaz/canlı göz kontrolü** kaldı (mobil↔web çapraz senkron, görsel teyitler).

---

## 2026-06-13 — Dashboard sıfırdan + hesap kartları + ikonlu kategoriler + seçiciler + menü temizliği

**Hedef:** İşlem ekleme/hesap akışını mobil seviyesine taşı (gerçek kart görselleri, ikonlu kategoriler, özel tarih/kategori seçici); Genel Bakış'ı profesyonel bir dashboard'a çevir; menü tekrarlarını temizle. Her adım headless Chrome ekran görüntüsüyle gözle doğrulandı.

### İşlem Ekle modalı (mobil ile hizalı)
- **Gelir solda / Gider sağda** (mobil ile aynı); modal açılınca **varsayılan Gelir** seçili.
- **Hesap seçimi:** açılır liste yerine **kaydırılabilir gerçek kart görselleri** (mini `AccountCard`); başta dar "Hesapsız" karosu. Hesap yoksa "Hesaplarını ekle" ipucu.
- Modal **geniş varyant** (`Modal wide`, 560px) — kartlar ferah sığsın.

### Özel tarih + kategori seçici (portal popover)
- **`DatePicker`:** native `<input date>` yerine özel takvim — TR, Pazartesi başlangıçlı, ay/yıl ızgara gezinme, "Bugün"/"Temizle", body'e portal (modal overflow'undan kırpılmaz), yer yoksa yukarı açılır.
- **`CategoryPicker`:** portal popover + `overscroll-behavior:contain` (kaydırma modala sıçramaz). Liste ikon+renk rozetli; **"Yeni kategori"** satır içi form: **ad + ikon (65) + renk (16)**. Özel kategorilerde **düzenle/sil**. Temel kategoriler (mobil ortak katalog) düzenlenemez.

### Kategori ikonları (mobil ↔ web)
- **`lib/categoryIcons.tsx`:** mobil Ionicons adlarını lucide bileşenlerine eşler (65 ikonun tamamı lucide'de mevcut, kontrol edildi). Temel kategorilere mobil ile **aynı ikon adları** eklendi. Özel kategoriler `{id,label,icon,color}` (localStorage, mobil de cihazda).

### Hesaplar — mobil kart sistemi
- **`AccountCard`:** 6 gradient tema (`lib/cardThemes`), köşe glow (yumuşak radial), PARANER wordmark, kasa/POS SVG illüstrasyonları (mobil port). **em-tabanlı ölçek** (`font-size:1cqw` ebeveynden, gerisi em) → ızgara/önizleme/mini her boyutta birebir tutarlı, kesilme yok.
- Form: **kart tema seçici** (kaydırarak, canlı önizleme), **hesap türü segmenti** (Banka/Nakit/POS + ? bilgi), **para birimi çipleri** (bayraklı, `lib/currencies`), para birimine göre **IBAN / routing+hesap no** (USD/GBP). DB'ye dokunulmadı (`routing_no/account_no/card_theme` mobilde zaten var).

### Genel Bakış → profesyonel dashboard
- **4 KPI kartı** (Toplam Bakiye · Bu Ay Gelir · Bu Ay Gider · Net Akış) — ikon + delta çipi + sparkline.
- **Shopify (Polaris Viz) tarzı `LineChart`** — yumuşak gelir/gider çizgileri + alan gradyanı, Y ekseni + ızgara, **hover'da dikey kılavuz + tooltip**. Bağımlılıksız saf SVG + küçük client etkileşimi. (Polaris Viz'i kurmadık: React 19/Next 16'da risk.)
- **Kartlarım** (gerçek hesap kartları), **Kategori Analizi** (`Donut` + lejant), **zengin Son İşlemler** (ikon + hesap + saat). Tek render'da (1 transactions + 1 bank_accounts sorgusu, son 6 ay).
- İşlem listesi **kategori ikonları** rozetli; **detay paneli açılınca liste sola kayar** (drawer'ın altına girmez).

### Menü temizliği (aynı sayfaya giden tekrarlar)
- Kaldırıldı: **Gelir/Gider Özeti** (=İşlemler), **Kasa & Banka Hesapları** (=Hesaplar üst menü), **KDV Beyanname Özeti** (=KDV Raporu); **Teklif Oluştur + Tekliflerim** → tek **Teklifler**. Kırık link yok.

### Düzen
- Panel içeriği **tam genişlik** (max-width kaldırıldı, 32px iç boşluk) — geniş ekranda sağdaki boşluk gitti.

### Durum
- `tsc` + production build **temiz** (EXIT 0). Yeni dosyalar: `DatePicker, CategoryPicker, AccountCard, Donut, LineChart` + `lib/cardThemes, currencies, customCategories, categoryIcons`. **Push edildi** (main → Vercel).

---

## 2026-06-12 — Cüzdanım canlandı (Truncgil) + sidebar + İşlemler çoklu para birimi

**Hedef:** Cüzdanım'ı salt-okunurdan mobil seviyesine taşı (canlı piyasa fiyatı, değer/K-Z, ekle/sat); sidebar'daki eksik Cüzdanım'ı gider; İşlemler'e para birimi filtresi.

### Cüzdanım — canlı Truncgil + tam işlevsel
- **`lib/market.ts`:** Truncgil (`today.json`) **server tarafında** çekilir (CORS yok), Next `fetch` ile **5 dk cache**. Mobil `marketService` ile birebir: `parseTR`/`parsePct`, döviz (USD/EUR/GBP/CHF/SAR) + altın (gram/çeyrek/yarım/tam/cumhuriyet) eşlemeleri. Hata → boş + `isStale`.
- **`lib/assets.ts`:** varlık kataloğu (TL/USD/EUR/GBP + 5 altın) + değerleme: `getTLValue`, `getUnitPrice`, `getChangePct`. Client-güvenli.
- **`CuzdanimClient.tsx`:** portföy şeridi (Toplam Değer ₺ + kullanıcı para biriminde ≈, **Kâr/Zarar** % ile, **Bugün** günlük değişim) + saf-SVG **dağılım donut**'u + varlık listesi (güncel değer, günlük ▲▼, K/Z).
- **İşlemler (mobil `savingsStore` mantığı):** ekle → aynı türde varsa **ağırlıklı ortalama maliyet**; sat → tam satış varlığı siler, kısmi satış ortalama maliyeti korur; her alış/satış `savings_asset_movements`'a hareket kaydı yazar (mobil ile ortak tablo, şemaya dokunulmadı). Düzenle/sil de var.
- **Gerçek altın görselleri:** mobil `assets/gold/*.png` → `public/gold/`. Emoji yerine gerçek fotoğraflar (gram/çeyrek/yarım/tam/cumhuriyet birbirinden ayırt edilir).
- **Varlık türü seçici:** native `<select>` görsel gösteremediği için kaldırıldı → trigger + **alt alta dikey açılır liste** (görselli satır + seçilide tik), fatura formundaki ödeme-durumu seçici hissi.

### Sidebar — işletme üst menüsü
- İşletmede üstte sadece Genel Bakış + İşlemler vardı, **Cüzdanım hiç görünmüyordu**. Üst menü artık her iki profil tipinde aynı çekirdek: **Genel Bakış · İşlemler · Hesaplar · Cüzdanım**. (Hesaplar ayrıca Finans bölümünde hızlı erişim olarak kalır.) Menüde sayfası olup linklenmemiş başka eksik yoktu — Cüzdanım tek açıktı.

### İşlemler — çoklu para birimi çipi
- Filtre satırına (arama·tür·kategori·ay yanına) **para birimi çipi**: `Tüm dövizler · TRY · USD …`. Yalnızca kullanıcının **>1 para biriminde** hesabı/işlemi varsa görünür (TRY-only'da gizli). Para birimleri hesaplar+işlemler birleşiminden otomatik.

### Durum
- `tsc` + production build temiz (her adımda). Cüzdanım + sidebar + altın + dikey seçici **push edildi** (Vercel canlı). İşlemler para birimi çipi bu commit'te.
- **Workflow notu:** Mehmet artık geliştirmede dev'den kontrol ediyor → her değişikliği deploy etme, push "işi bitir"de (memory: dev-kontrol-push-etme).
- **Bekleyen kontroller:** GOREVLER.md başındaki "⚠️ KONTROLLER" — bir dahaki işe başlada önce doğrulanacak (mobil↔web Cüzdanım çapraz kontrol vb.).

---

## 2026-06-11 — İşlemler: düzenleme + ay filtresi + transfer + detay paneli (kaynak & dosya ekleme)

**Hedef:** İşlemler modülünü mobil seviyesine yaklaştır: düzenleme, ay filtresi, hesaplar arası transfer, ve işleme tıklayınca açılan zengin detay paneli (nereden eklendi + dosya/fiş ekleri).

### İşlemler — düzenleme + ay filtresi
- **Düzenleme:** ekle/düzenle tek modal; düzenlemede **bakiye mutabakatı** (eski etkiyi geri al + yenisini uygula → tutar/tür/hesap değişse de bakiye doğru).
- **Ay filtresi:** `<input type=month>` çipi; seçilince o ayı **DB'den** çeker (son-100 sınırının ötesi de görülür), boş → son 100. Arama+tür+kategori ile birlikte çalışır.

### Hesaplar arası transfer (mobil mantığı, şemaya dokunmadan)
- `transfer_out` (kaynak −) + `transfer_in` (hedef +) + opsiyonel `transfer_fee` (expense), hepsi ortak `transfer_group_id`. Bakiye senkronu 2 ondalık. **Farklı para birimi engelli** (hedef listesi aynı para biriminden). Raporlar `type='transfer'`'ı zaten hariç tutuyor.
- **Tutarlılık:** İşlemler'de transfer satırı düzenlenemez; silince çift bacak (+ücret) birlikte silinir, her hesabın bakiyesi geri alınır.

### İşlem detay paneli (sağ yüzen kart)
- Satıra tıkla → sağda **yüzen kart** (üst bar altından hizalı, 22px köşe, Esc/X kapat, overlay yok → sayfa tıklanabilir kalır). Düzenle/Sil yan yana.
- Gösterir: tutar+tür, kategori, tarih, **saat** (`created_at`), hesap, **eklendiği yer**, not.
- **Eklendiği yer** için `transactions.source` (text) kolonu eklendi (Mehmet onayı). Web insert'leri `'web'` yazar (işlem + transfer); boş/eski/mobil → "Mobil uygulama"; ileride `'accountant'` → "Muhasebeci".

### Dosya / fiş ekleme
- Ekleme modalı + detay panelinde **sürükle-bırak / tıkla** yükleme (max 3, PNG/JPG/PDF). Mobil ile **aynı `receipts` bucket** + `receipt_urls/receipt_thumbnails/receipt_url` kolonları → mobil↔web ortak.
- PDF bazı mobil yüklemelerinde yanlış content-type (`image/jpeg`) ile saklanmış → web, eki çekip **`application/pdf` blob** ile açarak telafi ediyor. Görseller direkt açılır.

### Mobil'e taşınacaklar (GOREVLER → Mobil Claude'a iletilecek)
- `source` alanını mobil de yazsın (`'mobile'`) + `transaction-detail`'de "eklendiği yer" göstersin.
- **Mobil transfer silme BUG'ı:** tek bacağı siliyor → çift bacak + bakiye düzeltmesi gerekli.
- **Mobil PDF content-type BUG'ı:** upload `application/pdf` göndersin.

### Durum
- `tsc` + production build temiz. `source` kolonu Supabase'de eklendi (canlı çalışıyor).

---

## 2026-06-11 — Hesap ekleme (max 3) + liquid-glass geçiş animasyonu + İşletme Ayarları

**Hedef:** Sol menüdeki hesap değiştiriciye mobil ile tutarlı "yeni hesap ekle" (max 3) yetisi; hesap geçişinde şık bir karşılama animasyonu; bekleyen İşletme Ayarları özelliklerini Ayarlar sayfasına işle.

### Hesap ekleme (Sidebar profil değiştirici)
- Mobil deseni (`plan-detail.tsx` "Yeni Hesap Ekle · max 3") web'e taşındı: switcher menüsünde **Bireysel / İşletme** seçimi + ad girişi + Oluştur.
- `< 3` profil → ekleme formu; `= 3` → kilitli "Hesap limiti doldu" satırı. Menü artık tek profilde de açılır (yalnız geçiş değil, ekleme için de).
- `createAccount`: mobildeki `createProfile` ile **birebir alan seti** (`auth_user_id`, `profile_type`, `currency:'TRY'`, `is_premium:false`…) ile `profiles`'a insert → yeni hesaba otomatik geçiş. İşletme webde direkt açılıyor (Stripe/trial sonra; şema mobil ile aynı).

### Hesap geçişi animasyonu (liquid glass)
- Geçişte tüm ekranı kaplayan **cam kart**: arka plandaki sayfa `backdrop-filter: blur` ile bulanıklaşır; yatay yuvarlak köşeli, yarı saydam gradient + ışıklı kenar + gölge + kayan parıltı (sheen).
- İçinde **PARANER wordmark** CSS `mask` ile: beyaz başlar, **soldan sağa yeşile dolar** (~1.1sn). Altında "HESAP DEĞİŞTİRİLİYOR" + hedef hesap adı.
- En az 1.1sn gösterim (hızlı geçişte yanıp sönme yok) + 6sn güvenlik kapanışı + `prefers-reduced-motion` desteği. Headless Chrome ile gerçek asset üstünde doğrulandı.
- **Mobil için prompt verildi** (paraner-app'te aynı tasarımı MaskedView + expo-blur + LinearGradient + Reanimated ile kurmak üzere).

### İşletme Ayarları (Ayarlar sayfasına işlendi)
- `ayarlar` sayfası: işletme profilinde **Fatura Numaralandırma** (prefix + sıradaki no), **Bildirim Tercihleri**, **Yedek/Export**, **Roller** (yakında) bölümleri. `page.tsx` sorgusuna `invoice_prefix, invoice_next_number` eklendi.

### Durum
- `tsc --noEmit` + production build temiz. main'e push → Vercel deploy → canlı.

---

## 2026-06-11 — Sol menü revizyonu + işletme panel sayfalarının inşası

**Hedef:** İşletme sol menüsünü mobil (`paraner-app`) ile tutarlı, premium ve sapmasız hale getir; menüdeki "Yakında" modülleri tek tek çalışır yap (ortak Supabase, şemaya dokunmadan).

### Sol menü (Sidebar) revizyonu
- Üst bar sadeleşti: hesap adı + "Çıkış Yap" kaldırıldı; sağa AI sohbet · bildirim · ayarlar ikonları.
- Sidebar **ayrı yüzen bar** (yuvarlak köşe + liquid-glass), koyu teal zemin, aktif öğe teal "hap".
- Aç/kapa: sağ kenarda yüzen yuvarlak kol — **tek tık aç/kapa + sürükle-bırak snap** (pointer events). Hover titreme düzeltildi (backdrop-filter kaldırıldı).
- Hesap seçici: dışarı tık/Esc kapatır; daraltılmışken sağa flyout.
- **Taşma giderildi:** nav iç scroll + sabit Ayarlar footer + kenarlarda `mask-image` ile "metin arka plana karışarak" kaybolma; etiketler `nowrap+ellipsis`.
- **İkonlar Lucide'a** geçti (tüm site) → optik eşit boyut, temiz dişli.
- Boşluklar 12px sol inset'e hizalandı.
- **İşletme accordion menüsü** (`businessMenu.tsx`): mobil ile birebir 7 bölüm + alt öğeler, renkli kare ikon, aktif bölüm otomatik açılır.
- **Favoriler** (web'e özel, localStorage): alt öğeleri yıldızla → üstte hızlı erişim.

### Faturalar: tek ekran + ?type filtre
- Satış/Alış aynı ekran; menü `?type=income|expense`, sayfada Satış/Alış/Tümü sekmesi + dinamik başlık. Sidebar aktif-vurgu query'yi de eşliyor.

### Çalışır hale gelen sayfalar (mobil tablolarıyla, şemaya dokunmadan)
- **Stok & Ürünler:** `urunler` (products), `stok` (stock_movements: giriş/çıkış/düzeltme).
- **Çalışanlar:** `calisanlar`, `maaslar`, `harcamalar`, `izinler`.
- **Finans:** `duzenli-odemeler`, `cek-senet`, `borc-alacak`, `butceler` (bu ayki harcamayla), `kdv` (hesaplayıcı).
- **Müşteriler:** `musteriler` (contacts), `veresiye` (credit_book+entries), `mutabakat`, `vade` (faturadan aging).
- **Faturalar ek:** `teklifler` (quotes+quote_items, kalemli), `duzenli-fatura`.
- **Rapor/analiz:** `nakit-akisi`, `gelir-gider-raporu` (+CSV), `kar-zarar`, `kdv-raporu`, `vergi-takvimi`.

### Durum
- TypeScript + production build temiz. Menüde **30 öğe çalışır**, 6 dış-entegrasyon öğesi "Yakında" (OCR, döviz API, PDF, SGK, e-Defter, Muhasebeci).
- **Bekleyen:** her sayfanın tek tek tasarım/UX cilası; İşletme Ayarları özellikleri → Ayarlar sayfasına; mobil Claude'a not (faturalar başlık + Çalışan Listesi/Harcama aynı route fazlalığı).

---

## 2026-06-10 — Performans + Stripe-tarzı redesign + sidebar/logo

**Hedef:** Panel geçişlerini hızlandır, paneli Stripe dashboard diline (koyu+teal koruyarak) taşı, profil/işletme logosu + açılır-kapanır sidebar.

### Performans (geçişler yavaştı → hızlandı)
- `app/panel/loading.tsx`: tüm panel sayfaları için anında iskelet (shimmer) → "tak" hissi.
- Aktif profil React `cache()` ile tek sorgu: `lib/supabase/profile.ts` (`getProfiles` → `getActiveProfile` türetildi); layout + sayfalar aynı render'da paylaşır.
- Layout'tan gereksiz ikinci `getUser()` kaldırıldı (proxy zaten koruyor) → her geçişte 1 ağ turu az.

### Tasarım sistemi (zemin)
- `globals.css` token katmanı: anlamsal renkler (`--danger`, `--danger-soft`, `--warning`, `--success`, `--surface-modal`), boşluk/tipografi/gölge skalaları. Elle yazılı `#E24B4A` vb. değişkene bağlandı.
- Ortak bileşenler (kopya-yapıştır → tek kaynak): `components/ui/` (Modal, PageHead, Field, Avatar, Sparkline) + `components/icons.tsx` + `lib/date.ts`.

### Stripe-tarzı redesign (koyu + teal)
- **Genel Bakış**: metrik düzeni (etiket+▾ / kocaman rakam / geçen aya göre değişim) + bağımlılıksız SVG **sparkline** (günlük birikimli seri) + geçen ay karşılaştırması.
- **Sidebar**: üstte profil değiştirici (avatar+ad+▾, tıkla-değiştir), gruplu menü (Genel / İŞLETME), **daralt/genişlet** (en altta toggle, localStorage'da hatırlanır). Üst bara avatar.
- **İşlemler**: filtre çipleri (arama + Tümü/Gelir/Gider + kategori), anında client-side.
- **Hesaplar/Cariler**: özet şeridi metrik diline, kartlar ferah, rozetler pill.
- **Faturalar**: özet şeridi (Satış/Alış/Ödenmemiş) + pill durum rozetleri.

### Profil/işletme logosu
- `profiles.avatar_url` (bireysel foto) + `profiles.company_logo_url` (işletme logosu) — şemaya dokunmadan, mevcut kolonlar. `profileAvatarUrl()` tipe göre seçer (`lib/supabase/profileShared.ts`, client-güvenli).
- Sidebar + üst bar avatarı; foto yüklenemezse baş harfe düşer.

### Marka logosu (wordmark)
- `public/paraner-wordmark.png` mobil projeden alındı. Açık → tam **PARANER** wordmark; daraltılmış → wordmark'tan kırpılmış temiz **P** (`paraner-p.png`). (Klip yöntemi P/A bitişikliği yüzünden kırılgandı; ayrı temiz P'ye geçildi.)

### Temizlik + düzeltmeler
- Hydration uyarısı: `<body suppressHydrationWarning>` (tarayıcı eklentisi kaynaklı).
- 5 kullanılmayan starter SVG silindi (file/globe/next/vercel/window). `next lint` + tsc + build temiz.

### Durum
- TypeScript + production build temiz. Bekleyenler: GOREVLER.md.

---

## 2026-06-10 — Panel altyapısı + tüm modüller (sıfırdan)

**Hedef:** Giriş sonrası web paneli; mobil ile aynı Supabase backend, entegre çalışsın.

### Altyapı (auth + domain)
- `@supabase/ssr` + `@supabase/supabase-js` kuruldu. `.env.local` = mobil ile aynı proje (`oqhonmmbcqrkcaoijgnb`), `NEXT_PUBLIC_` önekli. Vercel'e de eklendi (Production+Preview+Dev).
- `lib/supabase/`: `client.ts` (browser), `server.ts` (SSR), `cookieDomain.ts` (`.paraner.com` çapraz-subdomain cookie).
- `proxy.ts` (Next 16: middleware→proxy): host `app.paraner.com` → panel; giriş yoksa `paraner.com/giris`'e redirect; `/giris` `/kayit` muaf; pazarlama hostuna dokunmaz.
- `app/giris`: gerçek `signInWithPassword` + TR hata + başarı→`app.paraner.com`.
- DNS: hosting.com.tr'de `app` CNAME → `…vercel-dns-017.com`. Vercel SSL. Canlı test OK (paraner.com/giris → app.paraner.com panel).

### Panel (sol menü + içerik, koyu tema #00BFA6)
- `app/panel/layout.tsx` (shell: Sidebar + üst bar profil/çıkış, auth guard, noindex), `Sidebar.tsx` (aktif vurgu, profile_type'a göre menü), `LogoutButton.tsx`.
- `lib/format.ts` (₺1.234,56 + GG.AA.YYYY), `lib/categories.ts` (mobil ile birebir + findCategory).
- **Genel Bakış** (`panel/page.tsx`): bu ay gelir/gider/net KPI + son işlemler.
- **İşlemler** (`islemler/`): liste (son 100) + ekle/sil modal, hesap bakiyesi senkronu.
- **Hesaplar** (`hesaplar/`): kartlar + para birimi bazında toplam + ekle/düzenle/sil.
- **Cariler** (`cariler/`): müşteri/tedarikçi + alacak/borç + ekle/sil.
- **Faturalar** (`faturalar/`): liste + oluştur (KDV otomatik, `invoice_next_number` sayacı, ödeme durumu) + sil.
- **Cüzdanım** (`cuzdanim/`, bireysel): salt-okunur varlık listesi (piyasa fiyatı mobilde).
- **Ayarlar** (`ayarlar/`): profil bilgisi + ad düzenle + profil değiştir (`is_active`) + çıkış.

### Durum
- Production build geçti, TypeScript temiz. main'e push → Vercel deploy → canlı (`app.paraner.com`).
- Bekleyenler: GOREVLER.md (kayıt akışı, şifremi unuttum, Cüzdanım market entegrasyonu, tasarım revizyonu).
