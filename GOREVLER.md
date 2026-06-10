# GÖREVLER — paraner-web

## Bekleyen

### Auth / hesap
- [ ] Web'de **kayıt akışı** (signUp + onboarding: para birimi / profil oluşturma) — şu an pasif, "önce giriş" denmişti
- [ ] **Şifremi unuttum** (parola sıfırlama e-postası) — link var, işlev yok

### Modül derinleştirme (mobilde var, web'de v1)
- [ ] **Cüzdanım** tam işlevsel: piyasa fiyatı (Truncgil) entegrasyonu → varlık değeri + K/Z + ekleme/satış
- [ ] **Faturalar**: kalem (invoice_items) bazlı detaylı fatura + PDF
- [ ] **İşlemler**: ay/tarih filtresi, arama, kategori filtresi, çoklu para birimi çipi (mobildeki gibi)
- [ ] **Hesaplar**: hesaplar arası transfer ekranı
- [ ] İşlem **düzenleme** (şu an sadece ekle/sil)

### Tasarım
- [ ] Panel görünümünü Mobbin referanslarına göre revize et (Mehmet ekran görüntüsü atacak)

## Notlar
- DB şemasına dokunma — mobil aynı şemayı kullanıyor, yeni kolon/tablo gerekiyorsa önce sor.
- Tüm yeni modüller: aktif profil (`is_active`) + `user_id = profil id` ile filtrele, ₺/tarih için `lib/format`, kategori için `lib/categories`.
