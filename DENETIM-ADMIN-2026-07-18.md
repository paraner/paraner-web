# /admin PANEL DENETİMİ — 2026-07-18

4 paralel ajan (güvenlik · doğruluk · SQL/RPC · UX) + her kritik bulgu elle doğrulandı.
Kapsam: `app/admin/**`, `lib/admin*.ts`, `lib/lifecycle.ts`, `lib/aiPricing.ts`, `proxy.ts`,
`admin-panel-rpc.sql`, `admin-audit-log.sql`, `destek-faz0.sql`,
`paraner-app/supabase/ai-token-maliyet.sql` + `ai-usage-rpc-fix.sql` + `daily-ai-usage-cron.sql`.

> **Genel durum:** mimari sağlam. service_role tarayıcıya sızmıyor (`server-only` her yerde),
> 7 server action'ın 7'si de `requireAdmin()` çağırıyor, admin/agent ayrımı aksiyonlarda doğru,
> denetim kaydı client'tan silinemiyor, SQL enjeksiyonu/IDOR/XSS yok. Aşağıdakiler nokta atışı kusurlar.

---

## 🔴 KRİTİK — veri kaybı / para

### K1. AI maliyet geçmişi HER PAZAR sessizce siliniyor
`paraner-app/supabase/ai-token-maliyet.sql:110-114` + `daily-ai-usage-cron.sql:9-16`

- Silme cron'u: **Pazar 00:00**, `date < CURRENT_DATE - 90 days` → sınır neredeyse hep **ayın ortasına** düşer.
- Rollup cron'u: **her gün 02:00** — yani silmeden **2 saat SONRA**. (Dosyadaki `:122` yorumu "rollup daha erken" diyor, **YANLIŞ**.)
- Rollup `ON CONFLICT DO UPDATE SET x = EXCLUDED.x` ile **körlemesine eziyor**.

**Sonuç:** rollup, silmeden geriye kalan kısmi ayı toplayıp tam aylık özetin üzerine yazıyor.
Örn. Pazar 2026-10-04: sınır 2026-07-06 → Temmuz'un 01-05'i silinir, 02:00'da `ai_usage_monthly(2026-07)`
satırı sadece 06-31 toplamıyla ezilir. **O 5 günün maliyeti kalıcı olarak yok olur. Her hafta tekrarlar.**

**Fix:** `EXCLUDED.x` → `GREATEST(ai_usage_monthly.x, EXCLUDED.x)` (maliyet defteri yalnız artabilir) + `coalesce`.

### K2. `/admin/ai` geçmiş ayları EKSİK gösteriyor (çift-sayma koruması ters tepiyor)
`ai-usage-rpc-fix.sql:45-48`

`NOT EXISTS` = "o ay için günlük satır varsa aylık özeti alma". K1'deki kısmi ay durumunda
o ay için hem günlük (eksik) hem aylık (tam) satır vardır → **tam olan atılır, eksik olan gösterilir.**
Ay tamamen 90 günü aşınca sayı birden yukarı zıplar → geçmiş maliyet raporu geriye dönük değişiyor.

**Fix:** varlığa göre değil **aya göre** ayır: canlı ay → `daily_ai_usage`, geçmiş aylar → `ai_usage_monthly`.
İki kol karşılıklı dışlayıcı olur, `NOT EXISTS` taraması da kalkar. (P2'yi de çözer.)

### K3. Normal müşteri `sender_type='agent'` mesaj yazabiliyor — destek personeli taklidi
`destek-faz0.sql:92-99` (güvenlik + SQL ajanları bağımsız buldu)

`messages_insert` WITH CHECK'i yalnız `sender_id = auth.uid()` bakıyor, `sender_type`'ı **hiç kontrol etmiyor**.
Kullanıcı kendi biletine `sender_type:'agent'` yazarsa:
1. Arayüzde **Paraner destek yanıtı gibi** görünür (ekran görüntüsü "delili" üretilebilir),
2. `trg_touch_ticket` durumu `answered` yapar → bilet agent kuyruğundaki açık listeden **DÜŞER** (talep görünmez olur),
3. `trg_notify_agent_reply` tetiklenir → Resend'den kendi metni e-posta olarak gider (kota tüketen döngü).

**Fix:** WITH CHECK'e `(sender_type='agent' AND is_support_agent()) OR (sender_type='user' AND ticket sahibi)`.

---

## 🟠 YÜKSEK

### Y1. `/admin` panosunun kendi sayfa guard'ı yok
`app/admin/page.tsx:11-13` — service_role ile `profiles` (10.000 satır) + `support_tickets` okuyor,
tek koruma `layout.tsx:20`. Diğer 5 admin sayfasının hepsinde `requireAdminPage()` var, panoda yok.

Next 16 kendi auth rehberi bunu önermiyor (`authentication.md:1350, 1446`): layout istemci-taraflı
gezinmede yeniden çalışmaz → rolü geri alınan kişi kabukta gezmeye devam eder (`staleTimes.dynamic:30` +30sn).
RSC segment isteğiyle layout'u atlama ihtimali **olası** (canlıda sömürülebilirliği doğrulanmadı).

**Fix:** `page.tsx`'in ilk satırına guard. (Agent de girebildiği için `requireAdminPage()` değil, staff guard'ı — ya da Y3 ile birlikte karar ver.)

### Y2. Premium/Free geçişinde ONAY YOK + deneme bilgisi geri alınamaz siliniyor
`MusteriDetayClient.tsx:132-146` + `lib/adminActions.ts:118-126`

Tek tıkla `setProfilePlan`. Aynı ekranda askıya alma ve kalıcı silme `confirmDialog` kullanıyor, bu kullanmıyor.
Geri alma "tekrar bas" değil: aksiyon `trial_plan` ve `trial_start_date`'i **null**'a çekiyor →
denemedeki müşteriye yanlışlıkla basılınca kalan deneme süresi **geri getirilemez**.
⚠️ Ödeme entegrasyonu gelince kritikleşir.

### Y3. `ai_usage_rollup()` guard'sız + REVOKE'suz → herkes çağırabiliyor
`ai-token-maliyet.sql:93-120` — aynı dosyadaki diğer iki fonksiyon doğru yazılmış, bu ikisini de atlıyor
→ Postgres varsayılanı gereği EXECUTE **PUBLIC**'te. Herhangi bir müşteri `rpc('ai_usage_rollup')`
çağırıp tam tablo agregasyonu + toplu upsert tetikleyebilir; döngüye alınırsa ucuz DB DoS.

**Fix:** `assert_admin()` DEĞİL (cron'da `auth.uid()` NULL → cron kırılır) → `REVOKE ALL ... FROM public, anon, authenticated`.

### Y4. Destek talebi sorgusu patlarsa pano "hepsi yanıtlandı" diyor
`app/admin/page.tsx:60` — `err` kontrolü `[totalR, businessR, premiumR, recentR, ownersR]` ile sınırlı;
`ticketsR`/`openR` dışarıda. Sorgu 400 dönerse kart "Bekleyen talep 0 · hepsi yanıtlandı" der.
**Panelin birinci işi bu** — müşteri talepleri yanıtsız kalır, kimse fark etmez.
(İronik: 58. satırdaki yorum tam bu hata sınıfına karşı yazılmış, ama destek sorgusunu kapsamıyor.)

### Y5. `inviteStaff` rol yazılamazsa "davet edildi" der, kişi rolsüz kalır
`lib/adminActions.ts:258-267` — `user_roles` upsert'ünün hatası hiç kontrol edilmiyor, `ok:true` dönüyor.
Personel davet edilir, toast başarılı der, denetim kaydına düşer, **Ekip listesinde görünmez**,
kişi girince `/panel`'e atılır. Yönetici sebebini göremez.

### Y6. `/admin/canli` tüm sorgu hatalarını yutuyor → "kimse yok" der
`lib/adminLive.ts:98-105, 164-199` — 5 sorgunun hiçbirinin `.error`'ına bakılmıyor, hepsi `?? []`.
RLS/kolon bozulursa Canlı Görünüm "Şu anda kimse uygulamada değil" der, ekip sistemin sessiz olduğunu sanır.

---

## 🟡 ORTA

- **O1. `user_devices.last_seen` indeksi YOK** (`admin-panel-rpc.sql:61,82-85`) — iki RPC de tam tablo taraması. Bugün ucuz, 100k'da Canlı Görünüm her açılışta tarar. → `create index concurrently idx_user_devices_last_seen on user_devices (last_seen desc);`
- **O2. `admin_ai_usage` ay filtresi sargable değil** — `date_trunc(...)= p_ay` indeksi kullanamıyor. K2 yaması bunu da çözer.
- **O3. `admin_module_adoption` 22 tabloda tam `count(*)`** (`:171`) — Supabase'de `authenticated` `statement_timeout` **8sn**; milyonlarca satırda RPC yavaşlamaz, **hata vermeye başlar**. → `pg_class.reltuples` tahmini veya gece yenilenen materialized view.
- **O4. `admin_dead_profiles` + `admin_online_users` SQL'de LIMIT yok** — kırpma JS tarafında, yani tüm satırlar ağdan geçiyor. CLAUDE.md "listelere `.limit()`" kuralına aykırı.
- **O5. Dashboard "Toplam Üye" 10.000'de sessizce yanlışa döner** (`page.tsx:33-36,82`) — `owners` sorgusu `.limit(10000)`, sırasız, uyarı yok. `listPeople` `truncated` bayrağını üretip Müşteriler'de gösteriyor, panoda karşılığı yok. Aynı kırpma `endingSoon` ve `nameByUser`'ı da vuruyor.
- **O6. Pano kartları PROFİL sayıyor, tıklanınca açılan segment KİŞİ sayıyor** → iki ekran çelişir. Ayrıca "Premium profil" kartı `?seg=paid`e gidiyor ama denemedekiler `is_premium=true` olduğu için premium sayımına girip `paid` segmentine girmiyor → kart 40 der, liste 6 açar.
- **O7. "Kayıp" segmenti bugün kayıt olanı da içine alıyor** (`MusterilerClient.tsx:128-131`) — `d == null` "30+ gündür yok" değil, "hiç sinyal yok" demek. Yeni üye hem "Yeni" hem "Kayıp" sayılıyor.
- **O8. `ai_usage_monthly` FK CASCADE maliyet geçmişini siliyor** (`ai-token-maliyet.sql:81`) — profil silinince o hesaba harcanan parayı gösteren kayıt da gider. `admin_audit_log` tam bu sebeple FK koymamış → iki tablo çelişiyor.
- **O9. Denetim kaydının hedef e-postası istemciden geliyor** (`adminActions.ts:61,82,145,171`) — DB'den teyit edilmiyor; `setProfilePlan` `userId` hiç yazmıyor → `target_user_id` NULL kalıyor, indeks işe yaramıyor. İz baştan yanlış yazılabildiği için "kimse izini silemez" garantisi deliniyor.
- **O10. Silme başarısız olsa da denetim kaydında "KALICI silindi" kalıyor** (`adminActions.ts:178-182`) — log silmeden ÖNCE yazılıyor (kasıtlı), ama hata dönerse geri alınmıyor.
- **O11. Admin'de `loading.tsx` YOK** — müşteri panelinde var. Admin sayfaları daha ağır (10.000 kullanıcı, 4 paralel sorgu, RPC). Sidebar'da tıklayınca hiçbir şey olmuyor gibi görünüyor.
- **O12. Agent panoda UYDURMA SIFIR görüyor** (`page.tsx:53-55,112-156`) — agent için `{dau:0,wau:0,mau:0}` dönülüyor ama kartlar diziden çıkarılmıyor, sadece `href` undefined oluyor → "Bugün aktif 0 · Ölü kayıt 0" **yanlış bilgi**. (Yetki gizlemesi değil.)

---

## 🟢 DÜŞÜK / cila

- Aktif segment chip'i sayı 0 olunca ekrandan kayboluyor (`MusterilerClient.tsx:192`) → `LiveRefresh` 30sn'de tazeleyince "müşteriler kayboldu" hissi.
- "Ölü kayıt" kartı filtresiz listeye gidiyor — kartın tek amacı buydu.
- Tablo satırı klavyeyle açılamıyor (`tr onClick`, `tabIndex`/`role` yok) — detaya giden tek yol. `/admin/canli` bunu doğru yapıyor.
- `/admin/ai` ay seçici geri bildirimsiz (`useTransition` yok) → tablo eski ayda kalırken seçim değişmiş görünür.
- `/admin/destek`'te filtre/arama/sayfalama yok (200 talep tek liste) + `metadata` eksik.
- Terminoloji karışık: Müşteri / Üye / Kullanıcı / Hesap aynı şey için; rol adı "Destek Ekibi" vs "Destek" 3 yerde kopya.
- `PageHead` deseni admin'de hiç kullanılmıyor → 21 yerde kopya başlık; `.admin-h1` 700 vs `.panel-h1` 600 ağırlık farkı. Köşe yarıçapı 16/12/14 karışık (12/8 dilinden sapma).
- Boş durum için 3 ayrı sınıf; `.danger-zone` yanlış CSS sözleşmesiyle kullanılıyor (`.dz-title/.dz-desc/.dz-btn` bekliyor).
- Ekip formunda `<label>`/`aria-label` yok; giriş ekranının `adm-login-input` sınıfı form alanı olarak kullanılıyor.
- Admin'de `error.tsx`/`not-found.tsx` yok → `notFound()` admin kabuğunun DIŞINDA, sidebar'sız açılıyor.
- Düz yönetici modeli: admin'ler birbirinin rolünü kaldırabiliyor, "son admin" koruması yok (`ADMIN-PANEL.md:27`'deki super-admin katmanı uygulanmamış).
- `/admin` üç host'tan da servis ediliyor (`paraner.com/admin`, `app.paraner.com/admin`) — açık değil (layout guard'ı çalışıyor) ama saldırı yüzeyi 3 katı.
- Bilet sahibi kendi biletinin `priority`/`status`'ünü değiştirebiliyor (kolon grant'i yok) — **olası**, agent panelinin hangi anahtarla yazdığı doğrulanmadan dokunma.
- `kullanici_sayisi` aslında PROFİL sayısı (`admin-panel-rpc.sql:171`).
- `admin_module_adoption` kolon seçimi alfabetik (`ORDER BY column_name`) → `profile_id` < `user_id`. Bugün 22 tablonun hiçbirinde ikisi birden yok, yani doğru ama **tesadüfen**; bir migration `profile_id` eklerse sayılar sessizce değişir.
- `daily_ai_usage.message_count/vision_count` NOT NULL değil (`schema.sql:83-84`) → tek NULL satır rollup'ın tamamını düşürebilir (**olası**; K1 yamasındaki `coalesce` kapatıyor).

---

## ✅ Kontrol edildi, TEMİZ

- **service_role sızıntısı yok** — `lib/supabase/admin.ts` + tüm `lib/admin*.ts` `import "server-only"` ile başlıyor, anahtar `NEXT_PUBLIC_` değil, hiçbir client component bunları import etmiyor (`import type` derlemede siliniyor), `.env*` gitignore'da.
- **Tüm server action'lar guard'lı** — projede tek `"use server"` dosyası var, 7 export'un 7'si de ilk satırda `requireAdmin()`. `app/api/` altında route yok.
- **admin vs agent ayrımı aksiyonlarda doğru** — `role !== "admin"` → agent hiçbir yönetim aksiyonunu çalıştıramaz.
- **`admin-panel-rpc.sql` temiz** — 4 fonksiyonun 4'ü de `assert_admin()` + `SECURITY DEFINER` + `SET search_path` + `REVOKE FROM public, anon`. Dinamik SQL `format('%I')` ile quote'lu, kullanıcı girdisi yok.
- **Tip tuzağı (bugünkü hata) başka RPC'de YOK** — 5 `RETURNS TABLE` kolon kolon doğrulandı (`::text` cast'leri, `count()`→bigint hepsi yerinde).
- **Ayrıcalık yükseltme yolu yok** — `user_roles`'ta INSERT/UPDATE/DELETE politikası yok + RLS açık → müşteri kendine admin yazamaz.
- **Denetim kaydı tablosu sağlam** — yalnız service_role yazar, admin bile client'tan silemez; `target_user_id` FK değil (silinen kullanıcının izi kalıyor).
- **Enjeksiyon / IDOR / XSS yok** — tüm sorgular PostgREST builder'ı; `?ay=` allow-list'e karşı doğrulanıyor; `dangerouslySetInnerHTML` yok.
- **`lib/aiPricing.ts` doğru** — `/1_000_000` birim doğru, giriş/çıkış ayrı fiyatlı, her yer USD (TRY etiketi sızıntısı yok).
- **`router.refresh()` kuralı (CLAUDE.md) admin'de eksiksiz** — tüm mutasyon yolları uyumlu, ayrıca server action'lar `revalidatePath` de çağırıyor.
- **Segment kapsaması doğru** — `trial/zombie/paid/free/no_profile` ayrık + kapsayıcı, toplamları üye sayısını tutuyor.
- **Güvenlik header'ları** — `X-Frame-Options: DENY` + CSP `frame-ancestors none` (yani "Kalıcı sil" iframe'den tıklatılamaz), HSTS, nosniff.
- Kodda `TODO`/`FIXME` yok, ölü `href="#"` yok, boş `onClick` yok, Türkçe yazım hatası bulunamadı.

---

## Önerilen uygulama sırası

1. **K3** (güvenlik, bağımsız, tek SQL) → **K1** (veri kaybı HER PAZAR devam ediyor) → **K2**
2. **Y1, Y2, Y3** — hepsi birkaç satır
3. **Y4, Y5, Y6** — yutulan hatalar, tek geçişte
4. **O1, O2** (ucuz indeks/sargable) → **O5-O7** (yanlış sayı) → **O3, O4** (imza değişikliği; `DROP FUNCTION` gerekir)
5. Kalanlar desen birleştirme + cila

## ⚠️ Doğrulama dersi

K1 ve K2, bugün `/admin/ai`'da patlayan hatayla **aynı sınıftan**: bugünkü veriyle test edilirse ikisi de
"çalışıyor" görünür, ilk 90 günlük silme sınırı bir ayın ortasına düştüğünde patlarlar.
Beklemeye gerek yok — sahte kısmi ay kurup doğrulanabilir: `ai_usage_monthly`'ye elle tam bir ay satırı yaz,
`daily_ai_usage`'dan o ayın ilk günlerini sil, `ai_usage_rollup()` çağır → yamasız halde aylık satır küçülür.
