-- ═══════════════════════════════════════════════════════════════════════════
-- DESTEK DEPARTMAN — DURUM KONTROLÜ  (2026-07-18)
-- ⚠️ Bu dosya SADECE OKUR. Hiçbir şeyi değiştirmez, güvenle tekrar tekrar çalıştırılır.
-- Amaç: "hangi adım gerçekten canlıda?" sorusunu TAHMİNE bırakmamak.
-- Her satır ✅/❌ + eksikse çalıştırılacak dosyanın adını verir.
-- ═══════════════════════════════════════════════════════════════════════════

SELECT * FROM (

  -- ── ADIM 1 (sql/destek/destek-departman.sql) ────────────────────────────────────────
  SELECT 1 AS sira, 'A1 · department kolonu' AS kontrol,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema='public' AND table_name='support_tickets'
                        AND column_name='department')
      THEN '✅' ELSE '❌ sql/destek/destek-departman.sql' END AS durum

  UNION ALL
  SELECT 2, 'A1 · staff_departments tablosu',
    CASE WHEN to_regclass('public.staff_departments') IS NOT NULL
      THEN '✅' ELSE '❌ sql/destek/destek-departman.sql' END

  UNION ALL
  SELECT 3, 'A1 · staff_sees_department()',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                      WHERE n.nspname='public' AND p.proname='staff_sees_department')
      THEN '✅' ELSE '❌ sql/destek/destek-departman.sql' END

  UNION ALL
  SELECT 4, 'A1 · yeni talep → çan bildirimi trigger',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_notify_staff_new_ticket' AND NOT tgisinternal)
      THEN '✅' ELSE '❌ sql/destek/destek-departman.sql' END

  -- ── ADIM 4 (sql/destek/destek-departman-rls.sql) — asıl merak edilen ────────────────
  -- Politikanın SADECE var olması yetmez (eskisi de aynı adı taşıyordu);
  -- tanımının içinde staff_sees_department GEÇİYOR mu, ona bakıyoruz.
  UNION ALL
  SELECT 5, 'A4 · tickets_select departman-farkında',
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies
                      WHERE schemaname='public' AND tablename='support_tickets'
                        AND policyname='tickets_select' AND qual LIKE '%staff_sees_department%')
      THEN '✅' ELSE '❌ sql/destek/destek-departman-rls.sql' END

  UNION ALL
  SELECT 6, 'A4 · tickets_update departman-farkında',
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies
                      WHERE schemaname='public' AND tablename='support_tickets'
                        AND policyname='tickets_update' AND qual LIKE '%staff_sees_department%')
      THEN '✅' ELSE '❌ sql/destek/destek-departman-rls.sql' END

  UNION ALL
  -- WITH CHECK olmadan agent talebi BAŞKA departmana taşıyabilir → ayrıca kontrol.
  SELECT 7, 'A4 · tickets_update WITH CHECK dolu',
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies
                      WHERE schemaname='public' AND tablename='support_tickets'
                        AND policyname='tickets_update' AND with_check LIKE '%staff_sees_department%')
      THEN '✅' ELSE '❌ sql/destek/destek-departman-rls.sql' END

  UNION ALL
  SELECT 8, 'A4 · messages_select departman-farkında',
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies
                      WHERE schemaname='public' AND tablename='ticket_messages'
                        AND policyname='messages_select' AND qual LIKE '%staff_sees_department%')
      THEN '✅' ELSE '❌ sql/destek/destek-departman-rls.sql' END

  UNION ALL
  -- K3 KORUNUYOR MU: sender_type kontrolü hâlâ yerinde olmalı (müşteri agent taklidi edememeli).
  SELECT 9, 'A4 · messages_insert K3 (sender_type) KORUNDU',
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies
                      WHERE schemaname='public' AND tablename='ticket_messages'
                        AND policyname='messages_insert' AND with_check LIKE '%sender_type%')
      THEN '✅' ELSE '❌ sql/admin/admin-denetim-fix-K3.sql GERİ ALINMIŞ — ACİL' END

  UNION ALL
  SELECT 10, 'A4 · messages_insert departman-farkında',
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies
                      WHERE schemaname='public' AND tablename='ticket_messages'
                        AND policyname='messages_insert' AND with_check LIKE '%staff_sees_department%')
      THEN '✅' ELSE '❌ sql/destek/destek-departman-rls.sql' END

  -- ── ADIM 5 (sql/destek/destek-departman-bildirim.sql + edge deploy) ─────────────────
  UNION ALL
  SELECT 11, 'A5 · ekibe e-posta trigger',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_notify_staff_ticket_email' AND NOT tgisinternal)
      THEN '✅' ELSE '❌ sql/destek/destek-departman-bildirim.sql' END

  UNION ALL
  -- Trigger secret'ı Vault'tan okuyor; yoksa mail SESSİZCE gitmez (exception yutuluyor).
  SELECT 12, 'A5 · Vault support_webhook_secret',
    CASE WHEN EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name='support_webhook_secret')
      THEN '✅' ELSE '❌ Vault secret yok — mail sessizce gitmez' END

  -- ── FAIL-CLOSED UYARISI ──────────────────────────────────────────────────
  -- Departman ataması olmayan agent HİÇBİR talep göremez. Bugün 0 olmalı.
  UNION ALL
  SELECT 13, 'Departmansız agent sayısı (0 olmalı)',
    CASE WHEN (SELECT count(*) FROM public.user_roles r
               WHERE r.role='agent'
                 AND NOT EXISTS (SELECT 1 FROM public.staff_departments d WHERE d.user_id=r.user_id)) = 0
      THEN '✅ yok'
      ELSE '⚠️ VAR — bu agent hiç talep göremez, staff_departments''a ata' END

) x ORDER BY sira;


-- ── EK: son e-posta denemeleri (Adım 5 test edildikten SONRA bak) ──────────
-- 401 = secret uyuşmuyor · 404 = edge deploy edilmemiş · 200 = gönderildi
--   select status_code, error_msg, created
--     from net._http_response order by created desc limit 5;
