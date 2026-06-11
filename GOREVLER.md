# GÖREVLER — paraner-web

## Bekleyen

### Auth / hesap
- [x] **Hesap ekleme** (max 3): switcher'da Bireysel/İşletme oluşturma + otomatik geçiş; **liquid-glass geçiş animasyonu** (PARANER soldan sağa beyaz→yeşil) *(2026-06-11)*
- [ ] Web'de **kayıt akışı** (signUp + onboarding: para birimi / profil oluşturma) — şu an pasif, "önce giriş" denmişti
- [ ] **Şifremi unuttum** (parola sıfırlama e-postası) — link var, işlev yok
- [ ] İşletme hesabı eklemede **Stripe ödeme/trial kapısı** (şimdilik direkt açılıyor; altyapı sonra)

### İşletme paneli — bölüm sayfaları (mobil ile tutarlı)
- [x] **Sol menü** mobil accordion'a geçti + Favoriler + taşma/scroll-fade + Lucide ikonlar *(2026-06-11)*
- [x] **Stok & Ürünler** (urunler, stok), **Çalışanlar** (calisanlar/maaslar/harcamalar/izinler) *(2026-06-11)*
- [x] **Finans** (duzenli-odemeler, cek-senet, borc-alacak, butceler, kdv) *(2026-06-11)*
- [x] **Müşteriler** (musteriler, veresiye, mutabakat, vade) *(2026-06-11)*
- [x] **Faturalar**: satış/alış tek ekran + ?type filtre; **Teklifler** (kalemli), **Düzenli Fatura** *(2026-06-11)*
- [x] **Raporlar** (nakit-akisi, gelir-gider+CSV, kar-zarar, kdv-raporu, vergi-takvimi) *(2026-06-11)*
- [ ] Her sayfanın tek tek **tasarım/UX cilası** (sıradaki faz)
- [x] **İşletme Ayarları** → Ayarlar sayfasına işlendi (Fatura Numaralandırma, Bildirim, Yedek/Export, Roller-yakında) *(2026-06-11)*
- [ ] Dış-entegrasyon "Yakında" öğeleri: Fiş Tara (OCR), Döviz & Altın (API), PDF Rapor, SGK, e-Defter, Muhasebeci

### Modül derinleştirme (mobilde var, web'de v1)
- [ ] **Cüzdanım** tam işlevsel: piyasa fiyatı (Truncgil) entegrasyonu → varlık değeri + K/Z + ekleme/satış
- [x] **İşlemler**: ay filtresi (DB'den o ay) — arama + tür + kategori filtresi de var *(2026-06-11)*
- [ ] **İşlemler**: çoklu para birimi çipi (kaldı)
- [x] **Hesaplar**: hesaplar arası transfer (mobil mantığı: transfer_out/in + ücret + bakiye senkronu, farklı para birimi engelli) *(2026-06-11)*
- [x] İşlem **düzenleme** (modal ortak ekle/düzenle, bakiye mutabakatı); transfer satırı düzenlenemez, silince çift bacak birlikte gider *(2026-06-11)*

### İşlemler — detay paneli + ekler *(2026-06-11)*
- [x] Satıra tıkla → sağ **detay paneli** (yüzen kart, üst bar altından hizalı, Esc/X kapat): tutar, tür, kategori, tarih, **saat**, hesap, **eklendiği yer** (mobil/web/muhasebeci), not.
- [x] **Eklendiği yer** için `transactions.source` kolonu eklendi (web `'web'` yazar; boş/eski/mobil → "Mobil"; ileride `'accountant'`). SQL: `alter table transactions add column if not exists source text;`
- [x] **Dosya/fiş ekleme**: ekleme modalında + detay panelinde **sürükle-bırak/tıkla** (max 3, PNG/JPG/PDF), mobil ile aynı `receipts` bucket + kolonlar. PDF yanlış content-type ile saklanmışsa bile blob ile doğru açılır.

### 📱 Mobil Claude'a iletilecek
- [ ] Faturalar: `invoices-list` ekranı `?type=`'a göre başlık/filtre göstersin (2 ayrı ekran hissi olmasın)
- [ ] `businessMenu.ts`: "Çalışan Listesi" ve "Harcama Kayıtları" ikisi de `/employee-expenses` — gerçek tekrar, ayrıştır

### Tasarım
- [x] Panel Stripe-tarzı redesign'a geçti (koyu+teal): metrik düzeni + sparkline, gruplu/daralabilir sidebar, filtre çipleri, profil/işletme logosu, PARANER wordmark. *(2026-06-10)*
- [ ] Opsiyonel cila: sidebar aç/kapa fade efekti; native `confirm()` yerine özel onay diyaloğu + başarı toast'ı; gerçek mobil menü (drawer)

## Sonraki Faz (lansman sonrası / v2 — şimdi DEĞİL)
> Önce: arayüzler + ödeme altyapısı (Stripe) + app/web temel işler bitsin. Bunlar sonraki aşama.
- [ ] **E-Fatura / GİB entegrasyonu** — özel entegratör API ile (öneri: **Nilvera**, REST/OAuth2). Akış: Paraner'de fatura → entegratör API → UBL-TR XML + mali mühür imza → GİB → durum/PDF dönüşü. Hem **e-Fatura** (kayıtlı firmalar arası) hem **e-Arşiv** (son tüketici) desteklenecek. Gerekli: entegratör anlaşması, müşterinin mali mührü (TÜBİTAK), kontör (~0,75–1,50 ₺/fatura). Mevcut `faturalar/` "taslak"tan "gönder" akışına bağlanacak. → Eklenince işletme planı **699 ₺/ay** (Paraşüt seviyesi) olabilir.
- [ ] **SEO / AEO (AI görünürlüğü)** — "en iyi finans / gelir-gider uygulaması" aramalarında ve ChatGPT/AI önerilerinde Paraner çıksın. Pazarlama sitesi içerik + schema + landing sayfaları (sonraki faz, ayrı plan).

## Notlar
- DB şemasına dokunma — mobil aynı şemayı kullanıyor, yeni kolon/tablo gerekiyorsa önce sor.
- Tüm yeni modüller: aktif profil (`is_active`) + `user_id = profil id` ile filtrele, ₺/tarih için `lib/format`, kategori için `lib/categories`.
