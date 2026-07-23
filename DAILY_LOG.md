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
- **Bakım:** hafıza dosyaları + CLAUDE.md sadeleştirildi; DAILY_LOG haftalık arşiv sistemine geçti.
