# GÖREVLER — paraner-web

> Sadece açık görevler. Tamamlananlar için `DAILY_LOG.md` + git geçmişi.

## Şimdiki
- [ ] **Genel mobil tarama:** ana sayfa + auth ekranlarında telefonda taşma/bozulma var mı, tek tek bak. (Auth + rozetler 06-29'da elden geçti; ana sayfa/diğer bölümler kaldı.)

## İLERİDE
- [ ] **Toast sistemini iyileştir:** Sonner-tarzı çalışıyor; Mehmet daha iyi görünüm/UX araştıracak. Temel sistem oturduktan sonra.
- [x] **Mobil auth (giriş/kayıt) KOYU tema:** 06-29'da yapıldı — mobil (≤1024) artık SİYAH/koyu form (base tema), masaüstü beyaz form korundu. iOS güvenceleri (svh, 16px input) uygulandı. Detay: `DAILY_LOG.md` 06-29. (Cila/ince ayar gerekirse adım adım + onay.)
- [ ] **Hesap silme v2:** admin/dashboard silmede FARKLI mail (kullanıcı kendi silince "Görüşmek üzere" mevcut; biz silersek ayrı bildirim). Trigger'a silme kaynağı ayrımı (user-initiated bayrağı vs dashboard).

## Canlı göz kontrolü (kod tarafı doğrulandı, cihaz teyidi bekliyor)

**Cüzdanım**
- [ ] Canlıda Truncgil fiyatları geliyor mu? Toplam Değer / K-Z / Bugün dolu mu?
- [ ] Web'den eklenen varlık mobilde görünüyor mu (ortak `savings_assets`)? Tersi?
- [ ] İkinci alış → ağırlıklı ortalama maliyet doğru mu? Satış kısmi (maliyet korunur)/tam (varlık silinir)?
- [ ] `savings_asset_movements` mobil ile uyumlu mu? Altın görselleri + varlık türü seçici düzgün mü? İşletme profilinde mantıklı mı?

**Dashboard + kartlar + kategoriler**
- [ ] KPI'lar (Bakiye/Gelir/Gider/Net) doğru mu? Trend grafiği hover tooltip + donut + son işlemler?
- [ ] Hesap ekleme: kart tema seçici + canlı önizleme + para birimine göre IBAN/routing? Kart görselleri her boyutta düzgün mü?
- [ ] Web'de eklenen hesap mobilde doğru mu (card_theme/routing_no/account_no)? Tersi?
- [ ] Kategori ikonları mobil ile aynı mı? Özel kategori (ikon+renk) → işlem/liste/donut doğru mu?
- [ ] İşlem detayı açılınca liste sola kayıyor mu (drawer'ın altına girmiyor)?

**Sidebar**
- [ ] Çoklu para birimi çipi: birden fazla para birimli hesapta çıkıyor mu, filtre doğru süzüyor mu? Tek para birimlide gizli mi?

## Bekleyen

### App Store gönderimi (web destek)
- [ ] **Privacy Nutrition Labels** — App Store Connect anketi (panel işi, kod değil).
- [ ] **Reviewer demo hesabı** — çalışan test e-posta+şifre (`admin@paraner.com`) + "işletme profili hazır" notu.
- [ ] Mobil gizlilik metnini değiştirirse `/gizlilik` ile eşitle.

### Auth / hesap
- [ ] Web kayıt akışı: ek onboarding adımları gözden geçirilecek (OTP + OnboardingModal var).
- [ ] İşletme hesabı eklemede **Stripe ödeme/trial kapısı** (şimdilik direkt açılıyor).

### İşletme paneli
- [ ] Her sayfanın tek tek **tasarım/UX cilası** (sıradaki faz).
- [ ] Dış-entegrasyon "Yakında": Fiş Tara (OCR), Döviz & Altın (API), PDF Rapor, SGK, e-Defter, Muhasebeci.

### Tasarım — opsiyonel cila
- [ ] Sidebar aç/kapa fade; native `confirm()` yerine özel onay diyaloğu + başarı toast; gerçek mobil menü (drawer).
- [ ] LineChart'a Shopify gibi kesik "önceki dönem" karşılaştırma çizgisi.

### 📱 Mobil Claude'a iletilecek
- [ ] Faturalar: `invoices-list` ekranı `?type=`'a göre başlık/filtre (2 ayrı ekran hissi olmasın).
- [ ] `businessMenu.ts`: "Çalışan Listesi" + "Harcama Kayıtları" ikisi de `/employee-expenses` → ayrıştır.
- [ ] **Özel kategoriler cihaz-yerel** (mobil AsyncStorage, web localStorage) → cihazlar arası senkron OLMUYOR. İstenirse ortak DB tablosuna (şema için sor).

## Sonraki Faz (lansman sonrası / v2 — şimdi DEĞİL)
> Önce: arayüzler + Stripe ödeme + app/web temel işler.
- [ ] **E-Fatura / GİB entegrasyonu** — entegratör API (öneri: **Nilvera**, REST/OAuth2). Fatura → UBL-TR XML + mali mühür → GİB. e-Fatura + e-Arşiv. Gerekli: entegratör anlaşması + müşteri mali mührü + kontör. `faturalar/` taslak→gönder akışına bağlanacak. → işletme planı ~699 ₺/ay olabilir.
- [ ] **SEO / AEO (AI görünürlüğü)** — "en iyi finans/gelir-gider uygulaması" aramaları + ChatGPT/AI önerilerinde Paraner. İçerik + schema + landing (ayrı plan).

## Notlar
- DB şemasına dokunma — mobil aynı şemayı kullanıyor; yeni kolon/tablo gerekiyorsa önce sor.
- Tüm yeni modüller: aktif profil (`is_active`) + `user_id = profil id` filtre, ₺/tarih `lib/format`, kategori `lib/categories`.
