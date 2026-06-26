# DAILY LOG — paraner-web

## 2026-06-26 — Auth sol panel: markaya özel cube videosu (Three.js yerine)

Mehmet 3D modelci arkadaşına markaya özel bir küp videosu yaptırdı (kendi/özgün varlık). Desktop sol panele bu video konuldu; interaktif Three.js sahnesi bırakıldı.

- `public/paraner-cube.mp4` (ffmpeg `+faststart`, 400×400, ~670KB) + `public/paraner-cube.jpg` (poster).
- `AuthCube3D.tsx` sadeleşti: Three.js kaldırıldı → `<video>` (autoplay/loop/muted/playsInline, poster). `.auth-cube-video` `object-fit:cover` ile paneli kaplar (siyah zeminle dikişsiz). ≤1024px panel zaten gizli → masaüstüne özel.
- `three` artık **kullanılmıyor** (import yok → bundle'a girmez); package.json'da duruyor, istenirse kaldırılır.
- ⚠️ **Çözünürlük notu:** video 400×400 → büyük/retina ekranda yukarı ölçeklenince yumuşak görünebilir; net olması için ≥1000×1000 export önerildi.
- tsc + build temiz (44/44). CDP ile desktop render doğrulandı (video panele oturuyor).

---

## 2026-06-26 — Auth küp v4: Resend hamle sistemi + yüz-başına malzeme + filmik ışık

Mehmet: Resend yavaş döner ama bazen ANİ hızlı hamle yapar — alt+üst katmanları TERS yönde çevirir, bazen bir tarafı 2 kez (180°). Malzeme yüz-başına olsun (karbon↔gri↔parlak net), ışık vuruşu üst düzey olsun.

- **Hamle motoru (Resend tarzı):** tek dış katman **90°** (%45) · **180°** iki-kez (%23) · **ALT+ÜST ters yön** ani/hızlı kesme (%32, dur 0.42s — çarpıcı). Çok-parçalı hamle: aynı eksende layer +1 ve −1 ayrı pivot, zıt açı, eşzamanlı. Bitince bake (round). Ara süre çoğunlukla sakin (0.7–2.4s), %22 art-arda seri. Küp DAĞILMAZ.
- **Yüz-başına malzeme:** `RoundedBox`→`BoxGeometry` (6 yüz grubu → materyal dizisi). Havuz: parlak siyah · satin siyah · karbon (bumpMap nokta) · metalik gri · delikli ızgara (bumpMap iri delik); her yüze rastgele → güçlü kontrast.
- **Filmik ışık:** `ACESFilmicToneMapping` (exposure 1.15) + güçlü key + arka-yan **rim** (hafif teal, kenarlar parlar) + ön specular point + marka teal point + düşük ambient + RoomEnvironment (envMapIntensity yüz-bazlı). Metal yüzeylerde güçlü vuruş.
- **Para birimleri:** her yüz değil, ~%32 yüzde ($ € £ ₺ ¥, kalın 900, metalik gri) → doku ile harman.
- Doğrulama: CDP kareleri — yüz çeşitliliği + ışık vuruşu belirgin, semboller seyrek/karışık, küp katı kalıp katmanları çeviriyor. tsc + build temiz (44/44).

---

## 2026-06-26 — Auth küp v3: Rubik dönüş (dağılma yok) + para birimi sembolleri + karbon/gri karışım

Mehmet (canlı): dağılma istemiyor — küp **kendini çevirsin** (Resend'deki katman dönüşü gibi, küp formu korunur). Harfleri kaldır → **para birimleri** ($ € £ ₺ ¥), kalın. Küp **siyah + karbon + metalik gri karışım**, semboller her yüzde, metalik gri/karbon ton.

- **Morph değişti:** scatter (dağıt/topla) KALDIRILDI → **Rubik katman dönüşü** (pivot + `attach` ile dış katman seçip 90° döndür, `easeInOut`, bitince konumları yuvarla/bake; ~0.7s twist + 0.45-1.15s ara). Küp hiç dağılmaz, kendini çevirir. reduced-motion → kapalı.
- **Harfler → para birimleri:** P/A/R/N/E kaldırıldı; `$ € £ ₺ ¥` (kalın `900` font, ₺ dahil render), her dış yüzde rastgele (karışık), eşit boyut; sembol malzemesi metalik gri (`0x5a5f66`) → işlemeli görünüm.
- **Karbon + gri karışım:** cubie başına rastgele malzeme havuzu — siyah parlak (`0x111214`) · karbon (bumpMap nokta dokusu, `0x131418`) · metalik gri (`0x2b2e34`), ~%40/%40/%20.
- Doğrulama: CDP ile toplu kare (semboller her yüzde, karışık) + dönüş sonrası kare (katman çevrilmiş, dağılmamış). tsc + build temiz (44/44). (Not: tek seferlik "Turbopack 7 hata" build+dev eşzamanlı çalışınca çıktı; izole build temiz.)

---

## 2026-06-26 — Auth küp v2: morph (dağıt/topla) + işlemeli Paraner harfleri + sıkı/küçük

Mehmet geri bildirimi (canlı): kareler çok ayrık + büyük; dönerken şekilden şekile girsin (Resend'deki gibi kendi kendini parçalayıp toplasın); yüzlere Paraner harfleri (her yüz, karışık, metale işlemeli, küp rengiyle uyumlu, eşit boyut).

- **Sıkı aralık + küçült:** cubie `SIZE 0.97` (1.0 aralık → ince derz), grup `SCALE 0.78`, kamera biraz geride.
- **İşlemeli harfler:** her cubie'nin DIŞ yüzüne, P/A/R/N/E'den rastgele (karışık), eşit boyutlu harf → `PlaneGeometry` + `CanvasTexture` alphaMap, hafif açık metal renk (`0x3c4046`, metalness 0.7) → küple uyumlu "işlemeli" görünüm. Harf düzlemleri cubie'nin çocuğu → morph'ta birlikte hareket eder. (RoundedBox tek-materyalli olduğu için per-face materyal yerine decal-plane yöntemi.)
- **Morph (Resend tarzı):** Rubik dönüşü DEĞİL — küp periyodik olarak **dağılır** (cubie'ler dışa açılır + rastgele konum/rotasyon = süzülen bulut) ve **yeniden toplanır** (temiz harfli küp). Her cubie hedefe yumuşak `lerp/slerp` ile yaklaşır (`a = 1-e^(-dt·2.6)`), faz ~2.2s topla / ~2.6s dağıt. `prefers-reduced-motion` → kapalı.
- TS: `Clock` (deprecated) yerine `performance.now()` delta; `import type { Group }`.
- Doğrulama: CDP (swiftshader) ile toplu (harfli temiz küp) + dağınık (süzülen parçalar) kareleri alındı; harfler eşit/okunur, karışık. Gerçek GPU'da 60fps akıcı. tsc + build temiz.

---

## 2026-06-26 — Auth sol panel: interaktif 3D küp (Resend tarzı) + koyu degrade arka plan

Mehmet Resend'in banner'ındaki sürüklenebilir 3D küpü istedi. (Resend'in `cube.mp4`'ü telifli → birebir ALINMADI; bize ait özgün Three.js sahnesi yapıldı, aynı "tut-döndür" deneyimi.)

- **`three` kuruldu** (^0.185). **`AuthCube3D.tsx`** (yeni, client): vanilla Three.js + OrbitControls + RoomEnvironment (HDR'siz metal yansıması) + RoundedBoxGeometry. **3×3×3 koyu metalik küp kümesi** (yuvarlatılmış kenar, `metalness 0.96 / roughness 0.34`), nötr key/fill ışık + **hafif teal rim** (marka). **Mouse ile tut-döndür** (OrbitControls, zoom/pan kapalı) + boşta yavaş **otomatik dönüş**; `prefers-reduced-motion` → otomatik dönüş kapalı (yine sürüklenir). three **dinamik import** → panel bundle'ı etkilenmez. ResizeObserver + tam cleanup (dispose). Sol panel zaten ≤1024px gizli → küp masaüstüne özel; WebGL yoksa CSS degrade görünür kalır.
- **`AuthSideVideo.tsx` silindi** (+ `.auth-visual-video`/`.auth-visual-overlay` CSS kaldırıldı); `giris/page.tsx`+`kayit/page.tsx` artık `AuthCube3D` render eder. (Eski `paraner-auth-bg.mp4/.jpg` public'te kaldı, kullanılmıyor.)
- **Resend tarzı koyu arka plan:** `.auth-page` düz siyah yerine yumuşak degrade (üst-sağdan hafif ışık + alttan faint teal); `.auth-cube` küpün arkasında yumuşak spotlight + teal glow + koyu zemin (WebGL canvas alpha ile üstüne biner).
- Doğrulama: CDP (swiftshader WebGL) ile `/giris` render'ı — küp çiziliyor (`.auth-cube canvas` mevcut), kompozisyon Resend havasında. tsc + `next build` temiz.

---

## 2026-06-26 — Primary buton (Devam Et) premium hâle getirildi

Mehmet "gölgeli güzel buton" istedi; 21st.dev Magnetize (mıknatıs+parçacık) referansına baktık ama finans tonuna fazla oyuncak → daha rafine yönde karar verildi. `.btn-primary`: teal yumuşak **glow gölge** + üstte **cam iç-parlaması** (inset highlight) + hover'da **yukarı kalkma** & glow artışı + **active oturma** + disabled gölgesiz. Ayrıca hover'da butonun üstünden **bir kez geçen ışıltı** (`::before` shine sweep, marka logosu shine ile uyumlu; `overflow:hidden` köşe kırpar; `prefers-reduced-motion` kapalı). CDP ile rest/hover/shine frame doğrulandı (metin okunur). Tüm primary butonları (auth + panel) etkiler — tutarlı. Commit: `9949b95` (glow) + `e8ede40` (shine).

---

## 2026-06-26 — Şifre sıfırlama: implicit flow (pkce_ token bug fix) + markalı mail

Canlı test: yeni markalı şablonla Gmail phishing uyarısı KALKTI. Ama e-posta linki `token_hash=pkce_...` ile geliyordu → `verifyOtp` pkce_ token kabul etmez (link "geçersiz" olur + sadece aynı tarayıcı). **Fix:** `createClient({implicit:true})` eklendi; `handleForgotPassword` reset mailini implicit flow ile gönderiyor → e-postadaki {{ .TokenHash }} DÜZ token_hash olur → /sifre-sifirla verifyOtp çalışır, farklı cihaz/tarayıcıda da. Logo URL canlıda 200 (image/png) — broken ikonu önceki flagged maillerin Gmail görsel-engeli cache'i, temiz mailde düzelir. Kalan manuel: Supabase mail Subject'ini Türkçe yap (gövde ayrı, konu hâlâ "Reset Your Password").

---


## 2026-06-26 — Şifremi unuttum akışı (mobil paritesi)

Mehmet "A) gerçek sıfırlama" seçti.

- **`AuthForm`:** şifre giriş modundaki "Şifremi unuttum" linki → buton; `resetPasswordForEmail(email, { redirectTo: origin+'/sifre-sifirla' })` (e-posta önce girilmeli) → başarı mesajı (`.auth-msg.success`). `Link` importu kalktı. Mod/pwMode değişiminde `resetMsg` temizlenir.
- **`/sifre-sifirla` (yeni):** `app/sifre-sifirla/page.tsx` (noindex) + `app/components/ResetPasswordClient.tsx`. Recovery oturumunu kurar — **PKCE `?code`** (`exchangeCodeForSession`) veya **`token_hash`+`type`** (`verifyOtp`) veya detectSessionInUrl auto-takas (1.2s bekle + `getSession`) → hepsine dayanıklı, `onAuthStateChange(PASSWORD_RECOVERY)` da dinlenir. Sonra yeni şifre formu (min 6 + eşleşme) → `updateUser({password})` → 1.5s sonra panele (`app.paraner.com`). Hâller: doğrulanıyor / form / başarılı / geçersiz-link. Koyu kart (`.reset-card`, surface-modal), teal wordmark (linkli+ışıltılı), pill inputlar.
- **`proxy.ts`:** `PUBLIC_PATHS`'e `/sifre-sifirla` eklendi (app domaininde de korumasız). Pazarlama domaininde zaten korumasız.
- ⚠️ **Supabase config (kod DEĞİL):** Auth → URL Configuration → Redirect URLs'e `https://paraner.com/sifre-sifirla` (+ dev `http://localhost:3137/sifre-sifirla`) eklenmeli; yoksa Supabase redirect'i reddeder ve link çalışmaz. Reset e-posta şablonu Supabase'de varsayılan geliyor.

CDP ile geçersiz-link + form (enjekte) hâlleri doğrulandı. tsc + build temiz (`/sifre-sifirla` ○ static).

---

## 2026-06-26 — Auth wordmark: paraner.com linki + ışıltı animasyonu (paraner-app ile aynı)

- **Logo paraner.com linki:** Auth wordmark `<Image>` → `<a href="https://paraner.com">` (aria-label'lı). Image importu kaldırıldı.
- **Üstünden geçen ışıltı (shimmer):** paraner-app `components/AnimatedWordmark.tsx` efekti web'e taşındı — wordmark PNG **maske**, teal taban + hareketli beyaz parıltı `::after` (`auth-wordmark-shine`, 2.4s, 1.4s sweep + bekleme; `prefers-reduced-motion` kapalı). Web'deki `.splash-word` ile aynı teknik. CDP ile doğrulandı (teal maske düzgün, ışık harflerin üstünde görünüyor; href=paraner.com, `<a>` 152×31). tsc + build temiz.

**Şifremi unuttum — durum tespiti (Mehmet ile akışı konuşulacak):** Akış **hiç yok**. `Şifremi unuttum` linki sadece `/giris`'e gidiyor (no-op). Şifre sıfırlama route'u YOK, `resetPasswordForEmail`/`updateUser`/recovery işleme YOK, `auth/callback` yalnız OAuth `code` işliyor (recovery değil). Not: ana giriş zaten **şifresiz OTP** (e-posta kodu); şifre sadece fallback. Seçenekler Mehmet'e sunuldu (bkz. sohbet).

---

## 2026-06-26 — Auth: label→placeholder (input içi) + geçiş animasyonu + titreme fix

Mehmet canlı geri bildirim (2. tur):

1. **Etiketler input içine taşındı:** `<label>` üst etiketleri kaldırıldı, metin artık input içinde **placeholder** ("Ad Soyad", "E-posta", "Şifre") + erişilebilirlik için `aria-label`. (Bir önceki turda placeholder'ları kaldırmıştık; Mehmet bu sefer metni input İÇİNDE istedi.)
2. **Giriş ⇄ Kayıt geçiş animasyonu (Dribbble signup tarzı):** head + form blokları `key={mode}` ile sarıldı → her geçişte **yumuşak kayıp belirme** (`authInFwd/Back`, 0.40s, kayıt sağdan / giriş soldan; `prefers-reduced-motion` kapalı). Switcher thumb zaten CSS transition ile kayıyordu.
3. **Sekme geçişindeki TİTREME giderildi:** Kök sebep — `SocialAuth` `useEffect` deps'inde `mode` vardı → her mod değişiminde GIS **yeniden init** olup Google butonunu yeniden render ediyordu (titreme). Fix: GIS **bir kez** init (deps `[handleCredential]`, context için `modeRef`), `SocialAuth`'a sabit `key="social"` (geçişte remount YOK), ve animasyon DIŞINDA tutuldu (head/form animasyonlu, social sabit) → Google/Apple bloğu hiç titremiyor.

Doğrulama: CDP ile giriş + mid-transition (anim class `auth-anim auth-anim-fwd` doğrulandı) + kayıt screenshot; placeholder'lar input içinde, Google/Apple geçişte sabit. tsc + `next build` temiz (43/43). dev log temiz.

---

## 2026-06-26 — Auth canlı geri bildirim turu (placeholder + Google/Apple eşit + geçiş kayması + OTP caret)

Mehmet canlıda baktı, 4 düzeltme:

1. **Input placeholder'ları kaldırıldı** (`AuthForm.tsx`): "Adın Soyadın", "ornek@eposta.com" (×3), "••••••••" → temiz inputlar (etiketler üstte kalıyor).
2. **Google + Apple birebir eşit + aralarında boşluk:** Sorun — GIS kişiselleştirilmiş butonu kendi container genişliğini ele geçirip Apple'dan farklı oluyordu (CDP ölçüm: gsi 221 vs apple 263). Çözüm: `.gsi-wrap`+`.btn-social` → `flex: 0 0 calc(50% - 8px)` (tam %50, gap 16px), GIS butonu artık container'ın gerçek genişliğine render edilir (`btnRef.clientWidth`; eski `(pw-16)/2` stale ölçümle şaşıyordu). Apple `height:44px`→`min-height:44px` + `.social-auth align-items:stretch` → Apple, GIS yüksekliğine uyar (eşit ebat). gap 12→**16px**. Ölçüm sonrası: **gsi 242 = apple 242, ikisi de 44px**.
3. **Giriş↔Kayıt geçişinde dikey kayma giderildi (kalıcı):** Önceki min-height(720) fix'i canlıda yetmiyordu çünkü GIS kişiselleştirilmiş butonu fallback'ten uzun → kayıt içeriği rezervi aşıp dikey-ortalı blok yeniden ortalanıyordu. **Sağlam çözüm:** ortalama YOK — `.auth-card-form justify-content: flex-start`, `.auth-split-form` min-height kaldırıldı, `padding-top: clamp(40px,14vh,150px)` → wordmark/switcher her modda SABİT konumda (CDP: wordmarkTop=106 giriş=kayıt), içerik aşağı uzar. 14vh üst boşluk giriş formunu büyük ekranda görsel olarak ortalı gösterir, kısa ekranda taşmaz.
4. **OTP "Kodu gir" — aktif hücre belirsizdi + caret yoktu:** Kök sebep — açık temada `.auth-card-form .otp-cell` (gri kenar) `.otp-cell.active` teal kenarını eziyordu (eşit specificity, sonra geliyor) → aktif hücre gri görünüyordu. Fix: `.auth-card-form .otp-cell.active/.filled` teal override (specificity 0,0,3) + aktif hücreye **yanıp sönen teal caret** (`::after` + `@keyframes otpCaret`, `prefers-reduced-motion` kapalı) + teal halka (box-shadow). Artık imlecin nerede olduğu net.

Doğrulama: CDP (DevTools cihaz metrikleri) ile masaüstü 1600×1000 giriş+kayıt + mobil 390 + enjekte edilmiş OTP adımı screenshot'landı. tsc + `next build` temiz (43/43).

---

## 2026-06-26 — Auth kartı büyütüldü + ölü kod temizliği

**Ölü kod temizliği (GOREVLER bekleyeni):** `app/components/AuthVisual.tsx` silindi (hiçbir yerden import edilmiyordu; sol panel `AuthSideVideo`'ya geçeli beri ölüydü). `globals.css`'ten ilgili ~50 satır kaldırıldı: `.av-brand/.av-glow/.av-noise/.av-slogan/.av-cards`, `.fin-card`, `.fc-*` + yalnız bunlara ait `finFloat/finShimmer/avGlow` keyframe'leri + `prefers-reduced-motion` satırı. **Kullanılan** video stilleri (`.auth-visual`, `.auth-visual-video`, `.auth-visual-overlay`) korundu. grep ile sıfır kalıntı doğrulandı.

**Giriş/kayıt kartı büyütüldü (Mehmet isteği — "her cihazda sayfaya tam oturmasın ama büyük olsun"):** [globals.css](app/globals.css) `.auth-card` sınırları **`1440×820` → `1680×1000`**. Nefes payı `.auth-page` padding'inden (`clamp(20px,2.6vw,52px)`) korunuyor → kart ekranı doldurmaz, ortalı, bu sınırlara kadar büyür. Özellikle büyük/4K ekranda kart artık çok daha dolgun. Form içeriği max-width 620px aynı (sağ panelde ferah boşluk — premium his).

**Doğrulama (gerçek render):** headless Chrome (`--headless=new`) ile masaüstü 2560×1440 + 1440×900, giriş **ve** kayıt modu → kart büyük, kenarda nefes payı, taşma/dikey zıplama yok. Mobil için CLI screenshot'ı yanıltıcı "yatay taşma" gösterdi (eski headless viewport'u yanlış uyguluyor); **CDP cihaz metrikleriyle** (390×844, mobile:true) ölçülünce `innerWidth=scrollWidth=390`, `.auth-card=390`, `.social-auth=column` → taşma YOK, mobil zaten sağlam. tsc + `next build` temiz (43/43).

---

## 2026-06-25 — Auth switcher dikey zıplama (layout shift) fix

**Belirti (kullanıcı):** `/giris`'te üstteki Giriş/Kayıt switcher'a basınca form "yukarıdan bir şey iniyormuş gibi" hızlıca/hafifçe zıplıyordu.
- **Kök sebep:** Masaüstünde form alanı (`.auth-card-form` + `.auth-split-form`) dikey ORTALI; giriş (~564px) ile kayıt (~696px — ekstra Ad Soyad alanı + şartlar metni) farklı yükseklikte → mod değişince ortalanan blok yeniden hizalanıp ~75px DİKEY zıplıyordu (switcher in-place çalışıyor, navigasyon/remount değil; saf CSS layout shift).
- **Fix (`app/globals.css`):** `.auth-split-form` → **`min-height: min(720px, 100%)`** (en uzun moda göre sabit yer ayır; `min(...,100%)` kapağı kısa laptop ekranında taşmayı önler) + `justify-content: flex-start` (içerik üstten hizalı) → wordmark/switcher/başlık iki modda da AYNI konumda kalır, zıplama biter; blok yine kartta ortalı görünür. `.auth-card-form` → `justify-content: safe center` (içerik karttan uzunsa üstten KIRPILMAZ — sağlamlık). Mobil (≤1024) `min-height: 0` ile sıfırlandı (zaten tek sütun + üstten hizalı, etkilenmez).
- **Doğrulama:** localde (`next dev` :3137) headless Chrome 1440×900 ile iki modun öncesi/sonrası screenshot'ı alındı → sonrası wordmark her iki modda aynı hizada, geçişte zıplama yok. tsc temiz → push → Vercel.

## 2026-06-25 — Giriş/kayıt (auth) redesign: wordmark + sürüklenebilir switcher + sol panel finans videosu

**Hedef:** `/giris` + `/kayit` sağ formunu yeniden düzenle; sol siyah panele finans videosu. Önce sol panel çerçeve/köşe işi, sonra içerik.

- **Sol panel köşe/çerçeve:** Kart artık tek parça **4px beyaz çerçeve** (`.auth-card` border, sol+sağ kesintisiz). Sol panel (`.auth-visual`) = `var(--bg)` (arka planla AYNI siyah, tek değişkenden değişir), sağ köşeleri yuvarlatıldı (`border-radius: 0 24px 24px 0`); kart içi `#fff` olduğundan yuvarlatılan köşeden beyaz görünür (siyah panel 4 köşesi yuvarlak durur).
- **Birleşik `app/components/AuthForm.tsx`** (YENİ): `/giris` ve `/kayit` artık AYNI bileşeni farklı `initialMode` ile render eder (`giris/page.tsx` + `kayit/page.tsx` = ince sarmalayıcı). Mod **yerinde** değişir (sayfa yenilenmez), `history.replaceState` ile URL de /giris↔/kayit güncellenir. Tüm mantık korundu: şifresiz OTP, şifre fallback (giriş), Google GIS, OAuth `?code` yakalama, `?closed/error/signedout` mesajları, kayıt OTP.
- **Üstte Paraner wordmark** (`/paraner-wordmark.png`, ortalı 152×31, teal).
- **iOS UISegmentedControl tarzı switcher** (`AuthSwitch`, AuthForm içinde): Giriş Yap | Kayıt Ol; **tıkla veya sürükle** geçiş (pointer events, tap pozisyona göre, drag eşiği 3px), thumb CSS transition ile kayar. **Premium:** animasyonlu teal gradient çerçeve (mask halka `switchBorder` 4.5s), yumuşak gölge, yaylı geçiş. Genişlik = form içeriği.
- **Alttaki "zaten hesabın var mı / yok mu" linkleri KALDIRILDI** (switcher onların yerine geçti).
- **Sol panel finans videosu** (`app/components/AuthSideVideo.tsx`, YENİ): Mixkit ücretsiz forex klibi (koyu/teal, lisans: ticari+atıfsız), web için sıkıştırıldı **6.8MB→606KB** (`public/paraner-auth-bg.mp4`, muted/loop/autoPlay/playsInline + faststart) + poster (`public/paraner-auth-bg.jpg`). `object-fit:cover`; panel `overflow:hidden`+yuvarlak köşeli → video köşelere kırpılır. Üstüne koyu→teal overlay (parlama yumuşar).
- **Google + Apple YAN YANA** (`SocialAuth.tsx` + `.social-auth` flex row wrap): eşit yarımlar, tam pill; etiketler kısaltıldı (Google/Apple), GIS genişliği konteynerin yarısına göre hesaplanır (`window.innerWidth<=420` → alt alta). Input + Devam Et butonu da tam pill (999px). OTP buton metni **"Devam Et"**.
- **Kart sabit boyut** (`.auth-card` `max-width:1440px` `max-height:820px`, ortalı) → her ekranda (4K/MacBook/telefon) AYNI kompozisyon (önce 1080×720 yapıldı, "yapışık" deyince büyütüldü). Tek-sütun eşiği 900→**1024px**; form içeriği `max-width:620px`.
- `globals.css` auth bölümü elden geçti. tsc + `next build` temiz. Kod commit `379f184` → push → Vercel. Bu doc commit'i ayrı.

**Not (kalan/ölü kod):** `app/components/AuthVisual.tsx` + `.av-glow/.av-noise/.av-cards/.fin-card/.fc-*` CSS bloğu artık **KULLANILMIYOR** (sol panel videoya geçti; AuthVisual oturum öncesinden beri import edilmiyordu) → ileride temizlenebilir. **Şifremi unuttum** hâlâ işlevsiz (link /giris'e gider). Google GIS butonu yarım genişlikte kendi metnini ("Continue with Google" / kişiselleştirilmiş hesap) gösterir → Apple ile birebir aynı yazı değil (kabul edildi; istenirse ikon-only yapılır).

---

## 2026-06-20 — favicon.ico (Google Search Console fix) + acilis kalıntı temizliği

**Sorun:** `paraner.com/favicon.ico` 404 dönüyordu → Google klasik favicon yolunu bulamıyordu (Search Console favicon uyarısı).

- **`app/favicon.ico`** (yeni): çok-boyutlu (16/32/48) ICO, mevcut teal P ikonundan `_gen-icons.js`/sharp ile üretildi. Next.js bunu `/favicon.ico` (200) olarak sunar → Google klasik yolu bulur. **Canlı doğrulandı:** `https://paraner.com/favicon.ico` → HTTP 200, `image/vnd.microsoft.icon` (önce 404'tü).
- **`app/acilis/` silindi:** vazgeçilen boot splash kalıntısı (SW+boot.html hop'u zaten `56eb6ad`'de kaldırılmıştı). Hiçbir yerde referansı yoktu (grep temiz).
- **`_gen-icons.js`** gitignore'a eklendi — yerel üretim scripti (kaynak `/tmp/paraner-icon-backup/`), repoya girmedi.
- Commit `1fb78a0` → push → Vercel deploy → canlı.

**Hatırlatma (kod işi DEĞİL):** Google favicon'u birkaç gün/hafta içinde tazeler. İstenirse Search Console → URL denetimi → paraner.com → "Dizine eklenmeyi iste".

---

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
