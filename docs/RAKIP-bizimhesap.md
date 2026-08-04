# Rakip Analizi — Bizim Hesap (bizimhesap.com)

> 2026-08-04. Kaynak: ham HTML (pazarlama sitesi + fiyat sayfası + sitemap + robots), iTunes API,
> Google Play `batchexecute` API, kendi kodumuzda grep/read.
> **Panel (`/web/ngn/newportal`) HENÜZ GEZİLMEDİ** — Chrome eklentisi bağlı olmadığı için oturumlu
> keşif yapılamadı; bkz. §Eksik kalan.
> Özet: Defteran'ın tersi. Bizden **ürün olarak çok daha derin**, ama **10 yıllık yorgunluk**
> topluyor: mobil 22 aydır güncellenmemiş, Play puanı 3,22, en çok istenen özellik 5 yıldır yapılmamış.

## Kim

- **Bizim Hesap A.Ş.** — kuruluş **2015**, "ticaretin kalbinden gelen" 2 Türk mühendis.
  Adres: Business İstanbul B-Blok Kat:14, Kadıköy/İstanbul.
- ⚠️ App Store satıcı adı farklı: **Infotera Bilgi Sistemleri San. ve Tic. Ltd. Şti.** (eski/teknik tüzel kişilik).
- **Sosyal kanıt gerçek ve büyük:** ana sayfada *"+40.000 KOBİ"*, `hakkimizda`'da dönüm noktası
  *"50.000 kullanıcıya ulaştı"*, Play'de **100 B+ indirme**. İsimli/unvanlı **6 müşteri referansı**
  (mali müşavir dahil) + ayrı bir `bizimkiler` vaka sayfası. Defteran'da bunların hiçbiri yoktu.
- **Yatırım:** **Finberg** (QNB Finansbank'ın fintech yatırım kolu, kuruluşundan bu yana 34M$+
  dağıtmış) erken dönem portföyünde Bizim Hesap var. **Tutar ve tarih hiçbir yerde açıklanmamış** —
  "büyük tur aldılar" iddiasını doğrulayacak bir kaynak bulamadım. Kurumsal ortaklıklar (Opet, Ödeal,
  n11, 19 banka) yatırım değil **ticari iş birliği**; asıl güç buradan geliyor olabilir.
- Konum: KOBİ + **e-ticaret satıcısı** + **saha satış/distribütör** + **üretim**. Bizden ve
  Defteran'dan bir kademe **yukarı** (mikro esnaf değil, çalışanı/deposu/ekibi olan işletme).
- Teknoloji: pazarlama sitesi **Next.js** (RSC payload'ı ham HTML'de görünüyor) + Cloudflare + CDN.
  Panel ayrı: `bizimhesap.com/web/ngn/...` (klasik ASP.NET mirası bir yol yapısı).

## Fiyat (ham HTML'den, KDV **hariç**)

| | Aylık | Yıllık peşin | Yıllık toplam |
|---|---|---|---|
| **Temel Ticaret** (Ön Muhasebe) | ₺1.250 +KDV | **₺870 +KDV/ay** | **₺10.440 +KDV** |
| **Tam Ticaret** (+ e-Ticaret) | ₺1.500 +KDV | **₺1.100 +KDV/ay** | **₺13.200 +KDV** |

- Deneme: **14 gün** (bizimkiyle aynı). Yıllık geçişte "₺4.560 / ₺4.800 daha hesaplı" diyorlar.
- **KDV dahil gerçek yıllık maliyet: Temel ₺12.528 · Tam ₺15.840.**
- **e-Fatura kontörü AYRI ve AÇIKÇA yayınlanmış** (Defteran'ın sakladığı yer):
  200→₺490 · 500→₺1.000 · 1.000→₺1.800 · 2.000→₺3.300 · 10.000→₺13.500 · 100.000→₺99.000 (+KDV).
  Yani **₺2,45'ten ₺0,99'a inen kademeli birim fiyat.** Şeffaflık onların lehine, ama gerçek maliyet
  abonelik + kontör toplamı → bir kullanıcı yorumu bunu *"yan gideri hariç kemiksiz 13 bin"* diye yazmış.
- **Sınırsız kullanıcı + detaylı yetkilendirme fiyata dahil** ve "Sadece Biz'de" rozeti taşıyor.
  Paraşüt/Logo kullanıcı başına ücretlendirdiği için bu gerçek bir fark.

**Rakip kıyası (yıllık, KDV dahil):** Paraşüt tam paket ~₺13.536 · **Bizim Hesap Temel ₺12.528 /
Tam ₺15.840** · Logo İşbaşı ~₺7.860 · Defteran ₺5.200 · **Paraner İşletme Max yıllık ₺8.900**.
→ Bizim Hesap **fiyat kırıcı değil, kapsam satıcısı**: Paraşüt seviyesinde fiyatlıyor, karşılığında
Paraşüt'te olmayan e-ticaret/saha/üretim veriyor.

## Bizden fazlası ne? (asıl soru)

Sıralama: **bizde hiç yok** → yukarıdan aşağı önem sırasına göre.

### A. Yapısal olarak bizde hiç olmayanlar (büyük)

1. **e-Fatura / e-Arşiv / e-İrsaliye / e-İhracat — canlı ve kontörlü.** Bizde `businessMenu.tsx`'te
   `e-Defter / e-Fatura` hâlâ `href: null`. Türkiye'de ön muhasebenin **bilet fiyatı** bu.
2. **19 banka entegrasyonu** — otomatik ekstre/bakiye. Bizde hesap hareketleri elle giriliyor.
   ⚠️ Defteran bunu **açıkça yapmıyordu**; Bizim Hesap yapıyor. Kategoriyi tek başına ayıran özellik bu.
3. **80+ e-ticaret entegrasyonu** — 23 pazaryeri, 7 entegratör, 29-32 altyapı, 10-11 kargo,
   2 fulfillment, 7 e-ihracat, 9 medikal, 3 CRM. Çift taraflı stok senkronu, pazaryerine otomatik
   e-fatura, tek ekrandan fiyat/stok güncelleme, otomatik mutabakat. **Bizde sıfır.**
4. **Saha satış / distribütör modülü** — aracı depo olarak tanımlama, harita üzerinde müşteri,
   Bluetooth yazıcıdan anlık fiş, ekip bazlı günlük satış-stok takibi. Bizde sıfır.
5. **Üretim / reçete** — ürün reçetesi, işçilik dahil ürün bazlı maliyet. Bizde sıfır.
6. **Çoklu depo + varyantlı stok + depolar arası transfer + kritik stok uyarısı.**
   Bizde `stok` var ama tek düzlem: varyant yok, depo yok, transfer yok.
7. **Sınırsız kullanıcı + detaylı yetkilendirme.** Bizde `AyarlarClient.tsx:1897` — *"Roller (Yakında)"*,
   şema gerektiriyor. Onlarda satır bazında yetki (faturayı görür ama kesemez).
8. **Şube takibi** ve **tek hesaptan iki ayrı vergi numarası** yönetimi. Bizde çoklu profil var ama
   şube kavramı yok.
9. **Proje bazlı gelir-gider takibi** — inşaat/yazılım sektörleri için ayrı satış argümanı. Bizde yok.
10. **Kredi takibi** (farklı bankalardaki krediler, ödeme planı, gecikme uyarısı). Bizde yok.
11. **Yazarkasa POS + sanal POS + Ödeal %0 komisyon** — telefonu POS'a çeviriyor, satış otomatik
    ön muhasebeye düşüyor. Bizde ödeme altyapısı hiç yok.
12. **Muhasebeciye tek tık aktarım ("Bizim Muhasebeci")** — mali müşavirin ekranına düşüyor.
    Bizde `Muhasebeci Erişimi` → `href: null`.
13. **BA-BS raporu** — mali müşavirin ilk sorduğu şey. Bizde yok.
14. **Toplu ürün yükleme / toplu fiyat-görsel güncelleme** (Excel import). Bizde sadece export var.
15. **Müşteriye özel fiyat listesi**, **cari virman**, **ekstre paylaşımı**, **SMS ile ödeme
    hatırlatma**, **online fiş okuma (OCR)**, **kapalı devre e-ticaret sitesi (Bizim Sipariş, B2B)**.

### B. İçerik/pazarlama tarafında fazlası

- **436 URL'lik blog** (`blog/sitemap.xml`) + 11 kategori. Bizim sitemap'imiz **2 URL**.
- Kurumsal ortaklık pazarlaması: **Opet akaryakıtın %4'ü "Bizim Para"ya dönüşüyor** (Masrafmatik).
  KOBİ'ye somut nakit faydası vaat eden, kopyalanması zor bir kanca.
- **6 sektör sayfası** (distribütör/toptan-perakende/e-ticaret/üretim/inşaat/yazılım) — Defteran'ın
  şablon sektör sayfalarının aksine **her birinde gerçekten farklı modül anlatılıyor**.
- **"Sadece Biz'de!" rozeti** — fiyat tablosunda 10+ satırda tekrar eden bir farklılaştırma işareti.
- **Arkadaşını davet et** (referans programı) + **Mali Müşavirlere Özel** kanalı + **iş ilanı sayfası**.
- Telefon numarası (`0216 706 0660`) her sayfanın tepesinde — insan/güven sinyali.

## Bizden EKSİKLERİ (fırsat)

1. **🔴 KÂR-ZARAR RAPORU YOK.** Rapor sayfalarında 30+ rapor sayıyorlar; kâr-zarar **yok**. Bu, mağaza
   yorumlarında **5 yıldır** tekrarlanan ve hâlâ yapılmamış en yüksek sesli talep (aşağı bak).
   **Bizde canlı:** `app/panel/kar-zarar` + `gelir-gider-raporu`. **En keskin saldırı noktamız bu.**
2. **Mobil uygulama fiilen terk edilmiş** — hem iOS hem Android **v1.0.168**, iOS'ta yayın tarihi
   **07.10.2024**. Bugün 04.08.2026 → **~22 aydır işlevsel güncelleme yok.** Yorumların ana teması bu.
3. **Mobil ≠ web.** Kullanıcılar "webde olan mobilde yok" diyor: teklifler, varlıklar/borçlar,
   toplu fatura, sayım modülü mobilde yok. Tablet/iPad desteği kırık (yatay mod yok, bazı tabletlere
   kurulmuyor bile), çentikli/kavisli ekranlarda arayüz taşıyor.
4. **Destek algısı kötü** — "ticket açın ama dönüş yok", "tek telefon, tek kişi", canlı destek yok.
   (İlginç: bazı müşteriler tam tersini söylüyor → destek **tutarsız**, kötü değil.)
5. **Fiyat artışı kaçırıyor** — "her sene %100 zam", "9 bin TL yenileme" şikâyetleri; olumlu
   yorumların bile %18'i fiyattan bahsediyor. Yıllık ₺12.528'lik bir maliyeti mikro esnaf kaldıramıyor.
6. **AI'ya kapalılar** — `robots.txt`'te **ClaudeBot, GPTBot, Google-Extended, Applebot-Extended,
   CCBot, Bytespider, meta-externalagent hepsi `Disallow`** (Cloudflare managed blok), `Content-Signal:
   ai-train=no`. Defteran tam tersini yapıp AI motorlarına yalvarıyordu. **AI cevap motorlarında
   Bizim Hesap görünmeyecek** — bu bizim için bedava bir boşluk.
7. **Schema zayıf** — ana sayfada JSON-LD olarak **sadece `Organization`** var. `AggregateOffer` yok,
   `FAQPage` yok, `SoftwareApplication` yok. Fiyatları HTML'de yayınlıyorlar ama Google'a
   yapılandırılmış vermiyorlar.
8. **Yapay zekâ asistanı yok.** Sitede, fiyat tablosunda, mağaza açıklamasında AI geçmiyor
   (blogda "yapay zeka ile ürün bulma" yazısı var, üründe yok). **Parla burada rakipsiz.**
9. **Bireysel/kişisel finans tarafı yok** — bütçe, veresiye, birikim hedefi, cüzdan, enflasyon
   analizi hiç yok; %100 işletme odaklılar.
10. **Oturum yönetimi ilkel** — "bir cihazdan girince diğerinden atıyor", "sürekli login istiyor".
    Bizde çapraz-subdomain kalıcı oturum var.

## Mağaza yorum analizi

| | Google Play | App Store (TR) |
|---|---|---|
| Puan | **3,22** | **3,89** |
| Oy sayısı | **922** | **257** |
| İndirme | 100 B+ | — |
| Sürüm | 1.0.168 | 1.0.168 (07.10.2024) |
| İncelenen yorum | **549** (yazılı, 2017→2026) | **171** (son 171) |

**Play yıldız dağılımı (549 yazılı yorum):** 5★ %60,8 · 4★ %11,8 · 3★ %6,9 · 2★ %2,9 · **1★ %17,5**
→ **Kutuplaşmış**: ya çok memnun ya küfür. Orta yok.

⚠️ **İki alarm sinyali:**
- **Yazılı yorumların ortalaması 3,96 ama genel puan 3,22.** Yani yorum yazmayan, sessizce
  yıldız veren kitle **daha kızgın**.
- **2025-2026 yorumlarının ortalaması 2,63** (n=19). Yorum hacmi de çökmüş:
  2017'de 112 → 2019'da 96 → 2023'te 37 → 2024'te 22 → 2025'te 10 → 2026'da 9.
  **Ürün ivmesini kaybediyor.** Geliştirici yanıt oranı %52 (yanıt veriyorlar, ama şikâyet çözülmüyor).

### Neden mutsuzlar (1-2★ yorumlarda tema payı, n=112)

| Tema | Pay | Ne diyorlar |
|---|---|---|
| **Fiyat / zam** | %32 | *"Her sene %100 zam"* · *"9 bin TL yenileme, programda ne var ki"* · *"3 senelik birlikteliği bitiriyorum"* |
| **Destek / ilgisizlik** | %17 | *"Ticket açın diyorlar, hiçbir dönüş yapmıyorlar"* · *"Canlı destek yok, tek telefon"* · *"2 aydır dönüş alamıyoruz"* |
| **Hata / donma / yavaşlık** | %16 | *"Sistem kapanıyor, hazırladığın fatura çöp oluyor"* · *"Program çok yavaş, pişmanım"* |
| **Geliştirilmiyor** | %13 | *"2 yıldır gerçek güncelleme yok"* · *"Kaplumbağa olsa yol kat ederdi"* · *"Öneriler dikkate alınmıyor"* |
| **Oturum / giriş** | %10 | *"Sürekli login istiyor, iki fatura arka arkaya kesemiyoruz"* · *"Başka cihazdan girince atıyor"* |
| **Arayüz / tasarım** | %8 | *"Mobil rezalet, yazılar çentiğin altında kalıyor"* · *"Rakip uygulamalara göre geride"* |
| **Stok / e-ticaret senkronu** | %8 | *"E-ticarette satılan ürün depodan düşmüyor"* · *"Alış fiyatı 3 yıl önceki fiyatta kalmış"* |
| **Kâr-zarar / rapor eksik** | %6 | *"Kâr zarar olmadığı için kullanmayacağım"* |

**En çarpıcı bulgu:** kâr-zarar talebi **olumlu yorumlarda da** çıkıyor —
*"4-5 yıldır kullanıyorum, kâr/zarar başarısız, lakin herkese tavsiye ederim"* (4★) ·
*"5 yıldır bütün mecralarda dile getiriyorum, gelen mailler hep aynı: 'öyle bir özelliğimiz yok'"* (2★).
Yani **memnun müşteri bile aynı deliği işaret ediyor ve firma 5 yıldır kapatmıyor.**

### Neden seviyorlar (4-5★, n=399+115)

- **Kapsam/fiyat oranı** — *"Bu fiyata düzinelerce çözüm"*, *"kullandığım yüksek fiyatlılar dahil en
  mükemmeli"*. En sık övgü bu.
- **Basitlik / öğrenme kolaylığı** — *"Çok kısa bir eğitim sonrası operasyona dahil ettik"*,
  *"jargonsuz"*. Muhasebe bilmeyen esnaf kullanabiliyor.
- **Web paneli** — *"Bilgisayarda harika"*. Övgülerin neredeyse tamamı **web** için; mobil için değil.
- **Entegrasyon genişliği** — *"neredeyse bütün e-ticaret siteleri ve tüm bankalarla entegre"*.
- **Süreklilik/güven** — *"2020'den beri kesintisiz"*, *"4-5 yıldır kullanıyorum"*. 10 yıllık şirket
  olmanın getirdiği sadakat gerçek.
- **Mali müşavir aktarımı** — *"yüzlerce faturayı birkaç dakikada muhasebe programıma aktarıyorum"*.

## Stratejik özet — bizim için ne anlama geliyor

**Bizim Hesap ≠ Defteran.** Defteran genç bir SEO makinesiydi, ürünü sığdı. Bizim Hesap 10 yıllık,
40-50 bin kullanıcılı, kurumsal ortaklıkları olan, **ürün olarak bizden çok daha derin** bir oyuncu.
Onlarla modül sayısında yarışmak gerçekçi değil — 15 maddelik A listesinin tamamı yıllar sürer.

**Ama tam da bu yüzden yorgunlar:** 3,22 puan, 22 aydır güncellenmeyen mobil, 5 yıldır yapılmayan
kâr-zarar, "öneriler dikkate alınmıyor" diyen sadık müşteriler, çöken yorum hacmi. Klasik
"büyümüş ama hantallaşmış" tablo.

**Saldırı yüzeyi — güçlüden zayıfa:**
1. **Kâr-zarar.** Onlarda YOK, bizde CANLI. Yıllardır isteniyor. Pazarlama cümlesi hazır:
   *"Kâr ettiğinizi görmek için ek modül beklemenize gerek yok."*
2. **Mobil.** Onların mobili terk edilmiş ve estetiği yorumlarda dövülüyor; bizim en güçlü yanımız
   mobil + tasarım. Doğrudan yan yana koyulabilir.
3. **AI (Parla).** Onlarda hiç yok ve robots.txt ile AI motorlarına kapalılar → hem üründe hem
   görünürlükte çift boşluk.
4. **Fiyat.** ₺12.528/yıl'a karşı ₺8.900/yıl. Mikro işletme onları kaldıramıyor; yorumlardaki
   "zam" öfkesi hazır bir kitle.
5. **Destek deneyimi.** "Ticket açın, dönüş yok" → bizim destek sistemimiz (departmanlı, yanıt
   bildirimli) burada somut üstünlük.

**Bizim kapatmamız gereken açıklar (onlar sayesinde netleşti):**
- **e-Fatura** artık ertelenemez — Defteran'da da vardı, Bizim Hesap'ta da var, bilet fiyatı.
- **Banka entegrasyonu** kategoriyi ayıran özellik. Defteran'ın *olmadığı* için Bizim Hesap'ın
  *olduğu* tek büyük madde bu. (Not: `paraner-app/banka-entegrasyonu/` klasörü zaten var → oradan devam.)
- **Excel/CSV içe aktarım** — göç silahı, hâlâ bizde yok.
- **Çoklu kullanıcı + yetkilendirme** — `AyarlarClient.tsx:1897` "Yakında" duruyor; çalışanı olan
  her işletme için giriş şartı.

---

## Doğrulama (2026-08-04)

### Rakip — ham HTML / API'den DOĞRULANDI ✅

| İddia | Kanıt |
|---|---|
| Fiyat ₺870/₺1.100 yıllık, ₺1.250/₺1.500 aylık | `/fiyatlar` RSC payload: `"monthlyPrice":"1.250"`, `"yearlyPrice":"870"`, `"totalPrice":"10.440"`, `"advantage":"4.560"` (Tam paket: 1.500/1.100/13.200/4.800) |
| Kontör fiyatları açık | `/fiyatlar`: 200→490 · 500→1.000 · 1.000→1.800 · 2.000→3.300 · 10.000→13.500 · 100.000→99.000 |
| 14 gün deneme | `/fiyatlar` + ana sayfa: *"14 Gün Ücretsiz Deneyin"* |
| +40.000 KOBİ / 50.000 kullanıcı | ana sayfa hero + `/hakkimizda` dönüm noktaları |
| 2015 kuruluş, 2 mühendis, A.Ş. | `/hakkimizda` birebir metin; footer *"© 2026 Bizim Hesap A.Ş."* |
| App Store satıcısı farklı | iTunes lookup: `sellerName = Infotera Bilgi Sistemleri Sanayi ve Ticaret Ltd. Sti.` |
| **Kâr-zarar raporu yok** | `/ozellikler/raporlar`'da 30+ rapor sayılıyor; "Gelir Gider Durumu" var, **"kâr" kelimesi geçmiyor**. Yorumlarda firma cevabı: *"öyle bir özelliğimiz yok"* |
| **AI crawler'lara kapalı** | `robots.txt`: ClaudeBot/GPTBot/Google-Extended/Applebot-Extended/CCBot/Bytespider/meta-externalagent → `Disallow: /` + `Content-Signal: ai-train=no` |
| Schema zayıf | Ana sayfada tek JSON-LD bloğu: `Organization`. `AggregateOffer`/`FAQPage`/`SoftwareApplication` yok |
| Blog 436 URL | `blog/sitemap.xml` içinde 436 `<loc>` |
| Ana sitemap 30 URL | `sitemap.xml` |
| Reklam funnel'ı aktif | ana sayfada `googletagmanager.com` (5), `fbq` (6), `facebook.net`, `linkedin.com` |
| Play 3,22 / 922 oy / 100 B+ | Play sayfası JSON-LD `aggregateRating: 3.22, ratingCount: 922` |
| iOS 3,89 / 257 oy / v1.0.168 07.10.2024 | iTunes lookup `averageUserRating`, `userRatingCount`, `currentVersionReleaseDate` |
| 549 Play yorumu analizi | `batchexecute` `UsvDTd`, 4 sayfa, tekilleştirilmiş |
| Finberg yatırımcı | webrazzi.com/2022/02/21/finberg-yatirim-sirketi — Bizim Hesap portföyde listeli, **tutar/tarih yok** |

### Kendi kodumuz — DOĞRULANDI ✅

| İddia | Kanıt |
|---|---|
| Kâr-zarar bizde CANLI | `app/panel/kar-zarar/` + `businessMenu.tsx:97` `href: "/panel/kar-zarar"` |
| e-Fatura bizde YOK | `businessMenu.tsx:111` `e-Defter / e-Fatura` → `href: null` |
| Muhasebeci erişimi YOK | `businessMenu.tsx:100` → `href: null` |
| PDF rapor YOK | `businessMenu.tsx:99` → `href: null` |
| Fiş/makbuz tarama YOK | `businessMenu.tsx:36` → `href: null` |
| Çoklu kullanıcı/rol YOK | `app/panel/ayarlar/AyarlarClient.tsx:1897` — *"Roller (Yakında) — çok-kullanıcılı yetkilendirme, şema gerektirir"* |
| Proje / kredi / depo / şube / üretim / puantaj YOK | `app/panel/` altında bu adlarda klasör yok (39 modül listelendi) |
| Çek-senet, teklif, mutabakat, stok, ürün VAR | `app/panel/cek-senet`, `teklifler`, `mutabakat`, `stok`, `urunler` |
| Paraner İşletme Max yıllık ₺8.900 | `lib/plans.ts:120-122` — `price: "741"`, `totalLabel: "Toplam ₺8.900/yıl"` |

### DÜZELTME — eski kayıttaki yanlış

- `docs/RAKIP-defteran.md`'de *"Bizim Hesap ~₺10.350"* yazıyordu. **Güncel değil:**
  KDV dahil yıllık gerçek maliyet **₺12.528** (Temel) / **₺15.840** (Tam). Satır güncellendi.

## Eksik kalan — bir sonraki turda yapılacak

- 🔴 **Panel gezilmedi.** `https://bizimhesap.com/web/ngn/newportal` oturum ister; Claude for Chrome
  eklentisi bu makinede **bağlı değil** (`list_connected_browsers` → boş liste). Eklenti bağlanınca
  şunlar çıkarılacak: sol menü ağacı, dashboard KPI'ları, kontör bakiyesi göstergesi, deneme süresi
  uyarısı, arayüz yaşı/teknolojisi, gerçekten kâr-zarar olmadığının panelden teyidi.
- Blog'un trafik/sıralama gücü ölçülmedi (436 URL'nin kaçı gerçekten sıralanıyor?).
- Kurumsal ortaklıkların (Opet, Ödeal, n11, 19 banka) ticari şartları bilinmiyor.
