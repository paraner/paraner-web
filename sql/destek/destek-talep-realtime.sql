-- ═══════════════════════════════════════════════════════════════════════════
-- YENİ TALEP ANLIK DÜŞSÜN — support_tickets'ı realtime yayınına ekle · 2026-07-20
--
-- SORUN (Mehmet, canlı kullanım): müşteri talep açtığında /admin/destek listesine
-- anlık düşmüyor, personelin sayfayı yenilemesi gerekiyor.
--
-- ⚠️ SEBEP TEK DEĞİL, ÜÇ TANEYDİ — üçü de kapatılmazsa sorun sürer:
--   1) DestekListClient'ta realtime abonesi yoktu           → KOD ile çözüldü
--   2) LiveRefresh /admin/destek için 0 (kapalı) döndürüyor  → bilinçli (disk IO), dokunulmadı
--   3) `support_tickets` YAYINDA DEĞİL                       → BU DOSYA
--      (sql/destek/destek-faz0.sql:115-125 yalnız ticket_messages + notifications ekliyor)
--   3 kapatılmadan 1'i yazmak işe yaramaz: olay hiç yayınlanmadığı için abone sessizce bekler.
--
-- ── MALİYET (bilerek kabul ediliyor) ──────────────────────────────────────
-- Realtime WAL taraması Supabase Free planda disk IO'nun en çok çağrılan kalemi
-- (2026-07-19 ölçümü, sql/admin/admin-yuk-teshis.sql). Bir tablo daha eklemek yükü artırır.
-- Kabul gerekçesi: `support_tickets` DÜŞÜK HACİMLİ (günde birkaç satır) — `transactions`
-- gibi sıcak bir tablo eklenseydi bu karar farklı olurdu.
-- ℹ️ Geri almak istersen:
--     alter publication supabase_realtime drop table public.support_tickets;
--
-- ── GİZLİLİK ──────────────────────────────────────────────────────────────
-- Realtime `postgres_changes` RLS'e TABİDİR → yayına eklemek talebi herkese açmaz.
-- `tickets_select` (destek-departman-rls.sql) aynen geçerli: müşteri kendi talebini,
-- personel yalnız KAPSADIĞI DEPARTMANI görür. Departmansız agent hiçbir olay almaz
-- (fail-closed). Yani departman gizliliği realtime'da da korunuyor.
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → yapıştır → Run. İdempotent.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
END $$;


-- ── DOĞRULAMA (sadece okur) ───────────────────────────────────────────────
-- Üç satır dönmeli: notifications · support_tickets · ticket_messages
SELECT tablename AS yayindaki_tablo
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
 ORDER BY tablename;
