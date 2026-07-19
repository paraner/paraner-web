# Rakip Analizi — Defteran (defteran.com)

> 2026-07-13, 4 paralel ajanla tüm site (180 URL) tarandı.
> **Tüm iddialar sonradan elle doğrulandı** (kendi kodumuzda grep/read, rakipte ham HTML) — bkz. §Doğrulama.
> Özet: Ürün olarak bizden **zayıf**, pazarlama makinesi olarak bizden **çok önde**.

## Kim

- **Defteran Teknoloji A.Ş.**, telif 2026 → çok yeni şirket. Ekip/kuruluş/yatırımcı bilgisi yok.
- Tek sosyal kanıt: "1.000+ işletmenin tercihi". Referans, vaka, logo, testimonial, puan **yok**.
- Konum: KOBİ/esnaf ön muhasebe. Slogan: *"Ön muhasebeniz tek ekranda"* / *"Dağınık Excel defterini bırakın"*.
- **Bizimle birebir aynı mimari:** pazarlama sitesi + `app.defteran.com` panel + iOS/Android app, ortak hesap.
- Teknoloji: Nuxt 4 + Tailwind + Cloudflare. Panel ayrı Vite SPA. 3D/WebGL yok, **statik ürün görseli bile yok**.
- **Aktif paid funnel:** GA4 + GTM + **Google Ads conversion** + **Meta Pixel**. Reklam çeviriyorlar.

## Fiyat

| | Aylık | Yıllık |
|---|---|---|
| Fiyat | **₺750/ay** (net, "KDV muaf") | **₺5.200/yıl** = ₺433/ay |
| Deneme | 14 gün, **kredi kartı istemiyor** | aynı |

- **Tek paket. Özellik matrisi YOK** — tek fiyata 13 modülün hepsi açık. Satın alma sürtünmesini sıfırlıyor.
- Kullanıcı limiti **hiçbir yerde yazmıyor** (ne sayı ne "sınırsız").
- İki tutarsızlık:
  1. **"%20 indirim" yanlış** — ₺750×12 = ₺9.000, yıllık ₺5.200 → gerçek indirim **%42**. Aylık fiyat çapa (anchor).
  2. **e-Fatura kontörü konusunda tam sessizlik** — adet/belge başı ücret/entegratör adı hiçbir yerde yok, "arayın" diyor. "Sürpriz ücret yok" vaadiyle çelişiyor. **Saldırılabilir nokta.**

**Rakip kıyası (yıllık gerçek maliyet, KDV dahil):** Paraşüt tam paket ~₺13.536 · Logo İşbaşı ~₺7.860 · **Defteran ₺5.200** · Bizim Hesap ~₺10.350. → Defteran **fiyat kırıcı**, Paraşüt'ün %62 altında.

## Özellikler (13 modül)

finansal takip · raporlar · **online mutabakat** · banka & kasa · **fatura aktarımı (Excel import)** · mobil · **e-Fatura/e-Arşiv/e-İrsaliye (GİB)** · ürün & stok · çek & senet · teklif yönetimi · alış & gider · **çalışan & puantaj** · düzenli defter

### Paraner'da OLMAYAN (gerçek boşluklar)

1. **e-Fatura / e-Arşiv / GİB** — bizde `businessMenu.tsx` içinde `href: null` placeholder. Türkiye'de ön-muhasebe SaaS'ının **zorunlu bilet fiyatı**. Entegratör anlaşması gerekir (GOREVLER'de "Sonraki Faz — Nilvera").
2. **Excel/CSV içe aktarım** — bizde sadece export var. Bu bir **rakipten göç (switching) silahı**; düşük efor, yüksek dönüşüm.
3. **Fatura kalem editörü** — bizde yok (`FaturalarClient.tsx:216` kendi notumuz: "tek özet kalem yaz"). **e-Fatura + teklif→fatura + stok düşümü hepsi buna kilitli.** İlk sıraya alınmalı.
4. **Mutabakatta güvenli paylaşım linki** — bizim `mutabakat` tamamen içeri dönük (bakiyeler elle giriliyor, "gönderildi" desek de gönderecek şey yok). Defteran: *"karşı tarafın hesabı gerekmez, linkten görür ve onaylar."* Teknik olarak küçük (token'lı public route), anlatısı çok güçlü.
5. **Teklif → Fatura tek-tık dönüşümü** — bizde `invoiced` durumu var ama dönüştüren kod yok.
6. **Fatura → Stok otomatik hareketi** — bizde stok adedi manuel; alış artırmıyor, satış azaltmıyor.
7. **PDF rapor** — bizde `href: null` placeholder, sadece CSV. KOBİ muhasebecisine CSV değil PDF yolluyor.
8. **Puantaj** — bizde çalışan/maaş/izin var, devam-mesai kaydı yok.
9. **Muhasebeciye erişim yetkilendirmesi** (çok kullanıcı/rol) — bizde yok.

### Defteran'ın da YAPMADIKLARI (bizim fırsatımız)

- **Otomatik banka ekstresi** — açıkça "manuel, entegrasyon zorunlu değil" diyorlar.
- **Fiş/fatura OCR** — yok. Bizde `islemler`'de zaten dosya yükleme altyapısı var → doğal uzantı.
- **Offline mobil** — açıkça desteklemiyorlar.
- **Bütçe, KDV takibi, vergi takvimi, veresiye, nakit akışı, kâr-zarar** — Defteran'da **hiç yok**, bizde **var**. Şu an bunları hiç anlatmıyoruz.
- Sosyal giriş (Google/Apple) — onlarda yok, bizde var.

## Asıl silahları: içerik/SEO makinesi

180 URL'nin ~85'i saf içerik:

- **Akademi (33)** — 32 derslik ön muhasebe müfredatı, ders başına ~2.100 kelime, `Course` + `LearningResource` schema.
- **Sözlük (21)** — "cari nedir", "tevkifat nedir"… ~800 kelime, `DefinedTerm` + `FAQPage` schema.
- **Hesaplamalar (9)** — GERÇEK interaktif araçlar: KDV, vergi, faiz, stopaj, brüt-net maaş, net-brüt, amortisman, cari risk, nakit akışı.
- **Kaynaklar (3)** — 2026 vergi takvimi, KDV oranları, kuruluş maliyeti. Yıllık güncellenen link mıknatısı.
- **Bilgi (4)** — "şahıs şirketi nasıl kurulur", "limited nasıl kurulur", vergi levhası, Bağ-Kur → **huninin en tepesi: henüz mükellef bile olmayanı yakalıyor.**
- **Sektörler (7)** — şablon sayfalar, gerçek sektörel özellik yok, sadece terminoloji değişiyor.
- **Kullanım rehberi (14)** — ürün dokümanı, destek yükü azaltma.

**AEO yatırımı:** `robots.txt` GPTBot/ClaudeBot/PerplexityBot'a açık + **`llms.txt` ve `llms-full.txt` (13KB)** yayınlıyorlar. Her sayfada SSS bloğu + FAQPage schema. Amaç: AI cevap motorlarında alıntılanmak.

**Zayıflık:** backlink profili çöp (Knight Online/warez forum spam'i). Yani "kdv hesaplama" gibi head-term'lerde hesaplama.net/EY/Kariyer.net'e karşı kaybediyorlar. Kazandıkları yer uzun kuyruk + AI motorları.

## Landing page ikna mimarisi

Hero → **interaktif panel demosu** → **ROI hesaplayıcı** → **"Bana uygun mu?" quiz** → özelleştirilebilir menü → web+mobil senkron → raporlar → **destek (telefon 4 kez)** → fiyat → **SSS (8 soru + schema)** → CTA → dev footer SEO ağı.

- **Ürün ekranlarını görsel değil HTML/CSS ile çizmişler** — sıfır görsel ağırlığı, mükemmel LCP, ekranlar hep güncel, içindeki metin indekslenebilir. Çok zeki.
- **ROI hesaplayıcı** en güçlü ikna aracı: slider'larla "yılda 82 saat kazanırsın" + "nasıl hesaplıyoruz" şeffaflık linki.
- *"Kredi kartı gerekmez"* mesajı sayfada **4 yerde** tekrar ediyor.

## Bizim ana sayfamızda eksik olanlar

Mevcut: hero (3D küp + beam input + mağaza rozetleri) → 6 emoji özellik kartı → 3 fiyat planı → CTA. Toplam pazarlama rotamız: `/` + `/gizlilik`. **Sitemap'imizde 2 URL var.**

Eksik, ROI sırasına göre:
1. **SSS bölümü + FAQPage schema** — hem ikna hem Google rich snippet. En ucuz kazanç.
2. **Sosyal kanıt** — tek sayı bile yok. (App Store puanı varsa hero'ya.)
3. **Risk giderici mikro-kopya** — CTA altına "Kredi kartı gerekmez · Anında kurulum".
4. **Ürünün nasıl göründüğü** — 3D küp marka anlatıyor ama ürünü göstermiyor. Panel ekranı/mockup yok.
5. **Destek/insan sinyali** — iletişim yok. İşletme planı satıyorsak kritik.
6. **Schema düzeltmeleri** — `SoftwareApplication` `price: "0"` → `AggregateOffer` (₺0/129/349) + `featureList` + `Organization.contactPoint/sameAs` + canonical.
7. **`llms.txt`** — GOREVLER'deki "AEO" maddesinin en ucuz ilk adımı.
8. **Özellik sayfaları** (`/ozellik/[slug]`) — tek şablon + içerik verisi, 1 günlük iş. **Defteran'da olmayan modüllerimize** (bütçe, KDV, vergi takvimi, veresiye, nakit akışı, cüzdan/altın) sayfa açmak = rakipsiz aramalar.
9. **Ücretsiz araçlar** — Defteran'ın *girmediği* nişler: gecikme faizi/vade farkı, serbest meslek makbuzu + tevkifat, şahıs şirketi vergi yükü simülatörü, ücretsiz fatura oluşturucu, kâr marjı/fiyatlandırma, işveren çalışan maliyeti.

## Stratejik özet

Defteran = **iyi kurgulanmış SEO/AEO içerik makinesi + agresif tek-paket fiyat** ile Paraşüt'ün altını oyan yeni oyuncu. Ürünsel derinliği (sektörel özellik, kontör şeffaflığı, kurumsal güven, banka/OCR entegrasyonu) zayıf.

Bizim durumumuz tam tersi: **panel modül kapsamımız onlarınkine yakın veya daha geniş** (bütçe/KDV/vergi takvimi/veresiye/cüzdan onlarda yok), estetiğimiz çok önde, ama **hiç kimse bunu bilmiyor** — çünkü pazarlama sitemiz tek sayfa ve arama motorunda görünmüyoruz.

**Kapanması gereken iki açık:** (1) e-Fatura + fatura kalem editörü (ürünsel bilet fiyatı), (2) içerik/SEO katmanı (görünürlük).

---

## Doğrulama (2026-07-13, elle)

Ajan raporlarındaki her iddia tek tek sınandı. **Ajanın 2 yanlışı düzeltildi.**

### Kendi kodumuz — DOĞRULANDI ✅

| İddia | Kanıt |
|---|---|
| Fatura kalem editörü yok | `faturalar/FaturalarClient.tsx:216` — kendi yorumumuz: *"web basit fatura (kalem editörü yok) → tek özet kalem yaz"* |
| Faturalar stok'a dokunmuyor | `FaturalarClient.tsx` içinde `stok/stock/products/urun` grep'i **boş** |
| Teklif→Fatura dönüşümü yok | `TekliflerClient.tsx:34` sadece `invoiced: { label: "Faturalandı" }` — durum etiketi; dönüştüren kod yok |
| Mutabakat içeri dönük | `mutabakat/` içinde `token/link/share/public` grep'i **boş**. `our_balance`+`their_balance` elle girilen input, `status` elle seçilen dropdown → "Gönderildi" bir şey göndermiyor |
| İçe aktarım yok | `lib/csv.ts` sadece `toCsv` + `downloadCsv`. Panelde `xlsx/parseCsv/içe aktar` grep'i **boş** |
| Puantaj yok | `puantaj/mesai/attendance/overtime` grep'i boş. Var olan: `employees`, `employee_leaves`, `salary_payments` |
| e-Fatura/PDF/OCR yok | `businessMenu.tsx` `href: null` (Yakında): Fiş/Makbuz Tara · Döviz & Altın · PDF Rapor · Muhasebeci Erişimi · SGK · **e-Defter/e-Fatura** |
| Fiş yükleme altyapısı VAR | `lib/receipts.ts` + `IslemlerClient.tsx` drag-drop → OCR doğal uzantı |
| Sitemap 2 URL | `app/sitemap.ts` — sadece `/` ve `/gizlilik` |
| llms.txt yok | `public/` içinde yok |
| Schema zayıf | `layout.tsx:92` `offers: { Offer, price: "0" }` — ₺129/₺349 planları görünmüyor. `featureList` yok, `FAQPage` yok, `Organization` sadece name/url/logo (`contactPoint`/`sameAs` yok). `operatingSystem: "iOS, Android"` → **web paneli sayılmamış** |
| Bizde var, Defteran'da yok | `butceler`, `kdv`, `kdv-raporu`, `vergi-takvimi`, `veresiye`, `nakit-akisi`, `kar-zarar`, `cuzdanim` klasörleri mevcut (34 panel modülü) |

### Ajanın YANLIŞLARI — düzeltildi ❌

- **"canonical yok"** → **YANLIŞ.** `layout.tsx:41` `alternates.canonical: "/"` var.
- **"keywords meta yok"** → **YANLIŞ.** `layout.tsx:23-34` 12 terimlik keywords var.

### Rakip — ham HTML'den DOĞRULANDI ✅

| İddia | Kanıt |
|---|---|
| Fiyat ₺750 / ₺5.200 / ₺433, üstü çizili ₺6.500 | `/ucretler` ham HTML'de dördü de geçiyor |
| **Kontör konusunda sessizlik** | `/ucretler`'de **"kontör" 0 kez** geçiyor. 7 "kredi" var, hepsi "kredi kartı gerekmez" |
| Kullanıcı limiti yazmıyor | `/ucretler`'de kullanıcı sayısı/limit ifadesi yok |
| Hesaplayıcılar gerçek | `/hesaplamalar/kdv` → `<input value="1000" inputmode="decimal">` gerçek interaktif araç (~746 kelime) |
| Agresif schema | Hesaplayıcıda: `SoftwareApplication` + `Offer` + `HowTo` + 3×`HowToStep` + `FAQPage` + 3×`Question` + `BreadcrumbList` |
| Ana sayfa schema | `FAQPage` + **8×Question** + `AggregateOffer` + `ContactPoint` + 3×`Organization` |
| Ürün ekranları CSS ile çizili | Ana sayfada 10 `<img>` ama **gerçek raster görsel sadece 2 tane** (App Store + Google Play rozeti). Panel/mobil ekranları HTML+CSS |
| ROI hesaplayıcı gerçek | 3 gerçek `<input type="range">`: `kazanc-invoices` (10-400), `kazanc-payments` (5-250), `kazanc-reconciles` (0-60) |
| "Kredi kartı gerekmez" tekrarı | Ana sayfada **8 kez** (ajan 4 demişti — daha da fazla) |
| Sosyal kanıt | Hero CTA'nın hemen altında: *"kredi kartı gerekmez · Anında kurulum"* + *"1.000+ işletmenin tercihi"* |
| AI crawler daveti | `robots.txt`: GPTBot, ChatGPT-User, Google-Extended, **anthropic-ai, ClaudeBot**, PerplexityBot → hepsi `Allow`. `llms.txt` + `llms-full.txt` (13KB) yayında |
