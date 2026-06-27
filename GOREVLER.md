# GÖREVLER — paraner-web

## 🔥 ŞİMDİ — mobil uyum (öncelik)
> Mehmet: masaüstü görünüm iyi, ama **telefonda uyum sorunları var** → önce bunları ele alacağız.
- [ ] **Mağaza rozetleri (3'lü) mobilde:** masaüstü tek satır iyi ama telefonda düzgün otursun (taşma/sarma/hiza). Ana sayfa hero + auth altı rozetler.
- [ ] Genel mobil tarama: ana sayfa + auth ekranlarında telefonda taşma/bozulma var mı, tek tek bak.

## 📌 İLERİDE
- [ ] **Toast sistemini iyileştir:** mevcut Sonner-tarzı çalışıyor; Mehmet araştırıp daha iyi bir görünüm/UX isteyecek. Önce temel sistem otursun, sonra ele alınacak.

## ⚠️ KONTROLLER — bir dahaki "işe başla"da ÖNCE bunları doğrula
> Mehmet app tarafıyla ilgilenirken yapılan web işlerinin doğrulanması bekliyor. Önce bunları gözden geçir.

> ✅ 2026-06-27 doğrulandı (Mehmet): auth koyu mod (çıkış→paraner.com, sol siyah panel, parlak siyah switcher/butonlar, yeşil temizliği, buton loading metinleri), Sonner toast, beam input→otomatik kod, onboarding Ad Soyad, kayıt formu (sadece e-posta), **Google One Tap** (Gmail açıkken paraner.com'da "Continue as Paraner" kartı çıkıyor) — hepsi sorunsuz.
> ✅ 2026-06-27 **Hesap birleşme** doğrulandı: aynı e-posta hem kod hem Google ile → Supabase tek hesapta birleştiriyor (Email+Google tek UID), veri bölünmüyor. Çift hesap riski yok.
> ✅ 2026-06-27 **Onboarding "Hazırlanıyor…" takılması** fix'lendi (bitişte `window.location.assign("/panel")`) — push'lu.
> ✅ 2026-06-27 **Hesap silme veda maili** canlıya alındı: `auth.users` DELETE trigger'ı → `send-farewell-email` (her silme yolu: mobil/web/dashboard tek mail). Web Ayarlar'a **"Hesabı Sil"** butonu eklendi. (paraner-app + paraner-web push'lu.)
- [ ] **Veda maili canlı teyit:** bir test hesabını mobil/web Ayarlar'dan + birini dashboard Danger zone'dan silince "Görüşmek üzere" maili geliyor mu? Çift mail GELMEMELİ.

**Cüzdanım (canlı Truncgil) — yeni**
- [ ] Canlıda (app.paraner.com) Truncgil fiyatları geliyor mu? Toplam Değer / K-Z / Bugün dolu mu?
- [ ] Web'den eklenen varlık **mobilde** görünüyor mu (ortak `savings_assets`)? Tersi de?
- [ ] İkinci alış → **ağırlıklı ortalama maliyet** doğru mu? Satış: kısmi (maliyet korunur) / tam (varlık silinir) doğru mu?
- [ ] `savings_asset_movements` hareket kaydı mobil ile uyumlu mu?
- [ ] Altın görselleri canlıda doğru mu (gram/çeyrek/yarım/tam/cumhuriyet)? Varlık türü dikey açılır seçici düzgün mü?
- [ ] İşletme profilinde Cüzdanım mantıklı çalışıyor mu?

**Sidebar — yeni**
- [x] Hesaplar tekrarı giderildi: Finans'taki "Kasa & Banka Hesapları" kaldırıldı (üst menüde Hesaplar var) *(2026-06-13)*
- [ ] Çoklu para birimi çipi: birden fazla para birimli hesapta çıkıyor mu, filtre doğru süzüyor mu? Tek para birimli kullanıcıda gizli mi?

**Dashboard + kartlar + kategoriler — yeni (2026-06-13)**
- [ ] Genel Bakış dashboard: KPI'lar (Toplam Bakiye/Gelir/Gider/Net) doğru mu? Trend grafiği (hover tooltip) çalışıyor mu? Kategori donut + son işlemler dolu mu?
- [ ] Hesap ekleme: kart tema seçici + canlı önizleme + para birimine göre IBAN/routing alanları doğru mu? Kart görselleri (em-ölçek) her boyutta düzgün mü (ızgara/önizleme/işlem-modalı mini)?
- [ ] Web'de eklenen hesap **mobilde** doğru mu (card_theme/routing_no/account_no ortak kolonlar)? Tersi?
- [ ] Kategori ikonları: temel kategoriler mobil ile aynı ikonu gösteriyor mu? Yeni özel kategori (ikon+renk) → işlem/liste/donut'ta doğru çiziliyor mu?
- [ ] İşlem detayı açılınca liste sola kayıyor mu (drawer'ın altına girmiyor)?

---

## Bekleyen

### App Store gönderimi (mobil) — web tarafı destek
- [x] **Gizlilik Politikası sayfası** `/gizlilik` — App Store'un zorunlu Privacy Policy URL'i. Mobil `app/privacy.tsx` ile eşleşir; Footer + sitemap + KVKK maddesi. URL: `https://paraner.com/gizlilik` *(2026-06-19)*
- [ ] **Privacy Nutrition Labels** — App Store Connect'te elle doldurulan anket (e-posta+finansal işlemler+ad → "uygulama işlevselliği", takip yok). Kod işi değil, panel işi.
- [ ] **Reviewer demo hesabı** — App Review Information'a çalışan test e-posta+şifre (`admin@paraner.com` sim hesabı) + "işletme profili hazır" notu.
- [ ] Mobil ileride gizlilik metnini değiştirirse `/gizlilik` (`app/gizlilik/page.tsx`) ile eşitle.

### Auth / hesap
- [x] **Giriş/kayıt (auth) redesign** *(2026-06-25)*: `/giris`+`/kayit` tek `components/AuthForm` (in-place mod geçişi + URL); üstte Paraner wordmark; iOS tarzı **sürüklenebilir premium switcher** (animasyonlu teal gradient çerçeve); alt "hesabın var mı/yok mu" linkleri kaldırıldı; **sol panele finans videosu** (`AuthSideVideo`, Mixkit 606KB); Google+Apple **yan yana** eşit pill; input + Devam Et tam pill; kart sabit 1440×820 (her ekranda tutarlı). Detay: DAILY_LOG 2026-06-25.
- [x] **Ölü kod temizliği:** `components/AuthVisual.tsx` + `.av-*`/`.fin-card`/`.fc-*` CSS silindi (sol panel videoya geçmişti, import edilmiyordu) *(2026-06-26)*
- [x] **Hesap ekleme** (max 3): switcher'da Bireysel/İşletme oluşturma + otomatik geçiş; **liquid-glass geçiş animasyonu** (PARANER soldan sağa beyaz→yeşil) *(2026-06-11)*
- [ ] Web'de **kayıt akışı** (signUp + onboarding: para birimi / profil oluşturma) — kayıt OTP + OnboardingModal var; ek onboarding adımları gözden geçirilecek
- [x] **Şifremi unuttum** (parola sıfırlama) *(2026-06-26)*: `resetPasswordForEmail` → `/sifre-sifirla` sayfası (recovery oturumu PKCE `?code`/`token_hash` + auto-detect dayanıklı → yeni şifre → `updateUser` → panele). Mobil paritesi. ⚠️ **Supabase config:** Auth → URL Configuration → Redirect URLs'e `https://paraner.com/sifre-sifirla` (+ dev için `http://localhost:3137/sifre-sifirla`) EKLENMELİ, yoksa link reddedilir.
- [ ] İşletme hesabı eklemede **Stripe ödeme/trial kapısı** (şimdilik direkt açılıyor; altyapı sonra)

### İşletme paneli — bölüm sayfaları (mobil ile tutarlı)
- [x] **Sol menü** mobil accordion'a geçti + Favoriler + taşma/scroll-fade + Lucide ikonlar *(2026-06-11)*
- [x] **Sol menü** işletme üst menüsü bireyselle birebir: Genel Bakış·İşlemler·Hesaplar·**Cüzdanım** (eskiden işletmede Cüzdanım hiç yoktu) *(2026-06-12)*
- [x] **Stok & Ürünler** (urunler, stok), **Çalışanlar** (calisanlar/maaslar/harcamalar/izinler) *(2026-06-11)*
- [x] **Finans** (duzenli-odemeler, cek-senet, borc-alacak, butceler, kdv) *(2026-06-11)*
- [x] **Müşteriler** (musteriler, veresiye, mutabakat, vade) *(2026-06-11)*
- [x] **Faturalar**: satış/alış tek ekran + ?type filtre; **Teklifler** (kalemli), **Düzenli Fatura** *(2026-06-11)*
- [x] **Raporlar** (nakit-akisi, gelir-gider+CSV, kar-zarar, kdv-raporu, vergi-takvimi) *(2026-06-11)*
- [ ] Her sayfanın tek tek **tasarım/UX cilası** (sıradaki faz)
- [x] **İşletme Ayarları** → Ayarlar sayfasına işlendi (Fatura Numaralandırma, Bildirim, Yedek/Export, Roller-yakında) *(2026-06-11)*
- [ ] Dış-entegrasyon "Yakında" öğeleri: Fiş Tara (OCR), Döviz & Altın (API), PDF Rapor, SGK, e-Defter, Muhasebeci

### Modül derinleştirme (mobilde var, web'de v1)
- [x] **Cüzdanım** tam işlevsel: Truncgil canlı fiyat (server fetch, 5dk cache) → değer + K/Z + günlük değişim + dağılım donut; ekle (ağırlıklı ort. maliyet)/düzenle/sat (tam→sil, kısmi→koru)/sil; gerçek altın görselleri; varlık türü dikey açılır seçici; `savings_asset_movements` hareket kaydı *(2026-06-11/12)*
- [x] **İşlemler**: ay filtresi (DB'den o ay) — arama + tür + kategori filtresi de var *(2026-06-11)*
- [x] **İşlemler**: çoklu para birimi çipi — filtre satırında, yalnız >1 para birimi varsa görünür *(2026-06-12)*
- [x] **Hesaplar**: hesaplar arası transfer (mobil mantığı: transfer_out/in + ücret + bakiye senkronu, farklı para birimi engelli) *(2026-06-11)*
- [x] İşlem **düzenleme** (modal ortak ekle/düzenle, bakiye mutabakatı); transfer satırı düzenlenemez, silince çift bacak birlikte gider *(2026-06-11)*

### İşlemler — detay paneli + ekler *(2026-06-11)*
- [x] Satıra tıkla → sağ **detay paneli** (yüzen kart, üst bar altından hizalı, Esc/X kapat): tutar, tür, kategori, tarih, **saat**, hesap, **eklendiği yer** (mobil/web/muhasebeci), not.
- [x] **Eklendiği yer** için `transactions.source` kolonu eklendi (web `'web'` yazar; boş/eski/mobil → "Mobil"; ileride `'accountant'`). SQL: `alter table transactions add column if not exists source text;`
- [x] **Dosya/fiş ekleme**: ekleme modalında + detay panelinde **sürükle-bırak/tıkla** (max 3, PNG/JPG/PDF), mobil ile aynı `receipts` bucket + kolonlar. PDF yanlış content-type ile saklanmışsa bile blob ile doğru açılır.

### 📱 Mobil Claude'a iletilecek
- [ ] Faturalar: `invoices-list` ekranı `?type=`'a göre başlık/filtre göstersin (2 ayrı ekran hissi olmasın)
- [ ] `businessMenu.ts`: "Çalışan Listesi" ve "Harcama Kayıtları" ikisi de `/employee-expenses` — gerçek tekrar, ayrıştır
- [ ] **Özel kategoriler cihaz-yerel** (mobil AsyncStorage, web localStorage) → cihazlar arası senkron OLMUYOR. İstenirse ortak DB tablosuna taşınır (şema için Mehmet'e sor). transactions.category id'si paylaşılır ama etiket/ikon/renk yerelde.

### Tasarım
- [x] Panel Stripe-tarzı redesign'a geçti (koyu+teal): metrik düzeni + sparkline, gruplu/daralabilir sidebar, filtre çipleri, profil/işletme logosu, PARANER wordmark. *(2026-06-10)*
- [x] **Genel Bakış → profesyonel dashboard**: 4 KPI + Shopify-tarzı LineChart (hover tooltip) + Kartlarım + Kategori donut + zengin Son İşlemler. Panel içeriği tam genişlik. *(2026-06-13)*
- [x] **Hesaplar/İşlemler mobil seviyesinde**: gerçek kart görselleri (6 tema, em-ölçek), özel tarih/kategori seçici (portal), ikonlu kategoriler + özel kategori ekle/düzenle/sil. *(2026-06-13)*
- [ ] Opsiyonel cila: sidebar aç/kapa fade efekti; native `confirm()` yerine özel onay diyaloğu + başarı toast'ı; gerçek mobil menü (drawer)
- [ ] Opsiyonel: LineChart'a Shopify gibi kesik "önceki dönem" karşılaştırma çizgisi

## Sonraki Faz (lansman sonrası / v2 — şimdi DEĞİL)
> Önce: arayüzler + ödeme altyapısı (Stripe) + app/web temel işler bitsin. Bunlar sonraki aşama.
- [ ] **E-Fatura / GİB entegrasyonu** — özel entegratör API ile (öneri: **Nilvera**, REST/OAuth2). Akış: Paraner'de fatura → entegratör API → UBL-TR XML + mali mühür imza → GİB → durum/PDF dönüşü. Hem **e-Fatura** (kayıtlı firmalar arası) hem **e-Arşiv** (son tüketici) desteklenecek. Gerekli: entegratör anlaşması, müşterinin mali mührü (TÜBİTAK), kontör (~0,75–1,50 ₺/fatura). Mevcut `faturalar/` "taslak"tan "gönder" akışına bağlanacak. → Eklenince işletme planı **699 ₺/ay** (Paraşüt seviyesi) olabilir.
- [ ] **SEO / AEO (AI görünürlüğü)** — "en iyi finans / gelir-gider uygulaması" aramalarında ve ChatGPT/AI önerilerinde Paraner çıksın. Pazarlama sitesi içerik + schema + landing sayfaları (sonraki faz, ayrı plan).

## Notlar
- DB şemasına dokunma — mobil aynı şemayı kullanıyor, yeni kolon/tablo gerekiyorsa önce sor.
- Tüm yeni modüller: aktif profil (`is_active`) + `user_id = profil id` ile filtrele, ₺/tarih için `lib/format`, kategori için `lib/categories`.
