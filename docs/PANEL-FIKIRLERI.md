# Panelimize Ne Eklenebilir — fikir listesi

> 2026-08-04. Kaynak: kendi kodumuz (`app/panel/businessMenu.tsx` + modül dosyaları, okundu) +
> `RAKIP-bizimhesap.md` (canlı panel gezildi) + `RAKIP-defteran.md` + **720 mağaza yorumu**
> (549 Play + 171 iOS, rakibin uygulamasına yazılmış).
> Bu bir **fikir listesi**, karar listesi değil. Sıralama fayda/emek oranına göre; kararlar Mehmet'in.

## Neden bu fikirler? — üç kaynak

1. **Rakipte var, bizde yok** → müşteri karşılaştırınca gördüğü eksik.
2. **Rakipte de yok ve müşteri bağırıyor** → en değerli tür; rakip 5 yıldır yapmamış.
3. **Bizde yarısı zaten var** → parça duruyor, birleştirilince özellik çıkıyor. En ucuzu.

---

## 🥇 Önce şunlar — en yüksek fayda/emek

| # | Fikir | Neden | Emek |
|---|---|---|---|
| 1 | **Fatura kalem editörü** | Kod **zaten yazılı**: `teklifler/TeklifFormu.tsx` kalem ekliyor/siliyor. `FaturaFormu.tsx:128` kendi yorumu: *"web basit fatura (kalem editörü yok) → tek özet kalem yaz"*. e-Fatura, teklif→fatura, stok düşümü **hepsi buna kilitli** | Küçük |
| 2 | **Teklif → Fatura tek tık** | `teklifler`de `Faturalandı` durumu var ama **dönüştüren kod yok**. Kalem editörü gelince neredeyse bedava | Küçük |
| 3 | **Fatura ↔ Stok otomatik hareketi** | `urunler`de stok, `stok`ta hareket var; fatura ikisine de dokunmuyor. Rakipte bu kırık ve **yorumlarda şikâyet konusu**: *"e-ticarette satılan ürün depodan düşmüyor"* | Küçük-Orta |
| 4 | **İçe aktarımı görünür yap + genişlet** | ⚠️ **Zaten VAR ama saklı:** `Ayarlar` içinde müşteri/tedarikçi ve ürün CSV içe aktarımı, kolon eşleştirmeli ve Türkçe başlık tahminli (`AyarlarClient.tsx:1616+`). Eksik olan: **`.xlsx` desteği** (bugün sadece düz CSV metni), **fatura/işlem** aktarımı ve **görünürlük** — göç silahı Ayarlar'ın dibinde duruyor | Küçük |
| 5 | **"Kâr" panelini öne çıkar** | Rakipte **YOK** (29 rapor, hiçbiri kâr) ve 5 yıldır isteniyor. Bizde `kar-zarar` var ama **derinliği yok** (`Bu Ay/Bu Yıl/Net`). Ürün bazlı kâr + kâr marjı eklenirse **doğrudan saldırı silahı** | Orta |
| 6 | **PDF çıktı** | `businessMenu.tsx:99` `href: null`. Rakip yorumlarında mali müşavire gönderme sürekli geçiyor. CSV muhasebeciye gitmiyor, PDF gidiyor | Orta |

---

## Bölüm bölüm fikirler

### 📄 Faturalar (bugün: Faturalar · Düzenli Fatura · Fiş Tara⛔ · Teklifler)

**Şu an ne var:** alış/satış ayrımı, durum akışı (taslak → gönderildi → kısmi → ödendi → vadesi geçti
→ iptal), tarih filtresi, yazdır. Fatura formu **tek satır**: firma, tutar (KDV hariç), KDV %,
tarih, ödeme durumu.

**Eklenebilecekler:**

- 🥇 **Kalem editörü** (yukarıda #1). Ürün seç → adet × birim fiyat → satır iskontosu → KDV satır bazlı.
  Ürün kataloğundan seçilebilmeli ki stok ve kâr hesabı bağlansın.
- 🥇 **Teklif → Fatura dönüşümü** (#2).
- **Fatura şablonu / marka** — logo, renk, banka bilgisi, dipnot. Rakipte `Fatura/İrsaliye Ayarı` +
  `Teklif ve Özel Şablonlar` diye **iki ayrı sayfa** var. Küçük iş, algıda büyük fark
  (müşterinin müşterisine giden tek şey bu).
- **İrsaliye / sevk belgesi** — rakipte `Sevk Tarihleri` takvim katmanı bile var.
- **İade faturası** — rakip yorumu: *"perakende satışlarda iade işlemi yok"* (onlarda da eksik).
  Bizde de yok. **İkimizde de yoksa fırsat.**
- **Kısmi tahsilat kaydı** — durum olarak `Kısmi ödendi` var ama *"ne kadarı ödendi"* girilmiyor.
  Yarım kalmış özellik, tamamlaması ucuz.
- **Fatura linki (public görünüm)** — token'lı sayfa, müşteri hesap açmadan faturayı görür/indirir.
  Defteran'ın mutabakatta kullandığı numara; faturada kimse yapmıyor.
- **Fiş/Makbuz Tara** (`href: null`) — altyapı **zaten var**: `lib/receipts.ts` + `IslemlerClient`
  sürükle-bırak. Parla zaten fiş okuyor (`~/Developer/Paraner/parla/`). **Bağlanmayı bekliyor.**
- **Toplu işlem** — çoklu seçip toplu "ödendi" / toplu PDF / toplu yazdır.
  Rakip yorumu: *"toplu fatura kesme özelliği yok"* (mobilde).

### 💰 Finans (bugün: Düzenli Ödemeler · Çek/Senet · Borç-Alacak · Nakit Akışı · Döviz⛔ · KDV · Bütçeler)

- 🥈 **Birleşik vade takvimi** — rakibin en güzel kurgusu. Üst barda **rozetli** takvim, tek ekranda
  **8 katman**: vadesi geçen/yaklaşan çek-senet, vadesi geçen/yaklaşan masraf, alış-satış faturaları,
  sevk tarihleri, kredi ödemeleri, serbest notlar. Bizde `vade` + `vergi-takvimi` **ayrı ve dar**.
  Veriler zaten elimizde — bu **birleştirme işi**, yeni veri değil. Ucuz ve gösterişli.
- **Kredi takibi** — rakipte `Krediler` modülü + takvimde ödeme günü var, bizde yok.
  KOBİ'nin gerçek derdi. Basit hâli: banka, tutar, taksit, vade → takvime düşsün.
- **Demirbaş / sabit kıymet** — rakipte `Demirbaşlar`. Amortisman olmadan bile "neyim var" listesi işe yarar.
- 🥈 **Döviz & Altın** (`href: null`) — ⚠️ **altyapı ZATEN HAZIR:** `lib/market.ts`
  (`fetchMarket`, `getCurrencyRate`, `getGoldBuyPrice`, değişim yüzdeleri) + `lib/assets.ts`
  (gram/çeyrek/yarım/tam/cumhuriyet altını, USD/EUR/GBP). Bugün yalnız `cuzdanim/page.tsx`
  kullanıyor. **Sayfayı açmak neredeyse sadece arayüz işi.**
  Rakip **ana ekranın tepesinde canlı $/€ alış-satış şeridi** gösteriyor — bizde bu şerit
  bugünkü kodla bile yapılabilir; küçük ama her gün bakılan şey.
- **Banka entegrasyonu** — kategoriyi ayıran özellik. Rakipte **19 banka**, Defteran'da yok.
  Büyük iş ama `paraner-app/banka-entegrasyonu/` klasörü zaten var → oradan devam.
  ⚠️ Bu bir "sonraki faz" maddesi, hafta işi değil.

### 👥 Müşteriler & Tedarikçiler (bugün: Kartlar · Cariler · Veresiye · Mutabakat · Vade)

- 🥈 **Mutabakata paylaşılabilir link** — bugün `mutabakat` tamamen içeri dönük: bakiyeler **elle**
  giriliyor, `Gönderildi` deyince **hiçbir şey gönderilmiyor**. Token'lı public sayfa + karşı taraf
  "onaylıyorum/itiraz" düğmesi = küçük teknik iş, **çok güçlü anlatı**. Defteran bunu satış
  argümanı yapmış: *"karşı tarafın hesabı gerekmez, linkten görür ve onaylar."*
- **Bakiyeyi otomatik hesapla** — mutabakattaki "Bizim Bakiye" elle giriliyor; `cariler`de zaten
  borç/alacak var. Elle girilen alan = hata kaynağı.
- **Ekstre gönderimi** — cariye dönem ekstresi PDF/link. Rakipte `Ekstre Paylaşımı` var.
- **Müşteriye özel fiyat listesi** — rakipte `Özel Fiyat Listeleri` (yeni rozetli, yani yatırım
  yapıyorlar). Toptancı için satın alma sebebi.
- **Cari virman** — iki cari arası aktarım. Rakipte var, küçük iş.
- **Risk limiti / kredi limiti** — cariye limit koy, aşınca uyar. Veresiye defteriyle çok uyumlu.
- **Fihrist benzeri "diğer kişiler"** — rakipte müşteri/tedarikçi **dışındaki** kişi kartları
  (*"muhasebeciniz, köşedeki pideci, banka şubesi"*). Küçük ve sevimli; ama bizde `musteriler`
  kartlarına bir "tür" alanı eklemek muhtemelen yeterli — ayrı modül şart değil.

### 🧑‍🔧 Çalışanlar (bugün: Liste · Maaşlar · Harcamalar · İzinler)

- **Puantaj / mesai** — Defteran'da var, bizde yok. Devam-mesai kaydı → maaş hesabına bağlanır.
- **Avans takibi** — rakip yorumu (2★): *"avans girdiğinde çalışanın hesabında -500 yazması lazım,
  bu yok"*. **Rakipte kırık** → bizde düzgün yapılırsa net üstünlük.
- **Maaş bordrosu çıktısı** (PDF) ve **SGK bildirge hatırlatması** (`href: null` duruyor).
- **Çalışan bazlı satış/tahsilat raporu** — rakipte `KULLANICI SATIŞ-TAHSİLAT RAPORU` var.
  Ekibi olan işletme için performans takibi.

### 📦 Stok & Ürünler (bugün: Katalog · Stok Takibi) — **en zayıf bölümümüz**

Bugün: ürün/hizmet, alış-satış fiyatı, birim, başlangıç stoğu, kritik stok uyarısı; stok tarafında
giriş/çıkış/düzeltme. Rakipte bu bölümün altında **6 sayfa** var.

- 🥇 **Ürün içe aktarımını Ayarlar'dan ÇIKAR** (#4) — ürün CSV aktarımı **zaten çalışıyor**
  (ad, kod, birim, alış/satış fiyatı, KDV, stok, kategori) ama Ayarlar'a gömülü.
  Ürünler sayfasına *"Excel/CSV'den Yükle"* düğmesi + `.xlsx` desteği = neredeyse bedava kazanç.
- **Varyant** (renk/beden) — rakipte ayrı sayfa. Giyim/ayakkabı satan herkes için giriş şartı.
- **Çoklu depo + depolar arası transfer** — rakipte `Depolar`, varsayılan `Ana Depo`.
- **Barkod** — okutarak ürün bulma/satış. Rakip yorumu: *"el terminali olarak kullanıyoruz, sayım
  modülü yok"* → **sayım (envanter) ekranı** da rakipte eksik, bizde fırsat.
- **Ölü stok raporu** — rakipte `HAREKET GÖRMEYEN ÜRÜNLER`. Basit sorgu, patron için değerli.
- **Ağırlıklı ortalama maliyet** — rakip yorumu (1★): *"yeni aldığınız fiyatla eski fiyatın
  ortalamasını bile alamıyor"*, *"alış fiyatı 3 yıl önceki fiyatta kalmış"*.
  **Rakipte açıkça bozuk.** Kâr hesabının doğruluğu buna bağlı → #5 ile birlikte düşünülmeli.
- **Kg/metre gibi ondalıklı satış** — rakip yorumu: *"adet bazlı satış yapıyor, dökme ürün satamıyorum"*.
  Manav/kasap/hırdavatçı. `Birim` alanı zaten var, miktarın ondalık kabul etmesi yeter.

### 📊 Raporlar (bugün: Gelir/Gider · Kâr-Zarar · KDV · PDF⛔ · Muhasebeci⛔)

> **Stratejik not:** rakipte **29 rapor var ama kâr yok**; bizde kâr **var ama sığ**.
> Bu bölüm bizim en görünür üstünlüğümüz — derinleştirmeye değer.

- 🥇 **Kâr-Zarar'ı derinleştir** — bugün `Bu Ay / Bu Yıl / Net`. Eklenebilir:
  **ürün bazlı kâr**, **müşteri bazlı kâr**, **kategori bazlı**, **kâr marjı %**, dönem karşılaştırma
  (geçen aya/geçen yıla göre). Rakip yorumu: *"satış faturasında alış fiyatı da var, satıştan alışı
  çıkarıp neden gösteremiyorsunuz? Zor bir şey değil ki bu."* — **müşteri formülü bile yazmış.**
- 🥈 **PDF rapor** (#6) + **"patron raporu" / gün sonu özeti** — rakip yorumu: *"gün sonu özeti
  ya da diğer adıyla patron raporu yok"*. Tek sayfa: bugün ne sattım, ne tahsil ettim, kasada ne var,
  yarın ne ödeyeceğim. **Günlük açılma sebebi yaratır** (retention).
- **Muhasebeci erişimi** (`href: null`) — rakip bunu **ayrı bir ürüne** çevirmiş
  (bizimmuhasebeci.com; e-postayla davet, müşavir kendi paneline giriyor, gelen e-faturaları,
  masraf evraklarını, banka hareketlerini, KDV raporunu görüyor).
  Bizde çoklu-kullanıcı şeması zaten gerekiyor (`AyarlarClient.tsx:1897` "Roller — Yakında") →
  **ikisi aynı işin parçası.** Muhasebeci = ücretsiz büyüme kanalı: müşavir bir kez alışırsa
  müşterilerine önerir.
- **BA-BS formu** — rakipte var, müşavirin ilk sorduğu şey.
- **Rapor zamanlama** — "her ayın 1'i kâr-zararı e-postala". Kimse yapmıyor.

### 🏛 Vergi & Yasal (bugün: Vergi Takvimi · SGK⛔ · e-Defter/e-Fatura⛔)

- 🥇 **e-Fatura / e-Arşiv** — Türkiye'de ön muhasebenin **bilet fiyatı**; Defteran'da da,
  Bizim Hesap'ta da var. Bizde `href: null`.
  ⚠️ Önemli bulgu: **Bizim Hesap'ın kendi entegratörü yok** — eLogo, QNB eSolutions,
  Trendyol e-Faturam ve Uyumsoft'a köprü kuruyor. Yani biz de bir entegratörle anlaşarak
  girebiliriz, sıfırdan GİB entegrasyonu şart değil. **Ama önce kalem editörü (#1) lazım.**
- **Kontör şeffaflığı** — Bizim Hesap kontör fiyatını **açıkça yayınlıyor** (200→₺490 … 100.000→₺99.000),
  Defteran **saklıyor**. Biz girersek açık fiyat tarafında olmalıyız; bu bir güven farkı.
- **Vergi takvimini bildirimle bağla** — takvim var ama hatırlatma yok.
- **Beyanname hazırlık özeti** — KDV raporu var; "bu ay ne ödeyeceksin" tek satır özeti eklenebilir.

### 🤖 Parla (bizim rakipsiz alanımız)

Rakipte **yapay zekâ hiç yok** — ne üründe, ne fiyat tablosunda, ne mağaza açıklamasında.
Üstelik `robots.txt` ile AI motorlarına da kapalılar. Bu alan tamamen bizim.

- **Rapor sorularını Parla cevaplasın** — *"geçen ay en çok hangi müşteriden kazandım?"*
  Rakibin 29 raporda veremediği cevabı biz sohbetle veriyoruz. **Rapor yazmadan rapor.**
- **Fiş fotoğrafı → fatura/gider** (altyapı hazır, bağlanmayı bekliyor).
- **Proaktif uyarı** — "bu ay masrafın %40 arttı", "3 müşterinin vadesi geçti".
- **Excel içe aktarımda kolon eşleştirmeyi Parla yapsın** — #4'ün en sıkıcı kısmı bu; AI ile
  sürtünmesiz olur ve rakibin yapamayacağı bir şey.

---

## Rakibin şikâyet listesinden çıkan "yapmamamız gerekenler"

720 yorumun bize öğrettiği, özellik değil **davranış** dersleri:

| Rakibin hatası | Bizim kuralımız olsun |
|---|---|
| *"Ticket açın diyorlar, hiçbir dönüş yok"* (%17 şikâyet) | Destek sistemimiz departmanlı ve bildirimli — **bunu koru ve öne çıkar** |
| *"2 yıldır gerçek güncelleme yok"* (%13) | Değişiklik günlüğü (changelog) sayfası — "biz hareket ediyoruz" görünür olsun |
| *"Her sene %100 zam"* (%32 — en büyük şikâyet) | Fiyat artışını önceden ve gerekçeli duyur; mevcut müşteriye kademeli geç |
| *"Sürekli login istiyor, iki fatura arka arkaya kesemiyoruz"* | Oturum sürekliliği bizde zaten iyi — **bozma** |
| *"Öneriler dikkate alınmıyor"* | Panelde "özellik öner" + durum takibi. Ucuz, sadakat etkisi büyük |
| *"Webde var mobilde yok"* | Yeni özellik **web + mobil birlikte** çıksın (CLAUDE.md'deki etki haritası kuralı zaten bunu diyor) |

---

## Uyarılar (fikirleri değerlendirirken)

- **Emek tahminleri kabadır** — "küçük" dediklerim mevcut kodun yanına eklenen şeyler; DB şeması
  gerektirenler (varyant, çoklu depo, roller, krediler) **mobil ekiple ortak karar** ister
  (`DB şemasına dokunma` kuralı).
- **Modül sayısında rakiple yarışmak gerçekçi değil** — Bizim Hesap 10 yıllık, 40-50 bin kullanıcılı.
  Yukarıdaki listenin tamamı yıllar sürer. Değerli olan **seçicilik**: kâr, mobil, AI, tasarım,
  destek — bizim güçlü olduğumuz ve onların yorgun olduğu yerler.
- **Bu doküman karar değil.** Sıra ve kapsam Mehmet'in; buradan seçilenler `GOREVLER.md`'ye taşınır.

---

## Doğrulama — kendi kodumuzdan (04.08.2026)

| İddia | Kanıt |
|---|---|
| Fatura formu tek satır, kalem editörü yok | `faturalar/FaturaFormu.tsx:128` kendi yorumu: *"web basit fatura (kalem editörü yok) → tek özet kalem yaz"*; form alanları: firma, tutar, KDV %, tarih, ödeme durumu |
| **Kalem editörü Tekliflerde VAR** | `teklifler/TeklifFormu.tsx` → `Adet`, `Açıklama`, `Kalemi sil` |
| Teklif→Fatura dönüşümü yok | `teklifler`de yalnız `Faturalandı` durum etiketi; dönüştüren kod yok |
| Mutabakat içeri dönük | `mutabakat/MutabakatClient.tsx` → `Bizim Bakiye` elle girilen alan, `Gönderildi` elle seçilen durum |
| Kâr-Zarar sığ | `kar-zarar` → yalnız `Bu Ay` / `Bu Yıl` / `Net` |
| Stok tek düzlem | `stok` → `Giriş`/`Çıkış`/`Düzeltme`; varyant/depo yok. `urunler` → alış-satış fiyatı, birim, kritik stok uyarısı |
| Pasif satırlar (`href: null`) | `businessMenu.tsx`: Fiş/Makbuz Tara (36) · Döviz & Altın (50) · PDF Rapor (99) · Muhasebeci Erişimi (100) · SGK (110) · e-Defter/e-Fatura (111) |
| Roller "Yakında" | `ayarlar/AyarlarClient.tsx:1897` |
| Fiş altyapısı var | `lib/receipts.ts` mevcut |
| **Döviz/altın altyapısı hazır** | `lib/market.ts` (`fetchMarket`/`getCurrencyRate`/`getGoldBuyPrice`) + `lib/assets.ts` (5 altın türü + USD/EUR/GBP); bugün yalnız `cuzdanim/page.tsx` kullanıyor |
| **CSV içe aktarım zaten var** | `lib/csv.ts` → `toCsv` + `parseCsv` + `downloadCsv`; `AyarlarClient.tsx:1616` `IMPORT_SCHEMAS` = müşteri/tedarikçi + ürün, kolon eşleştirme + TR başlık tahmini (`HEADER_HINTS`) |

### ⚠️ Kendi taslağımda düzelttiklerim

İlk yazdığım hâlde üç madde `RAKIP-defteran.md`'nin **13.07 tarihli** doğrulama tablosundan
devralınmıştı ve **artık geçerli değildi** — kaynaktan bakınca çıktı:

1. *"`lib/csv.ts` sadece `toCsv`, içe aktarım yok"* → **YANLIŞ.** `parseCsv` var ve
   Ayarlar'da çalışan bir içe aktarım ekranı bağlı. Öneri "sıfırdan yap"tan
   "görünür yap + `.xlsx` ekle"ye indi.
2. *"Döviz & Altın için `cuzdanim`den türetilebilir"* (tahmin) → **daha iyisi:** `lib/market.ts` +
   `lib/assets.ts` diye hazır ve genel bir altyapı var.
3. `lib/receipts.ts` iddiası → **doğruymuş**, teyit edildi.

> Ders: bir önceki dokümanın doğrulama tablosu **o günün** fotoğrafı; yeni öneri yazarken
> kaynağa tekrar bakılmalı. (`RAKIP-defteran.md`'deki ilgili satır da düzeltildi.)
