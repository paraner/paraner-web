# Panel Analizi ve Geliştirme Fikirleri

> 2026-08-04. Kaynak: **kendi kodumuz ölçülerek** (web `app/panel/` 30 modül + mobil
> `paraner-app/app/` ekranları, satır satır sayıldı) + `RAKIP-bizimhesap.md` (canlı panel gezildi)
> + `RAKIP-defteran.md` + **720 mağaza yorumu** (rakibin uygulamasına yazılmış).
> Fikir listesidir, karar listesi değil. Kararlar Mehmet'in.

---

## 🔴 Analizin en önemli bulgusu: WEB, MOBİLİN GERİSİNDE

`businessMenu.tsx`'in tepesindeki yorum *"mobil ile birebir tutarlı 8 bölüm"* diyor.
**Artık doğru değil.** Web'de "Yakında" görünen bazı özellikler **mobilde çalışıyor ve kodu yazılmış:**

| Özellik | Web | Mobil | Mobil dosya |
|---|---|---|---|
| **Fiş / Makbuz Tara** | `href: null` (Yakında) | ✅ **çalışıyor** | `receipt-scan.tsx` — 619 satır |
| **Döviz & Altın** | `href: null` (Yakında) | ✅ **çalışıyor** | `exchange.tsx` — 409 satır |
| **PDF Rapor Oluştur** | `href: null` (Yakında) | ✅ **çalışıyor** | `pdf-report.tsx` — 295 satır |
| **SGK Bildirgeleri** | `href: null` (Yakında) | ✅ **çalışıyor** | `sgk-declarations.tsx` — 288 satır |
| **KDV Beyanname Özeti** | **menüde bile yok** | ✅ **çalışıyor** | `vat-declaration.tsx` — 316 satır |
| **Fatura Numaralama** | **menüde bile yok** | ✅ **çalışıyor** | `invoice-numbering.tsx` — 195 satır |
| Muhasebeci Erişimi | `href: null` | 🟡 ekran var (küçük) | `accountant-access.tsx` — 134 satır |

**Ve asıl fark fatura formunda:**

| | Web | Mobil |
|---|---|---|
| Fatura oluşturma | `FaturaFormu.tsx` — **253 satır** | `invoice-create.tsx` — **1256 satır** |
| Kalem editörü | ❌ yok (`:128` *"tek özet kalem yaz"*) | ✅ var (*"En az bir kalem olmalıdır"*, `Satır Toplamı`) |
| Birim seçimi | ❌ | ✅ Adet/Koli/Kutu/Paket/Çift/Düzine/Saat/Kişi/Sefer |
| Vade tarihi | ❌ | ✅ |
| Ödeme hesabı | ❌ | ✅ |
| PDF oluştur/paylaş | ❌ | ✅ |
| Vergi no doğrulama | ❌ | ✅ |

### Bunun anlamı

Panelimize eklenecek en ucuz ve en değerli şeyler **yeni icat değil, mobilde hazır olanı web'e
getirmek.** Ürün zaten var, tasarlanmış, test edilmiş; web tarafı geride kalmış.

Bu aynı zamanda rakibin **en çok şikâyet edilen** hatası: *"webde var mobilde yok"*,
*"bilgisayarda harika ama mobil rezalet"*. Biz **tersini** yaşıyoruz — ama kullanıcı için sonuç aynı:
**iki yüzey aynı şeyi yapmıyor.** Bunu kapatmak hem boşluk doldurur hem tutarlılık kazandırır.

### Web'deki ince modüller (mobil karşılığıyla)

Satır sayısı kalite ölçüsü değil, ama **fark bu kadar büyükse** eksik özellik demektir:

| Modül | Web | Mobil | Fark |
|---|---|---|---|
| Kâr / Zarar | **171** | `profit-loss` 495 | ~3× |
| KDV Raporu | **149** | `vat-report` 413 | ~3× |
| Nakit Akışı | **120** | `cashflow-analysis` 397 | ~3× |
| Vergi Takvimi | **97** | `tax-calendar` 326 | ~3× |
| Vade Takibi | **180** | `aging-report` 409 | ~2× |
| Cari Hesaplar | **224** | `current-accounts` 443 + detay 353 | ~3.5× |
| Veresiye | **342** | `credit-book` 496 | |
| Mutabakat | **358** | `reconciliation` 452 | |

→ **Web'in Raporlar + Vergi bloğu neredeyse bir taslak.** Rakibin 29 raporu var (kârsız);
bizim kâr'ımız var ama sığ. İkisini birleştiren yer burası.

---

## 🆕 Yeni BÖLÜM önerileri (Faturalar seviyesinde)

Bugün 8 bölüm var: Faturalar · Finans · Müşteriler & Tedarikçiler · Çalışanlar · Stok & Ürünler ·
Raporlar · Vergi & Yasal *(+ sabit: Genel Bakış, İşlemler, Hesaplar, Cüzdanım, Ayarlar, Destek, Parla)*.

Aşağıdakiler **yeni üst bölüm** olmayı hak eder. Sıra, gerçekçilik sırasına göre.

### 1. 📅 Takvim & Hatırlatmalar — *en ucuz yeni bölüm, veri zaten bizde*

Rakibin en iyi kurgusu bu: üst barda **rozetli** takvim, tek ekranda **8 katman**.
Bizde aynı bilgiler var ama `vade`, `vergi-takvimi`, `duzenli-odemeler`, `duzenli-fatura`,
`cek-senet` diye **beş ayrı sayfaya** dağılmış. Kullanıcı "bu hafta ne olacak?" diye soramıyor.

- **Takvim** — aylık görünüm, katmanlar: vadesi geçen/yaklaşan alacak · çek-senet vadesi ·
  düzenli ödeme günü · düzenli fatura günü · vergi son günü · maaş günü · serbest not
- **Bugün / Bu Hafta** — tek liste, "yapılacaklar" gibi
- **Hatırlatmalar** — e-posta/bildirim kuralları ("vade 3 gün kala haber ver")
- **Notlarım** — güne iliştirilen serbest not

> Yeni veri modeli **neredeyse gerektirmiyor** — mevcut tabloların üzerine bir okuma katmanı.
> Üst bardaki rozet tek başına "her gün açılma" sebebi yaratır.

### 2. 👥 Ekip & Yetkiler — *zaten "Yakında" diye duruyor, dağınık*

Bugün `AyarlarClient.tsx:1897` "Roller (Yakında)", `Muhasebeci Erişimi` ayrı bir ölü satır,
`Çalışanlar` ise bambaşka bir bölüm (maaş/izin). Üçü aynı ailenin parçası değil ama
**"kim neye erişiyor"** sorusu tek yerde olmalı.

- **Kullanıcılar** — panele erişen kişiler (çalışan listesinden ayrı!)
- **Roller & Yetkiler** — "faturayı görür ama kesemez" seviyesinde
- **Muhasebeci Erişimi** — e-postayla davet, sınırlı görünüm
- **Erişim Kaydı** — kim ne zaman ne yaptı

> ⚠️ DB şeması gerektirir → mobil ekiple ortak karar.
> **Rakip bunu ayrı bir ürüne çevirmiş** (bizimmuhasebeci.com): müşavir kendi paneline giriyor.
> Mali müşavir **ücretsiz büyüme kanalı** — bir kez alışan müşterilerine önerir.

### 3. 📈 İşletme Sağlığı (Analiz) — *bizim rakipsiz alanımız*

Rakipte **yapay zekâ hiç yok** — ne üründe, ne fiyat listesinde, ne mağaza açıklamasında.
Üstelik `robots.txt` ile AI motorlarına da kapalılar. Parla'yı bir sohbet kutusundan
**bir bölüme** çıkarmak, kopyalanması en zor hamle.

- **Gün Sonu / Patron Raporu** — bugün ne sattım, ne tahsil ettim, kasada ne var, yarın ne ödeyeceğim.
  Rakip yorumu: *"gün sonu özeti ya da diğer adıyla patron raporu yok"*
- **Sağlık Skoru** — nakit, tahsilat hızı, kâr marjı, gider trendi tek ekranda
- **Uyarılar** — "bu ay masrafın %40 arttı", "3 müşterinin vadesi geçti", "stok tükeniyor"
- **Parla'ya Sor** — *"geçen ay en çok hangi müşteriden kazandım?"*
  **Rakibin 29 raporda veremediği cevabı biz sohbetle veriyoruz — rapor yazmadan rapor.**

### 4. 🧾 e-Dönüşüm — *bilet fiyatı; geldiğinde kendi bölümü olmalı*

Bugün `Vergi & Yasal` altında tek ölü satır: `e-Defter / e-Fatura`. Gerçekte bu bir aile:

- e-Fatura Gönder / Gelen e-Faturalar · e-Arşiv · e-İrsaliye · e-Müstahsil
- **Kontör bakiyesi ve satın alma** · Entegratör ayarları · GİB mükellef sorgulama

> **Araştırmadan çıkan kolaylaştırıcı bulgu:** Bizim Hesap'ın **kendi entegratörü yok** —
> eLogo, QNB eSolutions, Trendyol e-Faturam ve Uyumsoft'a köprü kuruyor. Yani sıfırdan GİB
> entegrasyonu şart değil, bir entegratörle anlaşmak yeterli.
> ⚠️ **Ama önce fatura kalem editörü gerekiyor** — e-Fatura kalemsiz gönderilemez.

### 5. 🏬 Depo & Lojistik — *Stok bölümü buna dar geliyor*

Bugün `Stok & Ürünler` altında sadece 2 sayfa var; rakipte bu alanda **6 sayfa**.

- Depolar · Depolar arası transfer · **Sayım (envanter)** · İrsaliye · Kargo/teslimat
- **Ölü stok** raporu (rakipte `HAREKET GÖRMEYEN ÜRÜNLER`)

> Rakip yorumu: *"el terminali olarak kullanıyoruz ama sayım modülü yok"* — **onlarda da eksik.**
> ⚠️ Varyant + çoklu depo DB şeması ister → mobil ekiple ortak karar.

### 6. 🏦 Banka & Tahsilat — *büyük iş, ama kategoriyi ayıran özellik*

- Banka hesap bağlama / otomatik ekstre · Otomatik eşleştirme (ekstre ↔ işlem)
- **Ödeme/tahsilat linki** (müşteriye link gönder, kartla ödesin) · POS mutabakatı

> Rakipte **19 banka** entegre; Defteran'da **hiç yok**. `paraner-app/banka-entegrasyonu/`
> klasörü zaten mevcut → oradan devam. Bu bir "sonraki faz" maddesi, hafta işi değil.

### 7. 🛒 Satış Kanalları (e-Ticaret) — *dürüst olmak gerekirse: bizim işimiz değil*

Rakibin `Tam Ticaret` paketi (₺1.100+KDV/ay) tamamen bu: 80+ entegrasyon, pazaryeri, kargo.
Devasa ve sürekli bakım isteyen bir alan.
**Önerim: girmeyelim** — ya da girilecekse tek bir kanalla (ör. yalnız Trendyol) sınırlı girelim.
Buraya harcanacak emek, kâr/mobil/AI tarafında çok daha fazla getirir.

---

## Mevcut bölümlere eklenebilecekler

### 📄 Faturalar *(bugün: Faturalar · Düzenli Fatura · Fiş Tara⛔ · Teklifler)*

- 🥇 **Kalem editörü** — mobilde **hazır** (`invoice-create.tsx`), web'de yok. Teklifler'de de var
  (`TeklifFormu.tsx`: Adet/Açıklama/Kalemi sil). **İki ayrı yerden örnek duruyor.**
  Bu tek özellik üç kapıyı açıyor: **e-Fatura · teklif→fatura · stok düşümü**
- 🥇 **Fiş / Makbuz Tara** — mobilde 619 satırlık çalışan ekran; web'de "Yakında"
- 🥇 **Teklif → Fatura tek tık** — `Faturalandı` durumu var, dönüştüren kod yok
- **Vade tarihi + ödeme hesabı + PDF** — üçü de mobilde var, web'de yok
- **Fatura şablonu** (logo/renk/dipnot) — müşterinin müşterisine giden tek şey
- **Fatura numaralama** — mobilde var (`invoice-numbering.tsx`), web'de menüde bile yok
- **Kısmi tahsilat tutarı** — durum var ama "ne kadarı ödendi" girilmiyor (yarım kalmış)
- **İade faturası** — rakipte de yok, ikimizde de yoksa fırsat
- **Fatura paylaşım linki** — müşteri hesap açmadan görsün/indirsin

### 💰 Finans *(Düzenli Ödemeler · Çek/Senet · Borç-Alacak · Nakit Akışı · Döviz⛔ · KDV · Bütçeler)*

- 🥇 **Döviz & Altın** — mobilde 409 satır çalışıyor; web'de altyapı da hazır
  (`lib/market.ts` + `lib/assets.ts`: 5 altın türü + USD/EUR/GBP). **Çoğunlukla arayüz işi.**
- **Ana ekrana canlı $/€ şeridi** — rakip bunu ana ekranın tepesinde gösteriyor; bugünkü kodla yapılır
- **Kredi takibi** — rakipte modül + takvim katmanı var, bizde yok. KOBİ'nin gerçek derdi
- **Demirbaş / sabit kıymet** — rakipte `Demirbaşlar`
- **Nakit akışı tahmini** — bugünkü `nakit-akisi` 120 satır; mobilde 397. Vadesi gelenlerden
  "önümüzdeki 30 gün" projeksiyonu

### 👥 Müşteriler & Tedarikçiler

- 🥇 **Mutabakata paylaşılabilir link** — bugün bakiyeler **elle** giriliyor ve `Gönderildi` deyince
  **hiçbir şey gönderilmiyor**. Token'lı sayfa + "onaylıyorum/itiraz" düğmesi = küçük iş, güçlü anlatı
- **Bakiyeyi otomatik hesapla** — `cariler`de borç/alacak zaten var; elle giriş hata kaynağı
- **Cari ekstresi** (PDF/link) · **Risk/kredi limiti** · **Cari virman**
- **Müşteriye özel fiyat listesi** — toptancı için satın alma sebebi

### 🧑‍🔧 Çalışanlar

- **Puantaj / mesai** — Defteran'da var, bizde yok
- **Avans takibi** — rakip yorumu: *"avans girince çalışanın hesabında -500 yazması lazım, bu yok"*.
  **Rakipte kırık** → düzgün yapılırsa net üstünlük
- **Bordro PDF** · **SGK Bildirgeleri** (mobilde hazır, web'de "Yakında")
- **Çalışan bazlı satış/tahsilat** — ekibi olan işletme için

### 📦 Stok & Ürünler — *en zayıf bölümümüz (2 sayfa)*

- 🥇 **Ürün içe aktarımını görünür yap** — ⚠️ **CSV aktarımı ZATEN ÇALIŞIYOR** ama `Ayarlar`a gömülü
  (`AyarlarClient.tsx:1616`: ad, kod, birim, alış/satış fiyatı, KDV, stok, kategori;
  kolon eşleştirme + Türkçe başlık tahmini). Ürünler sayfasına düğme + `.xlsx` = neredeyse bedava
- **Varyant** (renk/beden) · **Çoklu depo** · **Barkod** · **Sayım ekranı**
- **Ağırlıklı ortalama maliyet** — rakipte **açıkça bozuk** (*"alış fiyatı 3 yıl önceki fiyatta kalmış"*).
  Kâr hesabının doğruluğu buna bağlı
- **Ondalıklı miktar** (kg/metre) — rakip yorumu: *"adet bazlı, dökme ürün satamıyorum"*.
  `Birim` alanı zaten var, miktarın ondalık kabul etmesi yeter

### 📊 Raporlar — *bizim en görünür üstünlüğümüz, ama sığ*

- 🥇 **Kâr/Zarar'ı derinleştir** — bugün web'de `Bu Ay / Bu Yıl / Net` (171 satır), mobilde 495.
  Eklenecekler: **ürün bazlı kâr · müşteri bazlı kâr · kâr marjı % · dönem karşılaştırma**.
  Rakip yorumu (kullanıcı formülü bile yazmış): *"satıştan alışı çıkarıp neden gösteremiyorsunuz?
  Zor bir şey değil ki bu."* **Rakipte 29 rapor var, kâr yok.**
- 🥇 **PDF rapor** — mobilde hazır (295 satır), web'de "Yakında"
- **Rapor zamanlama** — "her ayın 1'i kâr-zararı e-postala". Kimse yapmıyor
- **BA-BS formu** — müşavirin ilk sorduğu şey

### 🏛 Vergi & Yasal

- **KDV Beyanname Özeti** — mobilde var (316 satır), **web'de menüde bile yok**
- **SGK Bildirgeleri** — mobilde var, web'de "Yakında"
- **Vergi takvimini bildirime bağla** — takvim var, hatırlatma yok (→ yeni Takvim bölümü)

---

## Öncelik önerisi

**1. tur — mobilde hazır olanı web'e getir** *(yeni icat yok, en yüksek getiri)*
Fiş Tara · Döviz & Altın · PDF Rapor · SGK · KDV Beyanname Özeti · Fatura Numaralama ·
**fatura kalem editörü + vade + ödeme hesabı**

**2. tur — yarım kalanları tamamla** *(parçalar duruyor)*
Teklif→Fatura · fatura↔stok · kısmi tahsilat tutarı · ürün içe aktarımını görünür yap ·
mutabakat linki + otomatik bakiye · Kâr/Zarar derinleştirme

**3. tur — yeni bölüm**
📅 Takvim & Hatırlatmalar *(veri hazır, en ucuz yeni bölüm)* → 👥 Ekip & Yetkiler *(DB kararı)*
→ 📈 İşletme Sağlığı *(Parla ile, rakipsiz)*

**4. tur — büyük taahhütler** *(ayrı karar)*
e-Dönüşüm · Depo & Lojistik · Banka & Tahsilat. e-Ticaret'e **girmeme** önerisi.

---

## Rakibin şikâyetlerinden çıkan davranış dersleri

720 yorumun öğrettiği, özellik değil **alışkanlık** dersleri:

| Rakibin hatası | Bizim kuralımız |
|---|---|
| *"Ticket açın diyorlar, dönüş yok"* (%17) | Destek sistemimiz departmanlı + bildirimli — **koru ve öne çıkar** |
| *"2 yıldır gerçek güncelleme yok"* (%13) | Değişiklik günlüğü sayfası — hareket ettiğimiz görünsün |
| *"Her sene %100 zam"* (%32 — en büyük) | Zammı önceden ve gerekçeli duyur, mevcut müşteriye kademeli geç |
| *"Sürekli login istiyor"* | Oturum sürekliliğimiz iyi — **bozma** |
| *"Öneriler dikkate alınmıyor"* | Panelde "özellik öner" + durum takibi. Ucuz, sadakati büyük |
| *"Webde var mobilde yok"* | **Bizde tersi var.** Yeni özellik web+mobil birlikte çıksın |

---

## Doğrulama — ölçülen değerler (04.08.2026)

| İddia | Kanıt |
|---|---|
| Web'de menüsüz sayfa yok | `app/panel/` 30 klasör, hepsi `businessMenu.tsx`/`Sidebar.tsx`'ten erişilebilir |
| Web fatura formu tek satır | `faturalar/FaturaFormu.tsx:128` *"kalem editörü yok → tek özet kalem yaz"* |
| Mobil fatura formu kalemli | `paraner-app/app/invoice-create.tsx` (1256 satır): *"En az bir kalem olmalıdır."*, `Satır Toplamı`, 9 birim, `Vade Tarihi`, `Ödeme Hesabı`, `PDF Paylaş` |
| Mobilde çalışan, webde "Yakında" | `receipt-scan.tsx` 619 · `exchange.tsx` 409 · `pdf-report.tsx` 295 · `sgk-declarations.tsx` 288 |
| Webde menüde bile olmayan | `vat-declaration.tsx` 316 · `invoice-numbering.tsx` 195 |
| Web modülleri ince | satır sayıları: kar-zarar 171 · kdv-raporu 149 · nakit-akisi 120 · vergi-takvimi 97 (mobil karşılıkları 3× civarı) |
| CSV içe aktarım var | `lib/csv.ts` → `parseCsv`; `AyarlarClient.tsx:1616` `IMPORT_SCHEMAS` = müşteri/tedarikçi + ürün |
| Döviz/altın altyapısı hazır | `lib/market.ts` (`fetchMarket`/`getCurrencyRate`/`getGoldBuyPrice`) + `lib/assets.ts` (5 altın + USD/EUR/GBP) |
| Roller "Yakında" | `ayarlar/AyarlarClient.tsx:1897` |
| Pasif satırlar | `businessMenu.tsx`: 36 · 50 · 99 · 100 · 110 · 111 |

### ⚠️ Kendi taslağımda düzelttiklerim

İlk hâlde üç madde `RAKIP-defteran.md`'nin **13.07 tarihli** tablosundan devralınmıştı,
kaynağa bakınca **geçersiz** çıktı:
1. *"`lib/csv.ts` sadece `toCsv`, içe aktarım yok"* → **YANLIŞ**, `parseCsv` + çalışan içe aktarım var
2. *"Döviz için `cuzdanim`den türetilebilir"* (tahmin) → **daha iyisi:** `lib/market.ts` hazır altyapı
3. `lib/receipts.ts` iddiası → **doğruymuş**

> Ders: bir önceki dokümanın doğrulama tablosu **o günün** fotoğrafıdır.
> (`RAKIP-defteran.md`'deki ilgili satır da geçersiz olarak işaretlendi.)

### Bu turda ölçülmeyenler (dürüstlük notu)

- Mobil ekranların **çalıştığını** kodun varlığından çıkardım; **cihazda test etmedim.**
  "Mobilde hazır" derken kastım: ekran dosyası var ve içi dolu.
- Satır sayısı kaba bir gösterge — az satırlı modül illa eksik değildir, ama 3× fark ipucudur.
- Web'e taşıma maliyetini ölçmedim; mobil React Native, web Next.js — **arayüz kodu yeniden yazılır**,
  taşınan şey iş mantığı ve veri modeli.
