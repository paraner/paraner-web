-- ═══════════════════════════════════════════════════════════════════════════
-- DENETİM DÜZELTMELERİ — TEK SEFERDE DURUM KONTROLÜ (2026-07-18)
--
-- "Hangi SQL'i çalıştırdım, hangisi eksik?" sorusunun cevabı.
-- Hiçbir şeyi DEĞİŞTİRMEZ, sadece OKUR. Supabase SQL Editor'e yapıştır çalıştır.
-- Her satır: ne kontrol edildi + DURUM (✅ tamam / ❌ EKSİK) + hangi dosya çalıştırılmalı.
-- ═══════════════════════════════════════════════════════════════════════════

WITH kontroller AS (

  -- ── K3 · sql/admin/admin-denetim-fix-K3.sql ────────────────────────────────────────
  -- Politika gövdesinde sender_type kontrolü var mı? (yoksa müşteri agent taklidi yapabilir)
  SELECT 1 AS sira,
    'K3 · destek personeli taklidi kapalı mı' AS kontrol,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'ticket_messages'
        AND policyname = 'messages_insert'
        AND with_check LIKE '%sender_type%'
    ) THEN '✅ tamam' ELSE '❌ EKSİK → sql/admin/admin-denetim-fix-K3.sql' END AS durum

  -- ── K1 · ai-maliyet-fix-K1-K2.sql ────────────────────────────────────────
  -- Rollup GREATEST kullanıyor mu? (kullanmıyorsa her Pazar maliyet geçmişi siliniyor)
  UNION ALL SELECT 2,
    'K1 · rollup maliyet geçmişini ezmiyor mu',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'ai_usage_rollup'
        AND pg_get_functiondef(p.oid) LIKE '%GREATEST%'
    ) THEN '✅ tamam' ELSE '❌ EKSİK → ai-maliyet-fix-K1-K2.sql (mobil repo)' END

  -- ── K2 · aynı dosya ──────────────────────────────────────────────────────
  -- Panel RPC'si FULL OUTER JOIN'e geçti mi? (geçmediyse geçmiş aylar eksik görünür)
  -- ⚠️ Bu kontrol aynı zamanda "ai-usage-rpc-fix.sql'i sonradan çalıştırdım mı"yı da yakalar:
  --    o eski dosya NOT EXISTS'li sürümü geri yazar → burada ❌ görünür.
  UNION ALL SELECT 3,
    'K2 · geçmiş ay maliyeti doğru mu',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'admin_ai_usage'
        AND pg_get_functiondef(p.oid) LIKE '%FULL OUTER JOIN%'
    ) THEN '✅ tamam' ELSE '❌ EKSİK → ai-maliyet-fix-K1-K2.sql (mobil repo)' END

  -- ── Y3 · aynı dosya ──────────────────────────────────────────────────────
  -- rollup'ta authenticated EXECUTE yetkisi KALMAMALI (müşteri çağırabiliyordu)
  UNION ALL SELECT 4,
    'Y3 · rollup müşteriye kapalı mı',
    CASE WHEN NOT has_function_privilege(
      'authenticated', 'public.ai_usage_rollup()', 'EXECUTE'
    ) THEN '✅ tamam' ELSE '❌ EKSİK → ai-maliyet-fix-K1-K2.sql (mobil repo)' END

  -- ── O8 · aynı dosya ──────────────────────────────────────────────────────
  -- ai_usage_monthly'de FK KALMAMALI (profil silinince maliyet geçmişi gidiyordu)
  UNION ALL SELECT 5,
    'O8 · maliyet geçmişi profil silinince korunuyor mu',
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
      WHERE ns.nspname = 'public' AND rel.relname = 'ai_usage_monthly' AND con.contype = 'f'
    ) THEN '✅ tamam' ELSE '❌ EKSİK → ai-maliyet-fix-K1-K2.sql GÜNCEL sürümü (O8 sonradan eklendi)' END

  -- ── O1 · sql/admin/admin-denetim-fix-olcek.sql ─────────────────────────────────────
  UNION ALL SELECT 6,
    'O1 · user_devices.last_seen indeksi',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'user_devices'
        AND indexname = 'idx_user_devices_last_seen'
    ) THEN '✅ tamam' ELSE '❌ EKSİK → sql/admin/admin-denetim-fix-olcek.sql' END

  -- ── O4 · aynı dosya ──────────────────────────────────────────────────────
  UNION ALL SELECT 7,
    'O4 · ölü-kayıt sayacı ayrı RPC',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'admin_dead_profile_count'
    ) THEN '✅ tamam' ELSE '❌ EKSİK → sql/admin/admin-denetim-fix-olcek.sql' END

  -- ── O3 · aynı dosya ──────────────────────────────────────────────────────
  -- Modül benimseme artık tam count(*) yerine reltuples tahmini kullanmalı (8sn timeout)
  UNION ALL SELECT 8,
    'O3 · modül benimseme timeout riski kapalı mı',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'admin_module_adoption'
        AND pg_get_functiondef(p.oid) LIKE '%reltuples%'
    ) THEN '✅ tamam' ELSE '❌ EKSİK → sql/admin/admin-denetim-fix-olcek.sql' END
)
SELECT kontrol, durum FROM kontroller ORDER BY sira;
