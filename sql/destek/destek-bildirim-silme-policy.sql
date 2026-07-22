-- Bildirim SİLME politikası (2026-07-22)
--
-- SORUN: Çana "Temizle" (tüm bildirimleri sil) eklenince silme sessizce çalışmadı.
-- Kanıt (tarayıcı ağ izleme): `DELETE /rest/v1/notifications?id=in.(…)` → **HTTP 200**,
-- gövde **`[]`** = SIFIR satır silindi. Hata yok, çünkü PostgREST'te RLS bir satırı
-- gizlerse bu "hata" değil "eşleşen satır yok" demektir.
-- ⚠️ Aynı ekranda "okundu işaretle" (UPDATE) ÇALIŞIYOR → `notif_update` var, `notif_delete` YOK.
--
-- NEDEN OLUŞTU: `sql/destek/destek-faz0.sql:107-108` bu politikayı tanımlıyor, yani REPO'da
-- var; ama canlı veritabanında yok. Muhtemelen faz0 çalıştırıldığında o satırlar henüz
-- dosyada değildi (destek sistemi birkaç turda oturmuştu) ve sonradan eklendiğinde
-- migration tekrar çalıştırılmadı. Repo'daki SQL = "çalıştırıldı" DEĞİLDİR; doğrusu
-- daima canlı katalogdan okunmalı (bu dosyanın sonundaki doğrulama onu yapıyor).
--
-- ETKİ: Kullanıcı (web + mobil) kendi bildirimini silemiyordu. Tek tek silme arayüzü
-- olmadığı için bugüne kadar fark edilmedi — "Temizle" butonu ilk kez bunu zorladı.
--
-- ⚠️ GÜVENLİK: `using (user_id = auth.uid())` → herkes YALNIZ kendi bildirimini siler.
--    Bildirim bir DENETİM kaydı DEĞİLDİR (o `admin_audit_log`, orası append-only ve
--    silinemez) → kullanıcının kendi bildirim listesini temizlemesi sakıncasız.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_delete ON public.notifications;
CREATE POLICY notif_delete ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- ───────────────────── DOĞRULAMA (sadece OKUR) ─────────────────────
-- 4 satır dönmeli, dördü de ✅. Canlı katalogdan okur — repo dosyasına DEĞİL.
SELECT
  'RLS açık mı' AS kontrol,
  CASE WHEN relrowsecurity THEN '✅ evet' ELSE '❌ HAYIR' END AS sonuc
FROM pg_class WHERE oid = 'public.notifications'::regclass
UNION ALL
SELECT
  'notif_select (okuma) var mı',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications' AND policyname='notif_select')
  THEN '✅ evet' ELSE '❌ HAYIR' END
UNION ALL
SELECT
  'notif_update (okundu) var mı',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications' AND policyname='notif_update')
  THEN '✅ evet' ELSE '❌ HAYIR' END
UNION ALL
SELECT
  'notif_delete (silme) var mı  ← BU DOSYANIN İŞİ',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications'
      AND policyname='notif_delete' AND cmd='DELETE')
  THEN '✅ evet' ELSE '❌ HAYIR' END;

-- Canlı test: panelde çanı aç → "Temizle" → onayla. Liste boşalmalı ve SAYFAYI
-- YENİLEYİNCE de boş kalmalı. "Silinemedi (yetki)" toast'ı çıkıyorsa politika oturmamıştır.
