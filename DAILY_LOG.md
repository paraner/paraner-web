# DAILY LOG — paraner-web

> Özet günlük. Eski tasarım iterasyonları (auth küp v1-v6, auth deneme turları, açılış-hızı denemeleri) tek bloklara indirildi. Güncel durum + hâlâ geçerli ⚠️ uyarılar/dersler korunur. Tam ayrıntı için git geçmişi.

---

## ⚠️ Hâlâ geçerli uyarılar / config / bekleyen testler

- **iOS mobil auth dersleri** (mobil auth'a tekrar dokunulursa, adım adım + Mehmet onayıyla): `background-attachment:fixed` iOS'ta BOZUK; sabit bg için `position:fixed` katman ama o da klavyeyle yatay kayma yapar; `dvh` klavyede değişken → `svh` daha stabil; input `font-size<16px` → odakta zoom; CSS `mask`+`filter` Safari'de görünmezlik (bilinen bug). Sağlam "fixed bg + scroll + klavye" muhtemelen `visualViewport` JS API gerektirir.
- **Supabase config (kod değil):** Şifre sıfırlama için Auth → URL Configuration → Redirect URLs'e `https://paraner.com/sifre-sifirla` (+ dev `http://localhost:3137/sifre-sifirla`) eklenmeli, yoksa link reddedilir.
- **`FAREWELL_HOOK_SECRET`** Supabase Secrets'ta + DB function gövdesinde; repo'da YOK (placeholder).
- **Canlı göz kontrolü bekleyenler:** mobil↔web çapraz senkron (Cüzdanım, hesap kartları, işlemler, özel kategoriler); onboarding tam akış (panel-içi); Google One Tap (gerçek Gmail oturumuyla). Kod tarafı doğrulandı.
- **Eski/ölü asset'ler (temizlenebilir):** `public/paraner-auth-bg.mp4/.jpg`, `paraner-cube.mp4/.jpg` (artık referans yok). `public/auth-bg.webp` = resend.com/signup görseli (Mehmet verdi) → lansmanda telifsiz muadille değiştirilebilir.

---

## 2026-06-29 — Mobil auth KOYU tema (siyah) + mağaza rozetleri tek satır + Google buton fix

Mehmet onayıyla adım adım (canlı ekran görüntüleriyle), tümü `app/globals.css` + `SocialAuth.tsx`:
- **Mağaza rozetleri mobil (≤560):** `flex-wrap:nowrap` → 3 rozet TEK SATIR, eşit esner (`flex:1 1 0; min-width:0`), font `clamp()` + küçük padding/logo (≤360 ekstra sıkı). Masaüstü tek satır KORUNDU. Hero + auth altı tek bileşen (DRY) → ikisi de düzeldi.
- **Mobil auth SİYAH tema:** beyaz form override'ları (`.auth-card-form .X`, ~40 kural) `@media (min-width:1025px)`'e hapsedildi → mobil (≤1024) tek-sütun form base KOYU temaya döndü. `.auth-page/.auth-card/.auth-card-form` zemin `#000`/`--bg`, metin `var(--text)` (h1 miras alır), wordmark gunmetal→açık titanyum gradyan (siyahta görünür). **iOS dersleri uygulandı:** `min-height 100dvh→100svh` (klavye zıplaması), input `font-size:16px` (odakta zoom yok). Sabit konum / mask+filter YOK.
- **Teal nötrleme (mobil koyu):** base teal aksanları ([[marka-rengi-degisecek]]) nötrlendi — link/buton (Şifremi unuttum, Kod ile giriş yap) beyaz, input odak kenarı + OTP hücreleri nötr beyaz. Hata kırmızısı korundu.
- **Input köşeleri:** pill (999px) + 20px padding artık masaüstü+mobil ORTAK (şekil tutarlılığı, temadan bağımsız).
- **Google butonu (GIS) fix:** mobilde tema `outline`→`filled_black` (Apple koyu pill ile tutarlı). **Genişlik bug'ı:** GIS genişliği gizli (`display:none`) `gsi-wrap`'ten ölçülüyordu → `clientWidth=0` → sabit 240px (dar/ortada). Artık görünür parent `.social-auth`'tan hesaplanıyor (telefon=tam, masaüstü=yarım) → Apple ile birebir eşit.
- ⚠️ **Dev'deki 3 GSI_LOGGER hatası** ("origin not allowed" + 2× "failed to open popup") = localhost'a özgü, canlıda çıkmaz. Susturmak için Google Cloud Console → OAuth client → Authorized JS origins'e `http://localhost:3000` (config, kod değil; client ID mobil ile ortak ama JS origin web'e özel).

## 2026-06-29 — Hero banner: ReactBits Beams (3D ışık huzmeleri) + arka plan görseli kaldırıldı

Ana sayfa hero arka planı (`paraner-bg.webp`) → **ReactBits Beams** (`components/Beams.jsx`, R3F custom shader material).
- **Yol:** önce ReactBits **SideRays** (ogl) denendi, sonra **Beams** seçildi → SideRays + `ogl` + `public/paraner-bg.webp` temizlendi.
- **Bağımlılıklar:** `@react-three/fiber@9` + `@react-three/drei@10` (React 19 uyumlu) + mevcut `three`.
- **Yerleşim:** `<Beams>` `.hero-fx` (position:absolute, inset:0) sarmalayıcısında → R3F Canvas inline `height:100%` doğru dolar (yoksa tepede minik şeride çöküyordu). İçeriğin arkasında (`.hero-fx` z-index:0, metin z:2, küp z:1).
- **Banner altı fade:** `.hero-banner::after` son 220px'de `transparent→#000` → alttaki #000 bölümle keskin çizgi yok.
- **Marka/ayar (onaylı):** `lightColor:#9aa0a6`, `beamWidth:1`, `beamNumber:12`, `beamHeight:15`, `speed:2`, `noiseIntensity:1.75`, `scale:0.2`, `rotation:30`. Parlaklık kısıldı: `directionalLight` 1→0.7, `ambientLight` 1→0.65.
- **Beams.jsx ayar düğmeleri:** parlaklık prop değil → `lightColor` + bileşen içi `directionalLight`/`ambientLight` intensity.

## 2026-06-29 — Footer arka planı: ReactBits Splash Cursor (akışkan imleç)

Footer arka planı için birkaç tur denendi, oturmuş durum:
- **Araştırma:** resend.com/forward arka planı = Paper Shaders WebGL (Warp ailesi). Önce bağımlılıksız özel shader, sonra `@paper-design/shaders-react <Warp>`, sonra ReactBits **Hyperspeed** (three.js otoyol) denendi — hepsi bırakıldı.
- **Final = ReactBits "Splash Cursor"** (`components/SplashCursor/`, vanilla WebGL akışkan, **sıfır bağımlılık**). Footer'a hapsedildi: konteyner `fixed`→`absolute`, koordinatlar canvas'a göreceli (splat'lar footer içinde doğru yerde).
- **Marka:** monokrom **titanyum** renk (`#9aa0a6`), `RAINBOW_MODE` kapalı, şeffaf bg ([[marka-rengi-degisecek]]). Params: SIM 128 / DYE 1440 / density 3.5 / curl 10 / splat 0.25·6000.
- **Footer `min-height: 300px`** → akışkana dikey alan (en-boy ~10:1→~5:1), girdaplar gelişir; aksi halde ince şeritte sıkışık görünüyordu.
- **Perf:** footer görünüme girince **bir kez** mount (bileşende cleanup yok → unmount sızdırırdı), reduced-motion'da hiç yüklenmez. `pointer-events:none` (efekt window'dan dinler, footer linkleri etkilenmez).
- **`Hyperspeed.css`** global `canvas {}` selektörü diğer canvas'ları (AuthCube3D/BeamInput) bozuyordu → kaldırılınca sorun gitti. `three` AuthCube3D'de kullanılıyor → `^0.185.0`'da kalmalı (Hyperspeed denemesinde istemsiz 0.180 düşüşü düzeltildi).
- ⚠️ Bu efekt yalnız **imleç footer üstündeyken** tepki verir (global değil — Mehmet bilerek footer'ı seçti). İstenirse `RAINBOW_MODE={true}` tek satırla çok renkli olur.

## 2026-06-28 — Auth: masaüstü görsel arka plan (KALICI) + mobil koyu deneme geri alındı

- **Masaüstü (KALICI, onaylı):** `.auth-page` arka planı koyu görsel `public/auth-bg.webp` (cover, `#060607` fallback). Sol panel içi boşaltıldı → arkadaki görsel görünür; beyaz çerçeve (`.auth-card` 4px border) + sağ köşeler yuvarlatıldı (`0 24 24 0`). `.auth-cube` panel görseli sayfa bg'siyle dikişsiz. `.auth-card` bg `#fff`.
- **Mobil (≤560) resend-tarzı koyu deneme → TAMAMEN GERİ ALINDI:** klavye (iOS yatay kayma / dvh) ve logo görünmezliği (mask+filter Safari bug) çözülemedi → Mehmet "ilk haline al" dedi. `@media (max-width:560px)` auth bloğu komple silindi → mobil orijinal **tek-sütun BEYAZ formu** kullanıyor. SocialAuth mobil değişiklikleri + `html overflow-x` + `.btn-dots` geri alındı. (Dersler yukarıda ⚠️.)

## 2026-06-27 — Hesap silme veda maili + Ayarlar "Hesabı Sil" (CANLI doğrulandı)

İki repo (web + app) + Supabase. Veda maili artık `auth.users` DELETE trigger'ında (tek yerden) → silme nereden gelirse gelsin tek mail gider. `send-farewell-email` Edge Function (app, secret-korumalı) + DB trigger; `delete-account`'tan satır-içi mail kaldırıldı (çift gönderim önlendi). Web Ayarlar'a "Hesabı Sil" butonu (`AyarlarClient`, onay → `delete-account` → signOut → `/giris?closed=1`). **Canlı doğrulandı:** dashboard'dan silmede "Görüşmek üzere" maili geldi.
- **İLERİDE (Mehmet):** admin/dashboard silmede FARKLI mail (kullanıcı kendi silince ayrı, biz silince ayrı). Trigger'a silme kaynağı ayrımı eklenecek.

## 2026-06-27 — Hesap birleşme + onboarding fix (CANLI doğrulandı)

- **Hesap birleşme:** Aynı e-posta hem OTP hem Google ile → Supabase tek hesapta birleştiriyor (Email+Google tek UID), veri bölünmüyor. Kod değişikliği gerekmedi.
- **Onboarding "Hazırlanıyor…" sonsuz takılma FIX:** bitişte `router.refresh()` (server yeni profili hemen görmüyordu) → `window.location.assign("/panel")` (tam reload, server profili taze okur, modal %100 kapanır).

## 2026-06-27 — Auth koyu mod + Sonner toast + çıkış yönlendirme

Marka yeşili kaldırılıyor ([[marka-rengi-degisecek]]), nötr/koyu dile çekildi. Hepsi canlı doğrulandı.
- **Çıkış → paraner.com** (`LogoutButton` host'tan `app.` ön ekini kaldırır, tam yönlendirme).
- **Switcher + butonlar:** parlak siyah pill (Uiverse marcelodolza, `FancySubmit` 3 submit'i sarar), titanyum thumb, yeşil/teal temizlendi (input focus, OTP, linkler nötr; hata kırmızısı korundu). Buton loading metinleri ayrıştırıldı ("Kod gönderiliyor…", "E-postanı kontrol et…").
- **Sonner-tarzı toast (proje geneli):** mevcut `toast.ts`+`ToastHost` bağımlılık eklemeden Sonner davranışına getirildi (sağ üst yığılma, hover'da listeye açılma, variant ikonları nötr). `auth-msg` inline kutuları `showToast`'a yönlendirildi.

## 2026-06-27 — Ana sayfa: Beam Input + mağaza rozetleri + Google One Tap + kayıt sadeleştirme

- **Beam Input** (`BeamInput.tsx`, hover.dev tarzı, sıfırdan saf-CSS — `@property --beam-angle` + conic-gradient + mask, framer-motion yok): hero CTA çifti kaldırıldı → e-posta pill + "Ücretsiz Başla". Submit → `/kayit?email=...&start=1` → AuthForm otomatik `sendSignupOtp` → "Kodu gir" adımı. Hover'da ok belirir+buton büyür; autofill koyu zemin fix. Titanyum huzme (teal istenirse tek değişken).
- **Mağaza rozetleri (3'lü):** `StoreBadges.tsx` (Google Play 4-renk · Apple · Huawei AppGallery, inline SVG). Ana sayfa hero + auth altı (DRY aynı bileşen). Şimdilik tıklanmaz (uygulamalar yayında değil). Hover'da beam huzmesi.
- **Google One Tap** (`GoogleOneTap.tsx`, ana sayfa): Gmail açıkken "Paraner olarak devam et" kartı → `signInWithIdToken` → app.paraner.com. ⚠️ Canlıda gerçek Google oturumuyla test edilmeli (headless'te kart görünmez = beklenen).
- **Kayıt sadeleşti:** Ad Soyad kayıttan kaldırıldı → onboarding'e taşındı (`OnboardingModal`: bireysel name adımı, işletme company+name; OAuth'tan auto-dolu, e-postada zorunlu). Hover'da yukarı-kalkma efekti kaldırıldı.

## 2026-06-27 — Ana sayfa hero animasyonları + 3D küp performans/flaş

- **Hero metin giriş animasyonu** (Resend tarzı): `.hero-text > *` `heroRise` (translateY+blur+fade, stagger), başlık sheen. **Hero başlık harf-harf blur-in-up** (`HeroTitle.tsx`, Magic UI blurInUp → saf CSS, her harf gecikmeli `hcRise`, gradyan `background-image` ile korundu). `prefers-reduced-motion` kapalı.
- **3D küp performans:** görünmezken duraklat (`visibilitychange` + `IntersectionObserver` → rAF iptal) → fan/CPU düştü.
- **Küp beyaz flaş (NİHAİ):** yalnız harici DisplayPort monitör + Windows'ta, ara sıra → compositor zamanlama yarışı. Çözüm: `renderer.render()` bir kez yapıp canvas'ı öyle `appendChild` + `preserveDrawingBuffer:true` → boş kare compositlenmez. ⚠️ Harici monitörde son teyit bekliyor.
- **Performans:** `paraner-bg.jpg` 4K 880KB → WebP q88 **79KB (%91↓)**. FCP 0.85s, genel hızlı.

## 2026-06-27 — Auth görsel arka plan (ilk versiyon, 06-28'de oturdu)

Düz koyu degrade → markaya özel koyu görsel (`auth-bg.webp`). Bkz. 2026-06-28 (final masaüstü durumu).

## 2026-06-26 — Marka logosu: yeşil → titanyum

Yeşil logo bırakıldı, küple uyumlu titanyuma geçildi (web + app). Mehmet **Titanyum (01)** seçti; auth beyaz form zemininde **Gunmetal (03)**.
- Yeni şeffaf PNG: `paraner-wordmark-titan.png` + `paraner-p-titan.png`. CSS-mask wordmark'lar (PNG=alfa maske, renk CSS bg'den): `.splash-word`/`.auth-wordmark`(gunmetal)/`.reset-card`/`.switch-word` titanyuma çekildi. Sidebar `<Image>` src'leri yenilendi.
- **Favicon + PWA ikonları:** teal P → dikey titanyum gradyan (favicon.ico elle PNG-gömülü).
- **App tarafı (paraner-app, commit dc4c322):** asset PNG'ler + `AnimatedWordmark` titanyuma. ⚠️ App ikonu + native splash yeni native build + store gönderimi gerektirir.

## 2026-06-26 — Ana sayfa: tam ekran banner + titanyum (yeşilsiz) + hero'da 3D küp

- **Banner = markaya özel görsel** `public/paraner-bg.jpg` (4K, yalnız `.hero-banner`'da; site geneli sade koyu). Tek katman flex: metin solda (max 520), küp sağda `position:absolute` (kırpılmaz). Hero tam ekran (`100svh-68px`).
- **Yeşil tamamen kaldırıldı (marketing monokrom/titanyum):** eyebrow/h1-em/logo/butonlar titanyum (`.nav/.hero/.cta-band` scope'lu). **Panel/auth/onboarding teal'i KASITLI korundu** ([[marka-rengi-degisecek]]).
- Küp: `AuthCube3D` `zoom`/`playIntro` prop'ları (ana sayfada intro kapalı).

## 2026-06-26 — Üst bar + mobil menü (mgzrmedia / Resend tarzı)

- **Üst bar:** banner'a gömülü, kaydırınca **iOS Liquid Glass pill** (`Nav.tsx` client, `scrollY>30` → `.scrolled`). Koyu cam (`rgba(10,12,15,0.86)` + sheen + blur). Pill genişliği hero ile hizalı (`calc(1500px - 2*clamp(24,5vw,72))`). `solid` prop (banner'sız sayfalar).
- **Mobil:** liquid-glass pill YOK → sade blur bar + ☰ → tam ekran `.mobile-menu` (Resend düzeni: wordmark+✕, Kayıt Ol pill, Giriş, satırlar, mağaza rozetleri). `.mobile-menu` `.nav` DIŞINDA kardeş (ata `backdrop-filter` `position:fixed` çocuğu bozuyordu). Logo mobilde hep wordmark.
- ⚠️ Mobil base `.logo*` kuralları `@media`'dan ÖNCE tanımlanmalı (eşit specificity'de sonraki kazanır).

## 2026-06-26 — Auth küp: Three.js (özgün) — v1→v6 iterasyonları

Resend'in sürüklenebilir 3D küpü istendi (telifli `cube.mp4` ALINMADI → özgün Three.js sahnesi). Çok tur geliştirildi, **final v6** durumu:
- `AuthCube3D.tsx`: vanilla Three.js (dinamik import), 3×3×3 eğimli cubie (`RoundedBoxGeometry`), **yüz-başına malzeme** (lake/karbon/fırçalı metal/ızgara/satin), **her yüzde para birimi** ($ € £ ₺ ¥), filmik ışık (ACES + key/rim/specular + yumuşak gölge).
- **Hareket:** yavaş çok-eksenli dönüş + Rubik katman dönüşü (90°/180°/alt-üst ters, küp DAĞILMAZ). Custom pointer drag (`rotateOnWorldAxis` + momentum), OrbitControls kaldırıldı. reduced-motion → durur.
- **Giriş:** ortadan scale 0.05→1, %55'ten sonra spin rampa, ~%70'te cam-kırılma overlay (`cube-crack`, prosedürel).
- (Ara denemeler: scatter/topla morph, harf-decal, video-küp `paraner-cube.mp4` — hepsi bırakıldı, video public'te kullanılmıyor.)

## 2026-06-26 — Auth form cilası (canlı turlar) + primary buton

Çok tur canlı geri bildirim, oturmuş durum:
- **Switcher dikey/yatay zıplama fix:** `.auth-card-form justify-content:flex-start` + `.auth-split-form` min-height kaldırıldı + `padding-top:clamp(40px,14vh,150px)` → wordmark/switcher iki modda SABİT konum.
- **Label→placeholder** (input içi) + `aria-label`. **Giriş⇄Kayıt geçiş animasyonu** (`key={mode}`, yumuşak kayıp belirme). **Titreme fix:** `SocialAuth` GIS bir kez init (`key="social"`, animasyon dışında).
- **Google+Apple birebir eşit** (`flex:0 0 calc(50%-8px)`, GIS gerçek genişliğe render). **OTP aktif hücre** teal override + yanıp sönen caret.
- **Auth kartı** `max-width:1440 max-height:820` (her ekranda aynı kompozisyon), tek-sütun eşiği ≤1024.
- **Primary buton (`.btn-primary`):** teal glow + cam iç-parlaması + hover kalkma + shine sweep (`::before`). Tüm primary butonları etkiler.
- **Ölü kod:** `AuthVisual.tsx` + `.av-*`/`.fin-card`/`.fc-*` CSS silindi (sol panel videoya/küpe geçince ölmüştü).

## 2026-06-26 — Şifremi unuttum (mobil paritesi)

- **`AuthForm`:** "Şifremi unuttum" → `resetPasswordForEmail(email, {redirectTo: origin+'/sifre-sifirla'})`.
- **`/sifre-sifirla`** (yeni, noindex + `ResetPasswordClient`): recovery oturumu kurar (PKCE `?code` / `token_hash`+`type` / detectSessionInUrl auto-takas — hepsine dayanıklı) → yeni şifre → `updateUser` → panele.
- **`proxy.ts`** `PUBLIC_PATHS`'e `/sifre-sifirla` eklendi.
- **Fix:** reset maili **implicit flow** ile gönderiliyor (`createClient({implicit:true})`) → `{{ .TokenHash }}` düz token olur (pkce_ değil) → farklı cihaz/tarayıcıda da çalışır.
- ⚠️ Supabase Redirect URLs config gerekli (yukarıda ⚠️ listesinde).

## 2026-06-25 — Auth redesign: birleşik AuthForm + sürüklenebilir switcher

- **Birleşik `AuthForm.tsx`:** `/giris` + `/kayit` aynı bileşen, farklı `initialMode`; mod yerinde değişir (`history.replaceState` ile URL de). Tüm mantık korundu (OTP, şifre fallback, Google GIS, OAuth `?code`, kayıt OTP).
- **iOS UISegmentedControl tarzı switcher** (tıkla/sürükle, pointer events). Üstte Paraner wordmark. Alttaki "hesabın var mı" linkleri kaldırıldı.
- Sol panel 4px beyaz çerçeve + yuvarlak köşe. (Sol panel içeriği önce finans videosu → sonra küp → en son 06-28'de görsel.)

## 2026-06-20 — favicon.ico (Google Search Console) + temizlik

`app/favicon.ico` (16/32/48 ICO) → `/favicon.ico` 200 (önce 404'tü). `app/acilis/` (vazgeçilen boot splash) silindi. `_gen-icons.js` gitignore'a.

## 2026-06-19 — Gizlilik Politikası (App Store için)

`app/gizlilik/page.tsx` (server, `https://paraner.com/gizlilik`): mobil `privacy.tsx` ile eşleşen metin (KVKK m.11, MGZR LLC, destek@paraner.com). Footer + sitemap + `.legal` stili. ⚠️ App Store Nutrition Labels + reviewer demo hesabı panel işi (GOREVLER).

## 2026-06-15 — PWA ikonu (dock siyah kare fix) + açılış hızı

- **PWA ikon:** keskin siyah kare → `sharp` ile Surfshark-tarzı teal gradyan zemin + **orijinal teal P korundu** (Mehmet: logo rengi aynı kalmalı). icon-512/192, apple-icon, maskable-512, manifest. ⚠️ Kurulu PWA ikonu cache'li → kaldırıp yeniden kur + deploy.
- **Açılış hızı (FINAL):** `public/boot.html` (inline CSS + base64 logo gömülü, 14KB, anında boyanır → `/panel`'i ısıtır → redirect) + `public/sw.js` (yalnız boot.html cache, uygulama/veri cache YOK). `start_url=/boot.html`. (Ara denemeler `/acilis` static splash bırakıldı.) ⚠️ start_url + SW ancak PWA yeniden kurulunca aktif.
- **Splash:** `SplashScreen.tsx` (siyah + teal wordmark + shimmer); manifest `background/theme_color` → `#000000` (eskiden teal → açılış yeşildi).

## 2026-06-13 — Dashboard sıfırdan + hesap kartları + ikonlu kategoriler

- **İşlem Ekle modalı:** Gelir solda/Gider sağda (mobil), hesap seçimi = kaydırılabilir gerçek kart görselleri (`Modal wide`).
- **Seçiciler (portal popover):** `DatePicker` (özel TR takvim), `CategoryPicker` (ikon+renk, satır-içi "Yeni kategori" formu, özel kategori düzenle/sil). Temel kategoriler düzenlenemez.
- **Kategori ikonları:** `lib/categoryIcons.tsx` mobil Ionicons → lucide (65 ikon). Özel kategoriler localStorage (cihaz-yerel).
- **Hesaplar:** `AccountCard` 6 gradient tema (`lib/cardThemes`), PARANER wordmark, em-tabanlı ölçek (`1cqw`) → her boyutta tutarlı. Form: tema seçici + tür segmenti + para birimine göre IBAN/routing.
- **Genel Bakış → dashboard:** 4 KPI + sparkline, Shopify-tarzı `LineChart` (saf SVG, hover tooltip), Kartlarım, Kategori `Donut`, zengin Son İşlemler. Tek render (1 transactions + 1 bank_accounts, son 6 ay).
- **Menü temizliği:** sayfaya giden tekrarlar kaldırıldı (Gelir/Gider Özeti, Kasa & Banka, KDV Beyanname; Teklif×2 → tek Teklifler). Panel içeriği tam genişlik.

## 2026-06-12 — Cüzdanım canlandı (Truncgil) + sidebar + çoklu para birimi

- **Cüzdanım tam işlevsel:** `lib/market.ts` Truncgil `today.json` server fetch (5dk cache, mobil `marketService` paritesi). `lib/assets.ts` katalog + değerleme. `CuzdanimClient`: portföy şeridi (Değer/K-Z/Bugün) + dağılım donut + varlık listesi. İşlemler (mobil `savingsStore`): ekle = ağırlıklı ort. maliyet; sat = tam→sil / kısmi→koru; `savings_asset_movements` hareket kaydı (ortak tablo). Gerçek altın görselleri (`public/gold/`). Varlık türü dikey açılır seçici.
- **Sidebar:** işletme üst menüsüne Cüzdanım eklendi (çekirdek: Genel Bakış·İşlemler·Hesaplar·Cüzdanım).
- **İşlemler:** çoklu para birimi çipi (yalnız >1 para birimi varsa görünür).
- **Workflow notu:** Mehmet dev'den kontrol ediyor → her değişikliği deploy etme, push "işi bitir"de.

## 2026-06-11 — İşlemler (düzenleme/transfer/detay) + hesap ekleme + sol menü + işletme sayfaları

- **İşlemler:** düzenleme (bakiye mutabakatı), ay filtresi (`<input month>` → o ayı DB'den), **hesaplar arası transfer** (`transfer_out/in` + opsiyonel `transfer_fee`, ortak `transfer_group_id`, farklı para birimi engelli; transfer satırı düzenlenemez, silince çift bacak birlikte gider).
- **İşlem detay paneli** (sağ yüzen kart, Esc/X): tutar/kategori/tarih/**saat**/hesap/**eklendiği yer**/not. `transactions.source` kolonu eklendi (web `'web'` yazar; boş→Mobil; ileride `'accountant'`).
- **Dosya/fiş ekleme:** sürükle-bırak (max 3, PNG/JPG/PDF), mobil ile ortak `receipts` bucket + kolonlar. PDF yanlış content-type'la saklanmışsa blob ile telafi.
- **Hesap ekleme (max 3):** Sidebar switcher'da Bireysel/İşletme + ad → `createAccount` (mobil `createProfile` alan seti) → otomatik geçiş. **Liquid-glass geçiş animasyonu** (PARANER wordmark soldan sağa yeşile dolar). İşletme webde direkt açılıyor (Stripe/trial sonra).
- **Sol menü revizyonu:** ayrı yüzen liquid-glass bar, aç/kapa kol (tık + sürükle-snap), iç scroll + mask-image fade, **Lucide ikonlar** (tüm site), işletme accordion (`businessMenu.tsx`, mobil paritesi 7 bölüm), Favoriler (localStorage).
- **İşletme sayfaları çalışır (şemaya dokunmadan):** Stok/Ürünler, Çalışanlar, Finans (düzenli-ödeme/çek-senet/borç-alacak/bütçe/kdv), Müşteriler (veresiye/mutabakat/vade), Faturalar (`?type` filtre + Teklifler kalemli + düzenli-fatura), Raporlar (nakit-akışı/gelir-gider+CSV/kar-zarar/kdv/vergi-takvimi). 30 öğe çalışır, 6 "Yakında" (OCR/döviz API/PDF/SGK/e-Defter/Muhasebeci).
- **İşletme Ayarları** → Ayarlar sayfasına (Fatura Numaralandırma, Bildirim, Yedek/Export, Roller-yakında).
- **Mobil Claude'a:** `source` mobil de yazsın; mobil transfer silme bug (tek bacak); mobil PDF content-type bug.

## 2026-06-10 — Panel altyapısı (sıfırdan) + Stripe-tarzı redesign + performans

- **Altyapı:** `@supabase/ssr` + `supabase-js`, `.env.local` mobil ile aynı proje (`oqhonmmbcqrkcaoijgnb`, `NEXT_PUBLIC_`). `lib/supabase/` (client/server/cookieDomain `.paraner.com`). `proxy.ts` (Next 16 middleware→proxy: host bazlı yönlendirme + auth guard). DNS: `app` CNAME → Vercel. Canlı OK.
- **Panel modülleri:** Genel Bakış (KPI), İşlemler, Hesaplar, Cariler, Faturalar (KDV otomatik + sayaç), Cüzdanım (v1 salt-okunur), Ayarlar. `lib/format` + `lib/categories` (mobil paritesi).
- **Stripe-tarzı redesign (koyu+teal):** token katmanı (anlamsal renkler/skala), ortak `components/ui/` (Modal/PageHead/Field/Avatar/Sparkline). Sparkline + metrik düzeni, gruplu/daralabilir Sidebar (localStorage), filtre çipleri, profil/işletme logosu (`avatar_url`/`company_logo_url`), PARANER wordmark.
- **Performans:** `loading.tsx` iskelet, aktif profil React `cache()` tek sorgu (`lib/supabase/profile.ts`), gereksiz ikinci `getUser()` kaldırıldı.
