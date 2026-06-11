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
- [ ] **İşlemler**: ay/tarih filtresi + çoklu para birimi çipi (arama + tür + kategori filtresi ✅ yapıldı)
- [ ] **Hesaplar**: hesaplar arası transfer ekranı
- [ ] İşlem **düzenleme** (şu an sadece ekle/sil)

### 📱 Mobil Claude'a iletilecek
- [ ] Faturalar: `invoices-list` ekranı `?type=`'a göre başlık/filtre göstersin (2 ayrı ekran hissi olmasın)
- [ ] `businessMenu.ts`: "Çalışan Listesi" ve "Harcama Kayıtları" ikisi de `/employee-expenses` — gerçek tekrar, ayrıştır

### Tasarım
- [x] Panel Stripe-tarzı redesign'a geçti (koyu+teal): metrik düzeni + sparkline, gruplu/daralabilir sidebar, filtre çipleri, profil/işletme logosu, PARANER wordmark. *(2026-06-10)*
- [ ] Opsiyonel cila: sidebar aç/kapa fade efekti; native `confirm()` yerine özel onay diyaloğu + başarı toast'ı; gerçek mobil menü (drawer)

## Notlar
- DB şemasına dokunma — mobil aynı şemayı kullanıyor, yeni kolon/tablo gerekiyorsa önce sor.
- Tüm yeni modüller: aktif profil (`is_active`) + `user_id = profil id` ile filtrele, ₺/tarih için `lib/format`, kategori için `lib/categories`.
