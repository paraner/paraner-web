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
