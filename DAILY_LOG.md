# DAILY LOG — paraner-web

> **Bu dosya SADECE bu haftanın işini + kalıcı uyarıları tutar.** Hafta dolunca entriler
> proje DIŞINDAKİ arşive taşınır → `~/Developer/Paraner/daily-log/web/DAILY_LOG.md`.
> **Geçmişi okumak gerekince oradan oku.** Tam ayrıntı git geçmişinde. (Aynı sistem paraner-app'te.)

---

## ⚠️ Hâlâ geçerli uyarılar / config / bekleyen testler

- **iOS mobil auth dersleri** (mobil auth'a tekrar dokunulursa, adım adım + Mehmet onayıyla): `background-attachment:fixed` iOS'ta BOZUK; sabit bg için `position:fixed` katman ama o da klavyeyle yatay kayma yapar; `dvh` klavyede değişken → `svh` daha stabil; input `font-size<16px` → odakta zoom; CSS `mask`+`filter` Safari'de görünmezlik (bilinen bug). Sağlam "fixed bg + scroll + klavye" muhtemelen `visualViewport` JS API gerektirir.
- **Supabase config (kod değil):** Şifre sıfırlama için Auth → URL Configuration → Redirect URLs'e `https://paraner.com/sifre-sifirla` (+ dev `http://localhost:3137/sifre-sifirla`) eklenmeli, yoksa link reddedilir.
- **`FAREWELL_HOOK_SECRET`** Supabase Secrets'ta + DB function gövdesinde; repo'da YOK (placeholder).
- **Canlı göz kontrolü bekleyenler:** yalnız mobil↔web ÇAPRAZ SENKRON (Cüzdanım, hesap kartları, işlemler, özel kategoriler); onboarding tam akış (panel-içi); Google One Tap (gerçek Gmail oturumuyla). Kod tarafı doğrulandı.
- **Eski/ölü asset'ler (temizlenebilir):** `public/paraner-auth-bg.mp4/.jpg`, `paraner-cube.mp4/.jpg` (artık referans yok). `public/auth-bg.webp` = resend.com/signup görseli (Mehmet verdi) → lansmanda telifsiz muadille değiştirilebilir.
- **PANEL TEST HESABI (kalıcı):** `admin@paraner.com` — canlıda oturum gerektiren doğrulama/ölçüm bu hesapla yapılır. **Şifre repoya YAZILMAZ** (bu repo herkese açık). ⚠️ Headless giriş her seferinde **yeni cihaz bildirimi maili** tetikler → puppeteer'da **kalıcı `userDataDir`** kullan. ⚠️ Supabase sızmış-şifre koruması açık. ⚠️ Şifre HER ZAMAN oturumdaki hesaba kurulur (modal hedef e-postayı yazıyor).
- **Panel hızı kuralları (yeni modülde ZORUNLU, CLAUDE.md'de de var):** her mutasyondan sonra `router.refresh()`; server page sorguları `Promise.all`; listelerde `.limit()`. ⚠️ Prefetch DEV'de kapalıdır → hız yalnız prod'da ölçülür.

---

## Bu hafta (2026-07-23 →)

### 04.08 (3) — Mobilde hazır 4 sayfa web'e taşındı
Mehmet: *"telefonda hazır olanı taşıyalım, sayfalar web'de de hazır olsun; düzenlemeleri sonra."*
Dördü de mevcut tabloları kullanıyor, **DB şemasına dokunulmadı.**
- **`/panel/doviz-altin`** (mobil `exchange.tsx`) — döviz + altın listesi, alış/satış, günlük
  değişim %, **çevirici** (iki yönlü). Altyapı zaten vardı: `lib/market.ts` + `lib/assets.ts`.
  Fiyat SUNUCUDA çekiliyor, Next fetch 5 dk cache. Altın görselleri `public/gold/`.
- **`/panel/kdv-beyanname`** (mobil `vat-declaration.tsx`) — ay ay, %1/%10/%20 kovalarına ayrılmış
  hesaplanan/indirilecek KDV + net + ödenecek, "Özeti Kopyala". Kova mantığı mobille birebir.
- **`/panel/sgk`** (mobil `sgk-declarations.tsx`) — çalışan sayısı + toplam maaştan prim tahmini
  (işçi %14, işveren %20,5) + 6 maddelik bildirge takvimi (SGK, muhtasar, Ba/Bs, geçici vergi).
- **`/panel/pdf-rapor`** (mobil `pdf-report.tsx`) — aylık özet: gelir/gider/net, gider dağılımı,
  faturalar, işlemler. Mobil expo-print kullanıyor; **web'de tarayıcıdan yazdır → PDF kaydet**
  (ek bağımlılık YOK). `@media print` kabuğu gizliyor, yalnız `.pr-sheet` basılıyor.
- Menü: `businessMenu.tsx`'te 3 pasif satır aktifleşti + **KDV Beyanname Özeti YENİ satır** olarak
  eklendi (web'de menüde hiç yoktu). "SGK Bildirgeleri" → "SGK & Bildirgeler".
- ⚠️ **CLAUDE.md kural 4 GÜNCEL DEĞİL:** `CORE_PREFETCH` listesi 23.07'de canlı ölçümle
  KALDIRILMIŞ (`Sidebar.tsx:43-58` — peşin ısıtma sayfayı 4× yavaşlatıyormuş). Artık tüm linkler
  `auto` + `unstable_dynamicOnHover`. Yeni sayfalar bunu otomatik miras alıyor, **eklenecek liste yok.**
  CLAUDE.md'deki madde düzeltilmeli (dokunmadım, karar Mehmet'in).
- ✅ `tsc --noEmit` temiz · `npm run build` başarılı, dört rota da çıktı.
- ✅ **CANLIDA GÖZLE DOĞRULANDI** (`c7e2942`, Chrome eklentisiyle, admin oturumu açık):
  dördü de açılıyor, **hiçbirinde 404 / boş ekran / konsol hatası YOK** (konsol izleme kendi
  sondajıyla sınandı → "hata yok" bulgusu aracın sessizliği değil).
  · **doviz-altin:** veri DOLU (USD 47,5439 · Gram altın 6.211,56), çevirici canlı — 100 → 4.754,39 TL,
    250 → 11.885,98 TL, kurla birebir tutarlı.
  · **kdv-beyanname:** ay okları çalışıyor (Ağustos→Temmuz), "28 Eylül — 55 gün kaldı" bandı doğru.
  · **sgk:** 6 bildirge, geri sayımlar 04.08'e göre doğru (Geçici Vergi 17 Ağustos → 13 gün).
  · **pdf-rapor:** DOLU veriyle sınandı; Temmuz'da 7 işlem, Net = Gelir − Gider birebir tutuyor,
    gider yüzdeleri %100'e tamamlanıyor. Çok para birimli ayda TRY/USD seçici beliriyor.
- ⚠️ **Doğrulanamayanlar (dürüstlük):** KDV hesabı FATURALI bir dönemde denenmedi (test hesabında
  o aylarda fatura yok) · SGK prim tahmini GERÇEK maaşla denenmedi (kayıtlı çalışanın maaşı ₺0) ·
  "Yazdır / PDF Kaydet" çıktısı basılmadı (salt-okunur test).
- ⚠️ **Test sırasında Mehmet'in sekmesi çalındı:** sekmeyi öne alma `osascript` döngüsü
  "app.paraner.com içeren HER sekme" diyordu → Mehmet'in kendi panel sekmesi de kapsama girdi,
  ekranı 2 saniyede bir zıpladı. **Bu testte döngüye zaten gerek yoktu** (gizli sekme yalnız
  animasyon ölçümünü bozar, DOM okumasını değil). Durduruldu, memory'ye ders yazıldı.
- Not: **Fatura Numaralama zaten web'de varmış** (`AyarlarClient.tsx:222`), yeniden yazılmadı.
  Fiş/Makbuz Tara taşınmadı (Parla beynine bağlı, ayrı iş).

### 04.08 (2) — Panel analizi + fikir listesi (`docs/PANEL-FIKIRLERI.md`)
Mehmet "genel olarak neler eklenebilir, gerekirse yeni bölüm de açalım" dedi. Kod değişmedi.
- 🔴 **BULGU: WEB, MOBİLİN GERİSİNDE.** `businessMenu.tsx` tepesindeki *"mobil ile birebir
  tutarlı"* yorumu **artık yanlış.** Web'de "Yakında" görünen 4 özellik mobilde ÇALIŞIYOR:
  `receipt-scan` (619 satır) · `exchange` (409) · `pdf-report` (295) · `sgk-declarations` (288).
  Web'de **menüde bile olmayan** 2 tanesi mobilde var: `vat-declaration` (316) ·
  `invoice-numbering` (195).
- 🔴 **Fatura formu:** web `FaturaFormu.tsx` **253 satır**, mobil `invoice-create.tsx` **1256**.
  Mobilde kalem editörü + 9 birim + vade tarihi + ödeme hesabı + PDF + vergi no doğrulama VAR,
  web'de hiçbiri yok.
- Web'in ince modülleri (mobil karşılığı ~3×): kar-zarar 171 · kdv-raporu 149 · nakit-akisi 120 ·
  vergi-takvimi 97. **Raporlar + Vergi bloğu web'de neredeyse taslak.**
- **Yeni bölüm önerileri:** 📅 Takvim & Hatırlatmalar (veri hazır, en ucuz) · 👥 Ekip & Yetkiler
  (DB kararı ister) · 📈 İşletme Sağlığı (Parla ile, rakipsiz) · 🧾 e-Dönüşüm · 🏬 Depo & Lojistik ·
  🏦 Banka & Tahsilat. **e-Ticaret'e girmeme önerisi** (rakibin ₺1.100'lük paketi tamamen o, devasa).
- ⚠️ Kendi taslağımı denetlerken `RAKIP-defteran.md`'nin 13.07 tablosundan devralınan 2 madde
  geçersiz çıktı: **CSV içe aktarım ZATEN VAR** (`parseCsv` + `AyarlarClient.tsx:1616`,
  müşteri+ürün, kolon eşleştirmeli) ve **döviz/altın altyapısı hazır** (`lib/market.ts` +
  `lib/assets.ts`). İkisi de kaynaktan düzeltildi, defteran dosyasındaki satır işaretlendi.
- Not: `businessMenu.tsx:1` yorumu ("mobil ile birebir") **güncellenmedi** — kod değişikliği
  istenmemişti; düzeltilecekse ayrı iş.

### 04.08 — Rakip analizi: Bizim Hesap (`docs/RAKIP-bizimhesap.md`)
Mehmet yeni rakip buldu, 14 gün denemeye kayıt oldu. Kod değişikliği YOK, yalnız araştırma.
- **Profil:** 2015 kuruluşlu, 40-50 bin kullanıcı, **Finberg** (QNB Finansbank fintech kolu)
  yatırımlı. Tutar/tarih hiçbir yerde açıklanmamış — "büyük yatırım" iddiası **doğrulanamadı**.
- **Fiyat (ham HTML'den):** Temel ₺870+KDV/ay yıllık (₺10.440+KDV) · Tam ₺1.100+KDV/ay
  (₺13.200+KDV) · aylık ₺1.250/₺1.500. KDV dahil yıllık **₺12.528 / ₺15.840** = Paraşüt seviyesi.
  e-Fatura kontörü ayrı ve **açıkça yayınlanmış** (200→₺490 … 100.000→₺99.000).
- **Bizden fazlası 15 madde** — en ağırları: e-Fatura ailesi, **19 banka entegrasyonu**,
  80+ e-ticaret entegrasyonu, saha satış, üretim/reçete, çoklu depo+varyant, sınırsız
  kullanıcı+yetkilendirme, proje, şube, kredi takibi, POS, BA-BS, Excel import.
- 🔴 **En keskin açıkları KÂR-ZARAR RAPORU YOK** — 30+ raporları var, kâr-zarar yok; mağaza
  yorumlarında **5 yıldır** isteniyor, firma cevabı *"öyle bir özelliğimiz yok"*. **Bizde canlı.**
- **Mobil terk edilmiş:** iOS+Android ikisi de v1.0.168, iOS yayın tarihi 07.10.2024 → **~22 ay**.
  Play **3,22** (922 oy, 100 B+ indirme) · iOS **3,89** (257 oy).
- **Yorum analizi** (549 Play + 171 iOS, API'den çekildi): 1★ payı %17,5; yazılı yorum ortalaması
  3,96 ama genel puan 3,22 → **sessiz kitle daha kızgın**. 2025+ ortalaması **2,63**, yorum hacmi
  2017'de 112 → 2026'da 9. Şikâyet temaları: fiyat/zam %32 · destek %17 · donma %16 ·
  geliştirilmiyor %13 · oturum %10. Övgü: kapsam/fiyat oranı, basitlik, **web paneli** (mobil değil).
- **AI'ya kapalılar:** robots.txt'te ClaudeBot/GPTBot/Google-Extended hepsi `Disallow` +
  `ai-train=no`. Defteran'ın tam tersi → AI cevap motorlarında bedava boşluk bize kalıyor.
- **Düzeltilen eski kayıtlar:** `RAKIP-defteran.md` fiyat satırındaki "Bizim Hesap ~₺10.350"
  güncel değildi · `paraner-app/OZELLIK-ARASTIRMASI.md`'deki "BizMu — ucuz, mikro işletme" satırı
  **yanlıştı** (ne ucuz ne mikro), ikisi de kaynaktan düzeltildi.
- ✅ **PANEL CANLI GEZİLDİ** (Mehmet'in deneme hesabıyla, salt-okunur). Chrome eklentisi 4 denemede
  de bağlanmadı (sebep: **eklentinin Claude hesabı** oturumunkinden farklı — memory'ye yazıldı).
  Çözüm: ayrı bir Chrome örneği + DevTools Protocol; Mehmet giriş yaptı, gezinmeyi ben yaptım.
  - **Sol menü tam ağacı** (53 satır + gerçek URL'ler) dokümana alındı.
  - 🔴 **KÂR-ZARAR YOK — kesin teyit:** 4 rapor sayfası da açıldı, **29 raporun** hiçbirinde
    "kâr/karlılık" yok. En yakını "GELİR GİDER DURUMU" (kâr hesaplamıyor). Ana ekranda da yok.
  - Doğrulananlar: varyant, çoklu depo, Excel'den ürün yükleme, çok kullanıcı, proje bazlı takip,
    e-Fatura entegratörleri (eLogo/QNB eSolutions/Trendyol e-Faturam/Uyumsoft), bizimmuhasebeci.com
    (müşavir e-postayla davet, banka hareketlerini de görüyor), bizimsiparis.com (müşteri SMS-OTP).
  - **8 katmanlı vade takvimi** (üst barda rozetli) — bizim `vade`+`vergi-takvimi`den zengin, ucuz kopya.
  - 🔴 **Teknoloji tabanı eski:** ASP.NET WebForms (`bhlogin.aspx`, `__VIEWSTATE`) +
    **jQuery 1.11.1 (2014)** + Bootstrap 3 + Modernizr 2.8.3, React/Vue yok. Footer `2014, 2025`.
    → "yavaş", "sistem kapanıyor", "sürekli login" şikâyetleri bununla birebir uyumlu; mobilin
    güncellenmemesi de muhtemelen tercih değil **maliyet**. Bizim zaman avantajımız burada.
  - `Ekran Kilidi` bilerek açılmadı (oturumu kilitlerdi); kontör göstergesi bulunamadı
    (hesap henüz e-Fatura mükellefi değil).

### 01.08 (3) — Parla paneli: 16 düzeltme, hepsi CANLI ÖLÇÜMLE bulundu
Aynı gün, `270b2dc`'den sonra Mehmet canlıda gözle bakıp tek tek bildirdi; her biri
Chrome eklentisiyle ölçülüp düzeltildi. **Son hâl:**
- **Kabuk GERİ ALINDI** (`40e65a3`): üst bar tam genişlik + `fixed` denendi, sol menüyü
  73px aşağı itip barın SOLUNU boş şerit bırakıyordu (logo/hesap değiştirici aşağı
  kayıyordu). Mehmet: "sol panel tam olsun eskisi gibi". Kabuk eskisi gibi; Shopify
  düzenine geçen TEK ŞEY sağdaki Parla paneli.
- **Panel geometrisi:** sağ+alt kenara yapışık değil → sol köşeler 22px yuvarlak, altta
  12px boşluk (sol menüyle aynı hizada), sağ kenar pencereyle birleşik ve köşesiz,
  çizgi üst+sol+altta %28 beyaz.
- **`--parla-nav-w` = menünün SAĞ KENARI + daraltma düğmesi** (`.sidebar-toggle`
  `right:-14px` ile 14px dışarı taşıyor). Genişletilmiş panel menüden 12px ayrık.
- **Yazı alanı `--parla-max-w` (600) ile sınırlı, ORTALI — `.genis`E BAĞLI DEĞİL.**
  Sınıfa bağlıyken daraltmada bir karede 600→1700 fırlıyordu. Mesaj sütunu da 600
  (genişte satır başına 239 karakter ölçülmüştü, okunmaz).
- **Alt boşluktaki sızıntı:** panel içeriğin üstüne bindiğinde (geniş mod / ≤1199)
  içerik itilmediği için sayfa panelin ARKASINDA kalıyor, 12px şeritten sızıyordu.
  `.parla-drawer::after` opak katman (`z-index:-1`, 12px aşağı/sola taşar) + katman
  `pointer-events: auto` (görsel kapalıydı ama TIKLAMA sızıyordu, ölçümle yakalandı).
- 🔴 **KAPANIŞ ANİMASYONU HİÇ OYNAMIYORMUŞ:** kutu `open || kapaniyor` ile çiziliyordu;
  `open` false olan RENDER'da `kapaniyor` hâlâ false → kutu bir kare SÖKÜLÜP kapalı
  konumda yeniden takılıyor, tarayıcıda "önceki konum" kalmıyordu. Artık bir kez
  açıldıktan sonra hiç sökülmez (`hicAcildi`), yalnız `kapali` sınıfıyla kayar.
- **Sol menüyle eşzamanlılık:** menü 0.26s'de daralırken panel kendi 0.25s geçişiyle
  HAREKETLİ HEDEFİ kovalıyordu. Menü oynarken panelin geçişi kapanıyor
  (`body.parla-nav-oynuyor`, son ölçümden 320ms sonra kalkar). Ölçülen sapma ≤0.5px.
- **Telefonda arkadaki sayfa kayıyordu:** `body{overflow:hidden}` işe yaramıyor, bu
  sayfada kaydıran öğe `html` → `html:has(body.parla-open)` eklendi.
- **Klavye:** odak panele girer, Tab içeride döner, kapanınca açan düğmeye döner.
  Sürüklerken Escape önce SÜRÜKLEMEYİ iptal eder (eskiden `parla-dragging` asılı kalıyordu).
- **Yazı alanı otomatik büyüme kodu HİÇ YAZILMAMIŞTI** (CSS'te niyet vardı) — eklendi.

### 01.08 (4) — Sohbet akışı ChatGPT'ye göre hizalandı (yazı alanı, solma, "en alta in")
Mehmet ChatGPT'yi referans aldı: **"onlar analiz etmiştir, yeni bir şey üretmemize gerek yok."**
- ⚠️ **AKIŞ SIRASINDA TAKİP YOK — DENENDİ, GERİ ALINDI** (`1689c57` → `8c3a8fe`).
  Kısa süre "cevap ekranı aşınca dibe hizala" eklenmişti. ChatGPT ölçüldü: **takip
  ETMİYOR** — `scrollTop` akış boyunca 0'da sabit kaldı, `scrollHeight` 823 → 11438.
  Yani ~10.500px ekran dışına aktı, hiç kaydırmadı. **Buraya takip EKLEME.**
- **Yazı alanı listenin ÜSTÜNDE yüzüyor** (`ceff7fa`): eskiden flex kardeşti, liste
  kutunun üstünde bitiyordu. Artık `position: absolute`, liste `padding-bottom:
  var(--parla-composer-h) + 10` alıyor → metin altına kayabiliyor.
  ⚠️ Yükseklik ResizeObserver'la ölçülüp yazılıyor (kutu 34→120px büyüyebiliyor).
- ⚠️ **ÜÇ KEZ ÜST ÜSTE YANLIŞ YAPILDI, üçü de Mehmet'in ekran görüntüsüyle çıktı:**
  ① kutunun zemini `--card-2` = **%6 saydam beyaz**du; metnin üstüne yüzdürülünce
     arkadaki cevap içinden okunmaya başladı → `#202020` (aynı tonun OPAK karşılığı).
  ② düzeltirken banda opak zemin verildi → **solma degradesini tamamen örttü**,
     "solma hiç olmamış" gibi göründü → bandın zemini kaldırıldı, solmayı `::after` yapar.
  ③ solma **kutunun ÜSTÜNE** konmuştu; ChatGPT'de katman kutunun TAM ÜSTÜNDEN başlayıp
     AŞAĞI opaklaşıyor → `inset: 10px 0 0 0` (10 = bandın `padding-top`u).
     Ölçüm: `inset: 0` iken kutu kenarında alfa 0.27, metin %73 parlaklığa düşüyordu.
- **"En alta in" düğmesi eklendi** (`8b64045`), ChatGPT ölçüleriyle: 32×32, tam yuvarlak,
  `rgba(32,32,32,0.65)`, 1px %15 beyaz kenarlık, `blur(2px)`, gölge YOK, alt kenarı yazı
  alanının **24px** üstünde, ortalı. ⚠️ **EŞİK 140px** — sürpriz çıktı: dipten ayrılır
  ayrılmaz DEĞİL (1/5/20/60px'te görünmüyor; 130 yok, 140 var). Görünürlük hem `scroll`
  hem `ResizeObserver`dan besleniyor: cevap yazılırken yükseklik değişir ama kaydırma
  olayı GELMEZ.
- **Snap kaydırması düzeltildi** (`10b4323`, ölçümle doğrulandı): boşluk DOM'a yansımadan
  kaydırılıyordu, tarayıcı hedefi kırpıyordu. Artık bağımlılıksız `useLayoutEffect`
  boşluk yerleştikten sonra kaydırıyor. Ölçüm: `scrollTop` 441 → 4177, mesaj tepeden 12px.
- ⚠️ **`mask-image` KULLANILMADI** (ChatGPT kullanıyor): maske+filtre Safari'de
  görünmezlik yapabiliyor (auth ekranında yaşandı) → aynı görüntü düz degradeyle kuruldu.
- ⚠️ **Koyu bant kaydırma çubuğunu örtüyordu** (`802080e`): bant panelin tamamını
  kaplıyordu, çubuk listenin sağ kenarında olduğu için alt kısmı bandın altında
  kalıyordu → `right: 10px` + `.parla-list { scrollbar-gutter: stable }` (oluk her zaman
  ayrılsın ki bandın bittiği yer çubuğun başladığı yerle tutsun).
- ⚠️ **Düğme 34px yukarıdaydı, 24 olmalıydı:** konum `--parla-composer-h` (BANDIN
  yüksekliği) üzerinden veriliyordu; bandın 10px üst dolgusu olduğu için kutunun tepesi
  banttan 10px içeride → `+24px` yerine `+14px`. ChatGPT: düğmenin ALT kenarı KUTUNUN
  üstünden 24px.
- 🟡 Bilinçli fark: kutunun altındaki şerit bizde **12px**, ChatGPT'de 24px (panel dar).
- **Ders (kalıcı):** solma işinde üst üste üç kez yanlış yapıldı ve üçünü de Mehmet
  ekran görüntüsüyle yakaladı. Ortak hata: ölçüm rakamı DOĞRU alınıp YANLIŞ YERE
  uygulandı. Ölçüm bunu yakalamıyor — çünkü ölçülen şey zaten kendi koyduğun yer.
  **Yeni bir katman/geometri kurarken "bu ölçü neyin neresinden?" sorusunu açıkça yaz**
  (bandın mı kutunun mu, üstünden mi altından mı) — buradaki hataların hepsi bu soruyu
  atlamaktan çıktı.

⚠️ **KAYDIRMA ÇUBUĞU TUZAĞI (kalıcı ders):** Chrome'da bir öğede `scrollbar-width` /
`scrollbar-color` tanımlıysa o öğenin **BÜTÜN `::-webkit-scrollbar` tarifi yok sayılır.**
`* { scrollbar-width: thin }` yüzünden 24.07'de yazılan ince çubuk tarifi **bir hafta
boyunca hiç çalışmamış**. Standart özellikler artık yalnız
`@supports not selector(::-webkit-scrollbar)` içinde (Shopify de aynı yöntemi kullanıyor).
Aynı tuzak `.cat-list` ve `.parla-kat-cipler`de de vardı. **Yeni yere `scrollbar-width`
yazarken bunu hatırla.** Çubuk şekli Shopify'dan: oluk 10px + thumb'a 3px şeffaf kenarlık
+ `background-clip: content-box` → görünen hap 4px, track kuralı yok.

✅ **PARLA BEYNİ (`~/Developer/Paraner/parla/`, commit `e1016b0`) — DÜZELTİLDİ + YAYINDA + CANLIDA DOĞRULANDI**
NEYDİ: "sil" komutları YENİ GİDER olarak ayrıştırılıyordu. `"1) 350 TL…"` → −1,00 ₺
taslak (liste işaretini tutar sanıyordu); `"Market isimli 350 TL'lik gideri sil"` →
−350,00 ₺ taslak. Tek çip dokunuşuyla kullanıcı istediğinin TERSİNİ kaydediyordu.
İKİ AYRI HATA vardı:
1. **Sıralama:** `routeMessage` katmanları `ekle → hedef → SİL → sorgu` sırasıyla
   deniyordu. Rakam taşıyan her silme isteği daha ilk katmanda yakalanıyor, silme
   katmanına sıra HİÇ gelmiyordu. Silme kodu zaten vardı ve çalışıyordu.
   → Artık açık silme niyeti varsa ÖNCE silme denenir; ekleme/hedef ATLANIR. Bulunamazsa
   AI'ya bırakılır, ekleme katmanına DÜŞÜRÜLMEZ. ⚠️ Niyet tespiti kelime sınırıyla
   (`includes("sil")` "silgi"/"silah"ı da yakalardı).
2. **İsme göre arama TERSTİ:** `title.includes(searchText)` — işlem ADININ kullanıcının
   cümlesinin TAMAMINI içermesi bekleniyordu → "dun kahve isimli gideri sil" hiç
   bulunamıyordu. Yön çevrildi: işlem adının KELİMELERİ cümlede geçiyor mu?
   ⚠️ Aynı derecede birden fazla eşleşme → SİLMEZ, listeler ve SORAR (silme geri alınamaz).
**Deploy:** `supabase functions deploy ai-chat --project-ref oqhonmmbcqrkcaoijgnb`
(sağlık kontrolü 401 döndü = doğru). **Canlı test PASS:** "Deneme kahvesi isimli 80 TL
lik gideri sil" → *"Silindi: Deneme kahvesi — −80,00 ₺"*, çip yok, taslak yok, yeni
kayıt oluşmadı, işlem sayısı testten önceki hâline döndü.
⚠️ Beyin MOBİLLE ORTAK — buradaki her deploy telefonu da etkiler.

🟡 **Parla beyninde KALAN (küçük, açık):** işlem adı "Dun kahve" (tarih kelimesi ada
sızıyor, üstelik ASCII "Dun"); kayıttan hemen sonra "−0,00 ₺" özeti (işlem temmuza
düştü, özet ağustos → başarısız gibi okunuyor).

✅ **KAYDIRMA HATASI (commit `10b4323`) — DÜZELTİLDİ, canlı ölçüm bekliyor.**
NEYDİ: uzun cevaptan sonra yeni mesaj görünüme kaydırılmıyordu (`scrollTop` 2061'de
takılı → kullanıcı Parla'nın cevap vermediğini sanıyordu).
SEBEP ZAMANLAMA: `snapUygula` boşluk yüksekliğini state ile güncelleyip HEMEN `rAF`
içinde kaydırıyordu — boşluk EKRANA YERLEŞMEDEN. Kaydırılabilir alan kısa kalıyor,
tarayıcı hedefi kırpıyor, liste yerinde kalıyordu; sonraki karede boşluk büyüyor ama
kaydırmayı tekrar tetikleyen yok (`kaydirildiRef` true). Kısa geçmişte hedef zaten
sınırın içinde olduğu için tekrarlamıyordu.
ÇÖZÜM: kaydırma işaretlenir (`kaydirBekliyorRef`), bağımlılıksız bir `useLayoutEffect`
boşluk DOM'a yansıdıktan SONRAKİ ilk render'da kaydırır.
🟡 Kalan küçük: kısa cevaptan sonra ~239px ölü kaydırma alanı (snap boşluğu tasarım
gereği duruyor — rahatsız ederse ayrıca bakılır).

✅ **TEST KAYITLARI TEMİZLENDİ:** `Market −₺350,00` (01.08) ve `Dun kahve −₺120,00`
(31.07) silindi; "Bu Ay Gider" ₺850 → ₺500. ⚠️ Aynı gün/aynı ad/aynı kategoride
**Mehmet'in kendi `Market −₺500,00`** kaydı vardı — ad+tutar+tarih birlikte doğrulanarak
korundu. (Silme her zaman böyle yapılmalı, ad tek başına yetmez.)

### 01.08 (2) — Kabuk + Parla paneli Shopify Sidekick düzenine geçirildi (commit 270b2dc)
Mehmet kararı (seçenek sunuldu, en büyüğünü seçti): **"kabuğun tamamı Shopify gibi olsun"**.
Shopify Sidekick **canlı ölçüldü** (Claude Chrome eklentisi, `admin.shopify.com/orders`).
- **Kabuk:** üst bar tam genişlik + `position: fixed` (z-index 40), sol menü kenara yapışık
  (margin/yuvarlak köşe/gölge kalktı). ⚠️ Telefon (≤760px) HARİÇ — orada menü çekmece,
  sayfa pencereyle kayıyor, sabit bar içeriği örterdi.
- **Parla:** iki katman (`.parla-drawer` konum / `.parla-panel` zemin), sağ+alt kenara sıfır
  boşluk, sadece üst iki köşe yuvarlak. Varsayılan 400px, sol kenardan **sürüklenebilir
  300–600** (kademe yok, canlı takip), **genişlet** düğmesi (100vw − sol menü), genişlik
  `localStorage: paraner-parla-panel`, kapanış sağa kayma (0.25s).
- **4 kademe:** ≥1200 iter · 1040–1199 kenara yapışık biner (**iki çubuk sorunu BURADA
  kapandı** — panel sayfa çubuğunu örtüyor) · 768–1039 356px yüzen kart · ≤767 tam ekran.
- ⚠️ **`--panel-topbar-h` 71 → 73px:** gerçek yükseklik 73 (16+40+16+1). Bar akıştayken
  zararsızdı; sabitlenince içeriğin üst 2px'i barın altında kalıyordu (ölçüldü).
  `.tx-drawer` bilerek 83px'te bırakıldı — detay çekmecesi oynamasın diye.
- ⚠️ **Seçicilerde `.panel-shell` ön eki ŞART:** blok dosyada temel tanımlardan ÖNCE
  geliyor, ön eksiz aynı özgüllükte kalıp SONRAKİ tanım tarafından eziliyor (denendi).
- **Eski "padding değil margin" dersi DÜZELTİLDİ:** Shopify'ın kendisi `padding-inline-end`
  kullanıyor; belirleyici olan **kaydıran kutunun daralması**. Bizde en dıştaki kutu
  kaydırdığı için `margin` doğru yol — ama yeni kabukta kural bu hâliyle uygulanmalı.
- **Değişmedi:** yazı alanı (Mehmet), İşlemler/Faturalar detay çekmecesi (408px, ayrı
  kurala alındı), admin kabuğu, DB/edge/SEO, mobil (orada Parla tam ekran sayfa).
- **Ölçüldü (yerel prod, 1400px):** üst bar 0–1400 · panel sağ kenarı = innerWidth ·
  içerik `margin-right: 404` · sürükleme max 600 / min 300 · 1100'de margin 0 + yapışık ·
  900'de 356px 4px boşluklu · 700'de tam ekran · yenilemeden sonra genişlik korundu.
- 🔴 **DOĞRULANMADI (bir sonraki turda):** sol menünün yeni hâli + "genişlet"in menü
  kenarına oturması — yerel oturumda profil yoktu, sol menü render edilmiyordu.
  Mehmet canlıda baktı, **"gözüme çarpan şeyler var"** dedi ama listeyi vermeden limiti
  doldu → **ilk iş onun gördüklerini sor.**
- ✅ **Chrome köprüsü ARTIK ÇALIŞIYOR** (dünkü "bağlanamadı" notu geçersiz): `claude --chrome`
  + Claude eklentisi. Kullanım: `cd /tmp && claude --chrome --allowedTools "mcp__claude-in-chrome" -p '…'`
  ⚠️ Bu VS Code oturumunda `/chrome` YOK; alt oturum açarak kullanılıyor.
  Mehmet eklentiyi **admin@paraner.com profiline de kurdu** → panel oturumlu ölçüm oradan.

### 01.08 — Sağdan çekmece açılınca KAYDIRMA ÇUBUĞU da sola geliyor
Mehmet: "Parla açılınca scroll çubukları karmaşık gözüküyor; sayfanın scroll'u sola
kayarak sağdan Parla çıksın" (+ Shopify Sidekick ekran görüntüleri).

**Sebep — kayma SAHTEYDİ:** `.panel-content`'e `padding-right: 408px` veriliyordu. Yazılar
sola kayıyor ama **kutu pencerenin sağ kenarında kalıyor**; kaydırma çubuğu her zaman
kutunun kenarına oturduğu için çubuk da orada kalıyordu. Canlıda ölçüldü (1600px):
sayfa çubuğu **x=1600**, Parla'nın kendi çubuğu **x=1587** → sağ kenarda **13px arayla iki
çubuk**, üstelik sayfa çubuğu kaydırdığı yazılardan 400px uzakta.

**Shopify ne yapıyor (ekran görüntülerinden):** chat yüzen kutu değil, **gerçek üçüncü
sütun**. Üst bar tam genişlikte kalıyor; altındaki alan sol menü · içerik · chat diye
bölünüyor. İçerik sütunu fiziksel olarak daraldığı için çubuğu da onunla sola geliyor;
sığmayan tablo sütunun İÇİNDE yatay kayıyor (chat açıkken sütunlar kırpılmış + tablonun
altında yatay çubuk çıkmış).

**Çözüm:** iç boşluk yerine **kutunun kendisi daralıyor** → `margin-right: 408px`
(= çekmece 384 + sağ boşluk 12 + ara boşluk 12). Tek CSS bloğu; hiçbir sayfanın kodu
değişmedi. İşlemler/Faturalar detay çekmecesi de aynı kurala `:has(.tx-area.shifted)` ile
bağlandı (o bileşenlere dokunulmadı). ⚠️ `.panel-content`'ten `width: 100%` KALKTI —
`width:100%` kap genişliğine kilitlenip margin'i yok sayıyor, kutu taşıyordu; dikey
flex'te `stretch` zaten tam genişlik veriyor.
- ⚠️ **Admin kabuğu ayrı bırakıldı:** orada kaydırma pencerenin kendisinde, çubuk
  taşınamaz → `.admin-content .tx-area.shifted` eski iç-boşluk yöntemini sürdürüyor
  (ölçülerek teyit edildi: açılınca hâlâ `padding-right: 408px`).
- **Ölçüm (yerel prod build, test hesabı):** 1600 ve 1280px'te içerik sağ kenarı çekmecenin
  tam **12px** solunda; iki çubuk arası 13px → **395px** (her biri kendi sütununda).
  **30 panel sayfası Parla açıkken tarandı: 30/30 yatay taşma 0px.**
- ⚠️ **≤1040px'te DEĞİŞMEDİ** (bilinçli, eski karar): yer olmadığı için çekmece içeriğin
  ÜSTÜNDE duruyor, sayfa kutusu daralmıyor → orada iki çubuk hâlâ 13px arayla. Düzeltmek
  istenirse o aralıkta çekmecenin tam genişliğe çıkması ya da sayfa kaydırmasının
  kilitlenmesi gerekir (davranış değişikliği, Mehmet kararı).
- **Ders (kalıcı):** sağdan panel açılınca içeriği kaydırmak için **kaydırma kutusunun
  kendisini daralt** (`margin`), içine boşluk koyma (`padding`) — yoksa çubuk içerikten
  kopar. Yeni bir sağ panel eklenirse aynı kural.
- ⚠️ Chrome 136+ **varsayılan profilde uzaktan hata ayıklamayı engelliyor** → çalışan
  Chrome'a bağlanıp Shopify'ı canlı incelemek mümkün olmadı (profil kopyalama da güvenlik
  filtresine takıldı, doğrusu bu). Shopify tarafı ekran görüntülerinden okundu.

### 28.07 (2) — Arama ORTAYA döndü + komut penceresi (Supabase deseni)
Aynı gün sabah sola alınan arama kutusu **üst barın tam ortasına** geri kondu (Mehmet,
ekran görüntüsüyle: "basıldığında böyle belirsin"). İki değişiklik:
- **Kutu artık yazı alanı değil, DÜĞME.** Tıklayınca (ya da ⌘K/Ctrl+K) ekranın ortasında,
  arkası kararmış bir **pencere** açılıyor; yazı alanı pencerenin içinde, sonuçlar altında.
  Öncesi: yazı doğrudan üst bardaki kutuya giriyor, liste kutunun altına açılıyordu.
- **Ortalama `position: absolute; left: 50%` ile** — akışla değil. Sebep: solda rozet
  (deneme bitince kayboluyor), sağda ikon kümesi (sayısı değişiyor) → akışta ortalasak
  kutu duruma göre kayardı. Telefonda (≤760px) ortalama kapalı: kutu akışa dönüp kalan
  yeri dolduruyor, yoksa hamburger + sağdaki düğmelerle çakışıyordu.
- Pencerenin konumu artık JS ile ÖLÇÜLMÜYOR (kutuya çivili değil) → `getBoundingClientRect`
  + `resize` dinleyicisi kalktı, hizalama tamamen CSS'te.

**"Tam ortada mı?" denetimi — ÖLÇÜLDÜ, üç hata çıktı** (Mehmet: "sol/sağ panel açılıp
kapanınca bile sayfanın tam ortasında olmalı"). Test hesabıyla 8 pencere genişliği ×
menü açık/dar × Parla açık/kapalı ölçüldü:
- ① **Kutu üst barın ortasındaydı, sayfanın değil** → menü açıkken merkezden **+130px**,
  menü daralınca **+43px** sağdaydı; açılan pencere ise hep tam ortadaydı → kutuya basınca
  pencere yana zıplıyordu. Şimdi ikisi de pencere merkezinde: **sapma 0px** (1024px ve
  üstündeki tüm genişliklerde, dört durumda da).
- ② ⚠️ **`position: fixed` üst barın İÇİNDE çalışmıyordu.** Sebep kalıcı ders:
  `backdrop-filter`/`filter`/`transform` taşıyan bir ata, içindeki `fixed` öğe için
  "pencere" yerine geçer → kutu pencereye değil ÜST BARA çivileniyordu. Zemin+bulanıklık
  `.panel-topbar::before`'a taşındı (sözde öğe ata değildir) → görüntü aynı, hapis bitti.
  **Üst bara yeniden filtre/transform eklenirse aynı hata geri gelir.**
- ③ Karartma **Hızlı İşlem adasının (310) ve bildirim menüsünün (300) ALTINDA** kalıyordu
  → pencere açıkken sağ üst köşe kararmadan parlıyordu. `.ps-overlay` 110 → **320**.
- Yan ayar: kutu ortada sabit durduğu için dar pencerede rozetle/sağdaki kümeyle çakışma
  riski var → genişlik `clamp(200px, 100vw - 840px, 460px)`, deneme rozeti daha erken
  kısalıyor (tam ≥1520 · orta 1400-1519 · kısa <1400), **1000px altında ortalama kapalı**
  (kutu akışa dönüyor — orada üç öğe yan yana zaten sığmıyor). Çakışma: hiçbir genişlikte yok.

### 28.07 (1) — HIZLI İŞLEM adası + üst bar düzeni + admin yazı tipi
**Hızlı ekleme artık SAYFA DEĞİŞTİRMİYOR (6/6 modül).** Üst bardaki menüden bir şey
seçilince ilgili sayfaya gidilip form orada açılıyordu (yavaş). Altı modülün ekleme formu
ayrı bileşene **taşındı** (kopya değil taşıma): `MusteriFormu` · `UrunFormu` · `HesapFormu`
· `TeklifFormu` · `FaturaFormu` · `IslemFormu`. Hem modülün kendi sayfası hem üst bar AYNI
bileşeni açar → alan eklenince iki yer de alır. Formlar `next/dynamic` ile talep anında
yükleniyor, `body`ye portal ediliyor.
- ⚠️ **Yeni bir hızlı-ekleme satırı eklenirse** `app/panel/HizliEkle.tsx` içindeki `form`
  dalını kullan; `href` dalı (o sayfaya git) artık BOŞ, yalnız gerçekten gezinme gereken
  çok adımlı işler için bırakıldı.
- Yan düzeltmeler: liste sayfaları `useServerSynced`e geçti (başka sayfadan eklenen kayıt
  "yok" görünmesin) · teklif numarası artık **kaydetme anında** DB'den üretiliyor (sayfa
  uzun açık kalınca mükerrer numara riski kalktı, sayfadan bir sorgu da eksildi) · yeni
  hesabın "varsayılan mı" kararı ekrandaki listeden değil **DB sayımından**.

**Üst bar:** arama kutusu ortadan **sola** alındı (rozet onun sağına geçti) · `+` ikonu
**"Hızlı İşlem"** yazılı düğme oldu · menü `body`ye portal edildi (üst bar `z-index: 10`
ile kendi yığın bağlamını kurduğu için menü **Parla çekmecesinin altında** kalıyordu).

**"Dynamic island" açılışı** (Mehmet istedi, web araştırıldı — beui.dev · cho.sh ·
Chrome `linear()` · WWDC23). Uygulanan dört kural: ① düğme ve menü **TEK KUTU**, aynı
kabuk büyüyor ② **köşe yarıçapı animasyona SOKULMAZ** (tarayıcı yarıçapı yüksekliğin
yarısına kısar → pil↔dikdörtgen dönüşümü bedava; yarıçapı da oynatmak "şişen köşe" hissi
veriyordu) ③ **iki ayrı yay**: kabuk sakin / içerik canlı, gerçek yay denklemi 29 noktada
örneklenip CSS `linear()`e yazıldı → **kütüphane yok, çalışma anında JS yok** ④ içerik
kutuyu izler (bulanıktan nete, satırlar sırayla).
- ⚠️ **Ada `body`ye portal + `position: fixed`** → yeri ÖLÇÜLEREK konuluyor. İki ölçüm
  hatası canlıda yakalandı, ikisi de kalıcı not: **(a)** ölçüm `mounted`e bağlı olmalı —
  portal ilk render'da basılmadığı için ref'ler boştu, ölçüm sessizce boş dönüp bir daha
  çalışmıyordu → ada 20px aşağı düşüyordu; "bazen düzgün bazen bozuk" olmasının sebebi
  `document.fonts.ready`nin bazen geç çözülüp ölçümü kurtarmasıydı (yazı tipi
  önbellekteyse kurtarmıyor). **(b)** konum, ölçü DOM'a yazıldıktan SONRA alınmalı; ayrıca
  yer tutucu + üst bar `ResizeObserver` ile ve pencere `resize` ile sürekli izleniyor
  (sol menü daralınca / pencere değişince ada hizadan çıkıyordu).

**Diğer düzeltmeler:**
- **Admin panelin sayfa başlıkları serif çıkıyordu.** Genel `h1` kuralı Playfair (serif)
  veriyor — o kural pazarlama sayfaları için; uygulama ekranları muaf tutuluyor ama
  muafiyet listesinde `.admin-shell` YOKTU. ⚠️ **Yeni bir kabuk/ekran eklersen başlığını
  `globals.css`teki o listeye de ekle.**
- Odak halkası (Tab ile gezerken) tarayıcının MAVİ varsayılanıydı → temaya çevrildi ve
  uygulama içinde **İÇERİ** çiziliyor (`outline-offset: -2px`): dışa taşan halka
  `overflow` kırpan liste/ray/kartlarda kesiliyor, dar menüde komşu satıra değiyordu.
- Sol menü daraltılmışken profil menüsünde **hesap adları görünmüyordu** (daraltma kuralı
  `flex: 0 0 0` veriyor, `width: auto` onu ezmiyor → isim satırı `overflow: hidden`
  olduğu için kırpılıyor, tür satırı taşarak görünmeye devam ediyordu). Aynı eksik telefon
  çekmecesinde de vardı.
- Sol menüye `z-index: 20`: `position: sticky` kendi yığın bağlamını açtığı için profil
  menüsü arkadaki grafiğin ALTINDA kalıyordu ("menü şeffaf mı?").
- Arama kutusundaki kısayol ipucu işletim sistemine göre: Mac'te `⌘K`, Windows'ta `Ctrl K`
  (kısayolun kendisi zaten ikisini de dinliyordu, eksik olan yazıydı).

**Plan (kod değil) — abonelik sayfası:** `docs/ABONELIK-SAYFASI-PLANI.md`. Plan seçim popup'ı
(FireVibe düzeni, bizim titanyum renklerimizle) + "Planım" / "Ödeme Yöntemi" / "Faturalarım"
blokları. Üç tarama yapıldı, sonuç: **hiçbir ödeme sağlayıcısı entegre değil** (paket/tablo/
webhook sıfır) ve zincir **EIN'de takılı** → iş tamamen arayüz, kart/fatura blokları "Yakında"
kalacak. ⚠️ `invoices` tablosu MÜŞTERİNİN faturaları; abonelik makbuzu ayrı tablo olacak.
Mehmet "sonra devam" dedi — kodlanmadı. Yan bulgular GOREVLER'e işlendi: yeni **İşletme Pro
Yıllık** planı (5 yeri birden ilgilendiriyor, asıl kaynak mobil `premium.tsx`) · gizlilik
sayfasındaki **yanlış RevenueCat metni** (canlıda) · pazarlamadaki sayı iddiasının DB'den
gelmesi kararı.

**Plan (kod değil):** işletmelere soğuk mail kampanyası → `docs/SOGUK-MAIL-PLANI.md`.
⚠️ İki tuzak kaynaktan doğrulandı: kampanya **paraner.com'dan gönderilemez** (spam şikâyeti
şifre sıfırlama maillerini de öldürür) ve **Resend'den gönderilemez** (sözleşmesi soğuk
maili yasaklıyor; hesap askıya alınırsa ürünün TÜM mailleri durur). Klaviyo/Mailchimp/Brevo
da aynı kategoride. Yasal: tacir/esnafa önceden onay gerekmiyor ama **İYS kaydı + ret
kontrolü** zorunlu. Kampanya, ödeme sistemi bitmeden başlamamalı.

### 27.07 (4) — DENEME SÜRESİ DENETİMİ: tutarsızlık YOK, her yerde 14 gün
- Mehmet sordu ("14 gün sanırım, komple app ve web'de tutarsızlık var mı"). **Canlı
  veritabanına SORULARAK** doğrulandı (repoya bakarak değil): `get_trial_status` RPC'si
  test hesabının oturumuyla çağrıldı → `daysPassed 13 · daysLeft 1 · trialExpired false`
  → 13+1 = **14** ✓. Kontrol edilen 5 yer: canlı DB RPC · mobil `lib/trial.ts` · Parla
  beyni (`parla/supabase/functions/ai-chat`) · web `lib/plans.ts` · tüm kullanıcı metinleri
  (ana sayfa, onboarding, mobil premium/plan-detail/setup, hoş geldin maili). Hepsi 14;
  eski 7 günden kalma tek satır yok (yalnız migration dosyasının başlığında tarihçe olarak).
- ⚠️ **Uyarı eşikleri AYRI:** web rozeti son 7 günde beliriyor / son 3 günde kırmızı;
  **mobil banner hâlâ son 2 günde** (`TRIAL_WARN_DAY = TRIAL_DAYS - 2`, DB RPC'de de
  `days_passed >= 12`). Hata değil (biri rozet, öteki banner) ama istenirse hizalanır —
  o zaman mobil + RPC birlikte değişir.

### 27.07 (3) — Plan rozeti + hızlı ekleme "dinamik adası" (üst bar işinin 3. adımı)
- **Rozet KURALLARI (Mehmet, 27.07 — hesap türüne göre):** ücretlide HİÇ YOK · denemede
  kalan **7 günden az**sa "Denemenin bitmesine N gün kaldı", **son 3 günde KIRMIZI** · bireysel ücretsiz/
  bitmişte "Daha fazla özellik için yükselt" · işletme bitmişte "Denemen bitti · Plan seç",
  hiç deneme yoksa "Planını seç". ⚠️ İşletmeye ASLA "Ücretsiz plan" yazılmaz — işletmede
  ücretsiz plan yok (mobil plan-detail.tsx:103 ile aynı gerçek), denemesi biten işletme
  DB'de `individual_free`'e düşse bile. Telefonda kısa metin ("1 gün", "Yükselt", "Plan seç")
  — tek bileşen, ÜÇ metin, hangisinin görüneceğine CSS karar veriyor.
  ⚠️ **Rozet üst barın SOLUNDA** (27.07, Mehmet: "arama kutusunu daraltmana gerek yok"):
  arama kutusu ortada SABİT, sağdaki küme dolu → uzun cümle sağda kutuya çarpıyordu.
  Ölçüldü: soldaki boşluk 1147px'te 176px · 1280'de 242px · 1440'ta 322px; uzun cümle 226px
  → soldan 1280'den itibaren sığıyor (sağdan ancak 1512'den sonra sığıyordu). Metin ekrana
  göre kısalıyor: ≥1250 tam cümle · 761-1249 "Denemene N gün kaldı" · ≤760 "N gün".
  Beş ekran genişliğinde çarpışma/taşma testi yapıldı, hepsi temiz. 13 durumun HEPSİ gerçek bileşen
  çizdirilerek doğrulandı (geçici test sayfası, ölçümden sonra silindi).
  ⚠️ **Bugün hiçbir özellik KİLİTLİ DEĞİL** (web'de tek gate yok, denetlendi) → "daha fazla
  özellik" bir SÖZ; ödeme + kilitler gelince gerçek olur.
  Tıklayınca Ayarlar > Abonelik.
  ⚠️ **Kapatılamaz:** ilk hâlinde × vardı (sessionStorage ile o oturumluk gizleme);
  Mehmet aynı gün kaldırttı — "o bildirim kaldırılmasın üstten". Kalan gün sürekli görünür.
  Gizleme geri istenirse DB'ye YAZMAMALI: mobildeki kalıcı kapatma (`trial_notified_day5`)
  ayrı bir şeydir, oraya dokunulmaz.
- **Ada:** fareyle üzerine gelince açılır, ayrılınca kapanır (140ms tolerans: düğmeden
  panele geçerken kapanmasın). Satırlar sırayla beliriyor, + işareti ×'e dönüyor.
- **Formların kopyası ÇIKARILMADI:** her satır `/panel/islemler?ekle=gider` gibi gidiyor,
  modül kendi formunu açıyor (`lib/useEkleTohumu`). Parametre işlendikten sonra URL'den
  siliniyor (yoksa yenileyince form tekrar açılır). 6 modül bağlandı: işlemler (gelir/gider
  önceden seçili), faturalar, teklifler, müşteriler, ürünler, hesaplar.
- **⚠️ DOKUNMATİK — ÜÇ AYRI TUZAK, üçü de ölçülerek bulundu:**
  ① `pointerType === "touch"` kontrolü İŞE YARAMIYOR: dokunmatikte tarayıcının ürettiği
  sahte `pointerenter` kendini **"mouse"** diye tanıtıyor. Doğru ayrım cihazın YETENEĞİ:
  `matchMedia("(hover: hover)")` — hover'ı yoksa hover dinleyicisi hiç bağlanmaz.
  ② Düz `onFocus={ac}` menüyü telefonda açıp KAPATIYOR: parmak değince düğme odaklanıyor
  (açılıyor), hemen ardından click gelip kapatıyor. Çözüm: `:focus-visible` (yalnız klavye).
  ③ Sonuç: telefonda 1. dokunuş açar, 2. kapatır; masaüstünde hover açar/kapatır.
- **Abonelik verisi paylaşılan sorguya alındı** (`getProfiles` select'i): rozet HER sayfada
  göründüğü için zaten her istekte lazım → ayrı sorgu açmak fazladan ağ turu olurdu.
  Ayarlar sayfasındaki kopya alanlar kaldırıldı (tek kaynak `lib/abonelik.ts`).
- **Doğrulama:** 30 panel sayfası yeniden tarandı (0 hata), masaüstü + telefon davranışları
  tek tek ölçüldü, "Gider ekle" → form GİDER seçili açılıyor (ekran görüntüsüyle teyit).

### 27.07 (2) — Panel geneli arama (üst bar işinin 2. adımı)
- **Üst bara arama kutusu** (⌘K ile de açılır): ① **sayfalar** — sol menünün KENDİSİNDEN
  türetilir (`BUSINESS_SECTIONS`), yani yeni modül eklenince aramaya elle satır eklemek
  gerekmez; yanına Türkçe eş anlamlılar ("veresiye", "kar", "iban") + Ayarlar sekmeleri.
  ② **veri** — 12 tabloda (işlem, fatura, teklif, cari, müşteri, ürün, çalışan, hesap,
  düzenli ödeme, borç, çek/senet, veresiye), 2 harften sonra + 250ms gecikme + grup başına 5 kayıt.
- **Ders — tutarda TAM EŞLEŞME İŞE YARAMIYOR:** "2583" yazan kullanıcı 2.583,36'yı arıyor;
  `amount.eq.2583` hiçbir şey bulmuyordu (canlıda ölçüldü). Kuruş yazılmadıysa `[n, n+1)`
  ARALIĞI aranıyor (PostgREST `or()` içinde `and()` destekliyor). Sayısal kolonda `ilike`
  mümkün değil → kısmi tutar araması için DB fonksiyonu gerekirdi.
- **Yerleşim düzeltmesi (Mehmet, aynı gün):** kutu solda kalmıştı ve sonuçlar ekranın
  ortasında AYRI bir pencere gibi açılıyordu (kutuyla görsel bağı yoktu). Şimdi: kutu üst
  barın tam ortasında, liste tam ALTINDA ve AYNI genişlikte. ⚠️ Ortalama `position:absolute`
  ile yapıldı — akış içinde ortalasaydık sağdaki ikonların genişliği (bildirim/Parla)
  kutuyu kaydırırdı. Liste `body`'ye portallandığı için CSS ile hizalanamıyor: kutunun
  ekrandaki yeri ÖLÇÜLÜP yazılıyor (`getBoundingClientRect`, resize'da yeniden). Telefonda
  ortalama yok (solda hamburger, sağda 2 ikon) ve liste kutuya değil EKRANA göre genişler.
  Karartma 0.55 → 0.30: açılır liste modal değil, ağır karartma fazla kaçıyordu.
- **Üst bar tek dil konuşuyor (Mehmet, 27.07):** Parla ve bildirim düğmelerinin çerçevesi
  `transparent`'tı → dururken kutusu görünmüyor, yalnız üzerine gelince beliriyordu; yeni
  arama kutusunun yanında yarım kalmış duruyordu. Üçü de artık AYNI: zemin %4,5 beyaz,
  çerçeve `--border`, köşe 11px, hover'da `--border-strong`. **Yükseklik de eşitlendi**
  (kutu 43 / ikonlar 38'di → üçü 40px): yan yana duran öğelerin boyu tutmalı.
- **Cila (Mehmet: "daha profesyonel gözüksün, açılışı kapanışı"):** kutu 360→460px;
  açılışta liste yukarıdan aşağı açılıyor (190ms, expo-out eğrisi: hızlı başlar yumuşak
  oturur), kapanışta 120ms solarak çıkıyor. ⚠️ **React unmount anında animasyon ÇALIŞMAZ** →
  ayrı bir "kapanıyor" evresi tutuluyor (`gorunur` state, `KAPANIS_MS` CSS ile aynı olmalı).
  Ölçüldü: 4ms sınıf → 12ms `psOut` başlıyor → 128ms DOM'dan siliniyor.
  Ayrıca: odakta titanyum halka, yazı varken × (temizle) düğmesi, iki katmanlı gölge,
  `prefers-reduced-motion` açıksa yalnız solma.
  ⚠️ **Ölçüm tuzağı:** puppeteer'da `click` + 50ms bekleme, CDP gecikmesi yüzünden 120ms'yi
  aşıyor → "animasyon çalışmıyor" gibi görünüyor. Doğrusu: tarayıcı İÇİNDE MutationObserver.
- **Ders (İKİNCİ KEZ) — üstte duran katmanın zemini OPAK olmalı:** kutuya `var(--card)`
  verdim, o %4 beyaz yani saydam → arkadaki grafik yazıların içinden okundu. Telefon
  çekmecesinde (26.07) aynı hata. `.ps-panel` artık düz `#0c0d0f`.
- **Ders — üst bardan açılan katman PORTAL ister:** `position: fixed` karartma sol menüyü
  karartmıyordu; sebep üst barın `z-index` taşıyan bir flex öğesi olması → kendi katman
  bağlamını kuruyor, içindeki `fixed` çocuk oradan çıkamıyor. `createPortal(…, document.body)`
  (ParlaChat'te de aynı desen).
- **Ham kategori kimliği yine sızmıştı:** sonuçta "kira_geliri" yazıyordu → `findCategory` +
  özel kategoriler (kutu ilk açılışta bir kez çekiyor). Tarih de ham ISO'ydu → `formatDate`.
- **Kolon adları tahmin EDİLMEDİ, modüllerden okundu.** En sinsi tuzak: her tablo `user_id`
  ile aktif profile bağlıyken **`contacts` `profile_id` kullanıyor**.
- **Doğrulama:** gerçek tarayıcı + test hesabı, masaüstü ve telefon. "veresiye/kar/abonelik"
  doğru sayfayı, "kira" işlemi, "2583" 2.583,36'lık kaydı buluyor; Enter → `/panel/islemler?q=Tt`
  ve o modülün kutusu dolu geliyor. **30 panel sayfası yeniden tarandı: 0 hata, 0 çöken sayfa**
  (kabuk değiştiği için hepsi kontrol edildi).

### 27.07 — Ayarlar > Abonelik sekmesi (üst bar işinin 1. adımı)
- **Panel kullanıcıya planını HİÇ söylemiyordu:** ne hangi plandasın, ne denemen kaç gün sonra
  bitiyor — bu bilgi yalnız telefonda vardı (`components/TrialBanner.tsx`). Webde plan sayfası
  da yoktu. `Ayarlar > Abonelik` eklendi: mevcut plan + durum rozeti + kalan gün + bitiş tarihi,
  altında profil türüne göre plan kartları (işletme profiline bireysel plan gösterilmez).
- **Fiyatlar KOPYALANMADI, kaynaktan alındı:** `lib/plans.ts`'e katalog eklendi, mobil
  `app/premium.tsx`'ten birebir. Fiyat değişince güncellenecek 4 yer o dosyanın başında yazılı.
- **Deneme başlatma GERÇEKTEN çalışıyor:** hiç deneme kullanmamış + 14 günlük denemesi olan plan
  (`individual_pro_monthly` / `business_pro_monthly`) → düğme "14 Gün Ücretsiz Başlat" ve profile
  mobil `startTrial` ile AYNI alanları yazar (`trial_notified_day5/7` sıfırlama dahil — sıfırlanmazsa
  mobil uyarıyı hiç göstermez). Diğer her durumda düğme **"Ödeme yakında"** ve kapalı:
  çalışmayan "Satın al" göstermek olmayan söz vermektir.
- **Ders — deneme matematiği İSTEMCİDE hesaplanmaz:** `Date.now()` cihazın saatidir, saati geri
  alan kullanıcıya "denemen bitmedi" derdi. Durum sunucuda, admin panelinin kullandığı AYNI
  `profileLifecycle` ile hesaplanıp prop olarak iniyor. Bitiş tarihi de `formatDate` ile DEĞİL
  `formatDayMonth` ile basılıyor (ilki ISO'yu ham böler = UTC → gece yarısında bir gün kayardı).
- **Bulunan çelişki (GOREVLER'e yazıldı):** GOREVLER "Max planları ikisinde de yok" diyordu ama
  mobilde duruyor; asıl fark **web pazarlama sayfası** Max'i hiç göstermiyor (Google'a giden fiyat
  şeması dahil) → müşteri telefonda ₺890 görüp sitede göremiyor. Karar Mehmet'te.
- **Doğrulama:** yerel prod build + test hesabı oturumuyla gerçek tarayıcıda açıldı (masaüstü +
  telefon boyu). İşletme profilinde doğru 3 plan, doğru fiyat, "Deneme · 2 gün · 28 Tem 2026";
  başka kart seçilince düğme/ince yazı doğru değişiyor. ⚠️ **Deneme BAŞLATMA yolu canlıda
  denenmedi** (izin gerekti) — kod yolu yazıldı, göz testi Mehmet'te.

### 26.07 — telefon çekmecesi opak + 30 sayfa canlı tarama
- **Çekmece arkası şeffaftı (Mehmet ekran görüntüsü):** telefonda soldan açılan menü,
  masaüstündeki buzlu cam zeminini (%50 saydam) aynen kullanıyordu → menü sayfanın
  ÜSTÜNDE durduğu için arkadaki başlık/kartlar yazıların içinden okunuyordu. Telefonda
  zemin **opak** yapıldı (`@media max-width:760px` içinde), karartma 0.55→0.66 + 3px
  bulanıklık. Masaüstündeki cam DOKUNULMADI (orada menü sayfanın yanında, arkası siyah).
  **Ders:** cam efekti "yanında duran" panelde doğru, "üstünde duran" katmanda değil —
  yeni bir overlay/çekmece eklerken zemini opak seç.
  ⚠️ Opak zeminle birlikte `backdrop-filter` telefonda kapatıldı (görsel etkisi kalmamıştı,
  boşuna GPU yakıyordu).
- **30 panel sayfası canlıda tek tek gezildi** (gerçek tarayıcı + test hesabı oturumu):
  konsol hatası 0, kırık istek 0, çöken/açılmayan sayfa 0; hepsi 1-3 sn.
  **Tek gerçek kusur: Vade Takibi** boş-ekran turundan atlanmıştı (eski düz kutu +
  emoji) → `EmptyState`'e bağlandı. Kendi kaydını tutmayan modül olduğu için aksiyon
  "ilk kaydı ekle" değil **"Faturalara git"** (nötr `btn-ghost`, teal değil).
  ⚠️ Test hesabı BOŞ → yalnız boş hâller denetlendi; dolu ekran hataları bu turda görünmez.
- **Tarama aracı KALICI:** `~/Developer/Paraner/tools/panel-tarama/` (repo DIŞINDA — web repo'su
  herkese açık; kullanımı + tuzaklar oradaki `README.md`'de). Oturum şifre/e-posta olmadan açılıyor —
  service_role ile `admin/generate_link` → `verify` (token_hash) → çerezi projenin kendi
  `@supabase/ssr` sürümü üretiyor (biçim tahmin edilmiyor, chunk'lı 2 çerez).
  ⚠️ Jetonu ASLA ekrana basma (bir kez basıldı, o oturum `logout?scope=local` ile kapatıldı).
  ⚠️ `\bNaN\b` gibi regex denetimleri Türkçe metinde yanlış alarm verir ("Alı**nan**" —
  JS kelime sınırı 'ı'yı harf saymıyor).

### 25.07 (2. oturum) — Parla cilası + kategori adları + test hesabı sıfırlandı
- **Daktilo webde HİÇ çalışmıyormuş:** motor (`RichText reveal`) yazılmış ama bağlanmamıştı,
  her mesaj tek seferde basılıyordu. Bağlandı, hız mobil ile aynı (~2,4 sn hedef, 9-34 ms/kelime).
- **Yazarken metin zıplaması çözüldü:** ① her kelimede dibe kaydırma kaldırıldı → mobildeki
  **snap** deseni (gönderilen mesaj tepeye, cevap altındaki geçici boşluğa yazılır, ekran
  oynamaz) ② boş satırlar daktilo sırasında çizilmiyordu, bitince eklenip metni kaydırıyordu.
- **Tutar renkleri her yerde:** özet/gelir/silme cevapları "13.746,45 TL" yazıyordu — işaretsiz
  ve "TL" son ekli olduğu için iki istemcinin de renk deseni tutmuyordu. Tek kaynak:
  `context.ts giderYaz/gelirYaz/netYaz`. Hedef/birikim NÖTR kaldı (işaret yok).
- **Ham kategori kimliği ekrandan gitti:** ① beyinde `katAdi()` (özel kategoriler
  `user_categories`'ten; karşılıksız kimlik "Kategorisiz") ② webde `findCategory(id, custom?)`
  → Genel Bakış, Kâr-Zarar, Gelir-Gider Raporu (CSV dahil), Bütçeler artık özel kategorileri
  okuyor (sunucuda, `lib/customCategoriesServer`, istek başına tek sorgu) ③ `diger` gerçek
  kategori olarak web+mobil kataloğuna eklendi — YOKLUĞU ayrıca Parla'nın eklediği işlemi
  düzenlerken kategori kutusunu BOŞ gösteriyordu. Genel Bakış'ta ilk-5-dışı toplam artık
  "Diğer kategoriler" (iki ayrı "Diğer" satırı çıkıyordu).
- **Ayarlar > Kategoriler** (yeni): kategori yönetimi yalnız "İşlem Ekle" modalının içindeydi,
  Mehmet silme yerini bulamadı. ⚠️ Bu sekme GEÇİCİ — yeri değişecek (GOREVLER).
- **Kategori çipleri kaydırılabiliyor:** ray zaten `overflow-x:auto` idi ama masaüstünde
  tekerlek dikey kaydırır + çubuk gizliydi → kaydırılamıyor sanılıyordu. Tekerlek yatay
  çevrildi (native listener, `passive:false` — React onWheel pasif, preventDefault etmiyor),
  fareyle sürükleme eklendi (sürükleme sonrası tıklama yutuluyor), masaüstünde ince çubuk.
- **Cevaplanmamış kategori sorusu düşmüyor:** taslak duruyor, Parla önce yeni soruyu
  cevaplıyor, daktilo bitince BİR KEZ hatırlatıyor. İşlem hâlâ yalnız çipe dokununca kaydedilir.
- **Test hesabı sıfırlandı** (Mehmet onayı): admin@paraner.com iki profilinden 27 işlem +
  1 fatura + 1 özel kategori + 2 Parla mesajı silindi. Profiller/ayarlar/giriş duruyor.
- **iPhone 11'e (MGZR) yeni build kuruldu** — ilk açılışta iOS "geliştirici profiline güven"
  istiyor (Ayarlar > Genel > VPN ve Cihaz Yönetimi).
- **AI NİYET HATASI bulundu, ERTELENDİ** (ayrıntı + seçenekler GOREVLER'de): "…iptal edeceksin"
  cümlesi yeni gider olarak kaydediliyor. Mehmet: AI'ı sonra yeniden şekillendireceğiz.

### 25.07 — Parla kategori sorma + canlı senkron (web+mobil+parla, hepsi canlı)
- **Kategori sorma sistemi bitti:** belirsiz yazımda ("250 kahve") Parla kaydetmeden SORUYOR;
  çipler yazma alanının üstünde (tek satır, yana kayar, kenar erimesi, kaydırma çubuğu). "+" ile
  yeni kategori (ortak `user_categories` tablosuna). Net yazımda ("100 tl market") sormaz — hız korunur.
- **Metin/renk cilası:** tutar satırı + özet renkli (gelir yeşil / gider kırmızı), sembol (₺) ile;
  onay "Yemek **giderin** kaydedildi"; kategori seçilince yer tutucu başlık o kategorinin adı olur.
  Metin Mehmet seçimi ("...eklersen paranın nereye gittiğini birlikte daha iyi analiz edebiliriz").
- **İşlem CANLI senkron:** `transactions` realtime yayına eklendi → telefon↔web çift yönlü, yenilemesiz.
  Debounce'lu `router.refresh()` / store fetch. İlk bağlantı ~3 sn, sonrası hızlı.
- **Bulunan/kapatılan hatalar (canlı):** ① mesaj id'leri `Date.now()` ile çakışıp mesaj GİZLİYORDU
  (aynı ms'de iki mesaj → tek React key) → monoton sayaç. ② sohbeti sil DB'yi bekliyordu → ekran önce
  boşalıyor. ③ iki profil birden aktifti → Parla "Profil bulunamadı" → veri düzeltildi + tek-aktif
  garantisi (kısmi tekil indeks). ④ `custom_<zaman>` ham kimlik görünüyordu → okunabilir slug + etiket çözümü.
- **Mimari:** özel kategoriler cihaz-yerelden ortak DB tablosuna (web 7 + mobil 15 dosya, imzalar aynı
  kaldı). "İptal" sheet düğmeleri kırmızı çerçeve (tek yerden, 25 ekran). Cam-içine-cam çizilmiyor
  (araştırıldı) → gerçek kenarlık.



- **Admin cila — COMMIT BEKLİYOR:** `/admin/musteriler/[id]` Tehlike Bölgesi artık `ayarlar`'ın
  `danger-zone` sözleşmesini kullanıyor (dz-info + dz-btn); `/admin/ekip` formu dropdown'larına
  ekran-okuyucu etiketleri (aria-labelledby + role=group).
- **Son-admin koruması:** `sonAdminMi` helper, üç rol aksiyonuna bağlı (defense-in-depth;
  self-check'ler asıl vektörü zaten kapatıyor, tam TOCTOU garantisi DEĞİL).
- **AdminPageHead:** 7 admin sayfa başlığı tek bileşende (görsel-nötr).
- **/admin/destek:** istemci sayfalama (25/sayfa) + seçim etkileşimi.
- **Terminoloji:** kayıt olmuş kişi = "Müşteri" (Profil ayrı kavram olarak korundu).
- **DONMA çözüldü:** sekmeden dönünce Destek'e basınca donma — suçlu, donmayı çözmek için yazılmış
  `useRewarmPrefetch` toplu ısıtmasının kendisiymiş; kaldırıldı (şikâyet senaryosu 5859 → 1042 ms).
- **Admin pano kişi-bazlı sayıyor (birim çelişkisi O6 kapandı):** kartlar (Toplam Müşteri/İşletme/
  Bireysel/Ücretli/Denemesi bitiyor) `listPeopleCached` + `lib/lifecycle` ile sayıyor → `/admin/musteriler`
  segmentleriyle birebir. "Premium profil" (is_premium, deneme dahil) → "Ücretli" (gerçek ödeyen). Canlıda
  5/5 kart tıklanan liste satır sayısıyla eşleşti. `panoMetrikleri` kaldırıldı.
- **Kararlar:** hesap silme = 30 gün yumuşak silme + geri dönüş (kod ödeme/lansman fazında,
  `docs/HESAP-SILME-VERI-SAKLAMA.md`). Perf: ilk-tık gecikmesi soğuk başlangıç DEĞİL (sunucu ~150ms),
  istemci-tarafı — en son test edilecek.
- **Bakım:** hafıza dosyaları + CLAUDE.md sadeleştirildi; DAILY_LOG haftalık arşiv sistemine geçti.
- **AI TEK BEYİN — Faz 1+3 (24.07):** AI'ın kuralları mobil uygulamanın içindeydi (değişiklik =
  App Store sürümü). Artık kurallar DB'de (`ai_config_versions`, sürümlü) ve beyin sunucuda
  (`ai-chat` edge, `mode:"assistant"` — profil çözme, kural okuma, işlem ekle/sil, sohbet kaydı).
  Eski sözleşme dokunulmadan duruyor → mobil kırılmadı. Web'e Parla eklendi: üst bar ikonu +
  sağdan yan panel (sektör deseni: veri üzerinde İŞLEM yapan asistan için baloncuk değil yan panel).
  **Dersler:** ① `chat_messages`/`transactions` PROFİL id'siyle, `daily_ai_usage` AUTH id'siyle
  yazılıyor — ikisi ayrı, karıştırma. ② Mobilde "evet tümünü sil" sıra hatası yüzünden hiç
  silmiyormuş; sunucuda bilerek AÇILMADI (karar Mehmet'te). ③ İşlem silmede hesap bakiyesi geri
  alınmalı (mobil+web+edge = üç ayrı kopya, üçü aynı kalmalı).
- **TEK BEYİN TAMAMLANDI (24.07):** telefon de ortak sunucu beynine bağlandı → bir kuralı bir
  yerden değiştirince web+mobil birlikte değişiyor. Beyin `paraner-app`ten çıkıp ortak klasöre
  taşındı: `~/Developer/Paraner/parla/` (GitHub paraner/parla, private). Eski kopya SİLİNDİ.
  **Denetimde bulunup kapatılan ayrışmalar:** ① kalan-hak sayacı yanlış kimlikle okunuyordu
  (`daily_ai_usage` AUTH id, `chat_messages`/`transactions` PROFİL id — karıştırma!) ② sohbetteki
  + butonu görseli hiç göndermiyordu ③ günlük limit 5/30 iki yerde kopyaydı ④ fiş tarama istemi
  (~100 satır) mobilde ayrı kopyaydı → `mode:"receipt"` ile tek kaynağa bağlandı.
  **Açık kalan tek ayrışma:** kategori kataloğu (3 kopya) — DB'ye taşınacak, sıradaki iş.
  ⚠️ Mobil değişikliği CİHAZA BUILD ister (OTA yok).
- **Panel sol menü "Yakında" rozeti kaldırıldı (24.07):** pasif (`href:null`) 6 alt öğenin
  rozeti, menü daralırken etiketle birlikte gizlenmediği için dar rayda taşıp bozuk görüntü
  yapıyordu. Rozet + `.nav-soon-badge` stili silindi; satırlar soluk/tıklanamaz kaldı,
  daraltılmışken ad balonda. **Ders:** daraltmada `display:none` olan tek şey `.nav-label` —
  sol menüye satır-sonu öğe eklerken (rozet/sayaç/yıldız) daralma anını da düşün.
