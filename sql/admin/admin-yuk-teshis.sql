-- ═══════════════════════════════════════════════════════════════════════════
-- YÜK TEŞHİSİ — "Disk IO Budget tükenmek üzere" uyarısı (2026-07-19)
-- ⚠️ SADECE OKUR. Hiçbir şeyi değiştirmez, güvenle tekrar çalıştırılır.
--
-- Amaç: yükün NEREDEN geldiğini TAHMİN etmemek. Kod tarafında en güçlü şüpheli
-- admin panelinin periyodik `router.refresh()`'i (bkz. app/admin/LiveRefresh.tsx) —
-- ama doğrulaması burası.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1) EN ÇOK ÇALIŞAN SORGULAR ────────────────────────────────────────────
-- `calls` yüksek + `rows` düşük olanlar = sürekli tekrarlanan sayaç sorguları.
-- Beklenen şüpheliler: support_tickets count, user_devices, profiles.
select
  calls,
  round(total_exec_time::numeric, 0)               as toplam_ms,
  round(mean_exec_time::numeric, 2)                as ortalama_ms,
  shared_blks_read                                 as diskten_okunan_blok,
  left(regexp_replace(query, '\s+', ' ', 'g'), 110) as sorgu
from pg_stat_statements
order by calls desc
limit 15;


-- ── 2) DİSKİ EN ÇOK YORAN SORGULAR ────────────────────────────────────────
-- Asıl "disk IO" suçlusu bu listedir (önbellekten değil, DİSKTEN okunan blok).
select
  shared_blks_read                                 as diskten_okunan_blok,
  calls,
  round(total_exec_time::numeric, 0)               as toplam_ms,
  left(regexp_replace(query, '\s+', ' ', 'g'), 110) as sorgu
from pg_stat_statements
where shared_blks_read > 0
order by shared_blks_read desc
limit 15;


-- ── 3) TABLO BOYUTLARI ────────────────────────────────────────────────────
-- Veri küçükse (bizde öyle olmalı) yük hacimden değil TEKRARDAN geliyordur.
select
  relname                                          as tablo,
  n_live_tup                                       as yaklasik_satir,
  pg_size_pretty(pg_total_relation_size(relid))    as boyut,
  seq_scan                                         as tam_tarama,
  idx_scan                                         as indeks_tarama
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 15;


-- ── 4) SESSİZCE BÜYÜYEN LOG TABLOLARI ─────────────────────────────────────
-- pg_net her HTTP çağrısının yanıtını saklar; destek e-postaları bunu kullanıyor.
-- Sürekli büyürse hem yer hem IO yer. Temizlenmesi gerekebilir.
select 'net._http_response' as tablo, count(*) as satir from net._http_response
union all
select 'admin_audit_log', count(*) from public.admin_audit_log
union all
select 'notifications', count(*) from public.notifications;


-- ── 5) ZAMANLANMIŞ İŞLER ──────────────────────────────────────────────────
-- Sık çalışan bir cron da bütçe yiyebilir.
select jobid, schedule, jobname, active from cron.job order by jobid;


-- ═══════════════════════════════════════════════════════════════════════════
-- NASIL OKUNUR
-- · 1. listede `calls` binlerdeyse ve sorgu support_tickets/user_devices/profiles
--   ise → suçlu panelin periyodik yenilemesiydi. 2026-07-19'da sayfaya duyarlı
--   hale getirildi (canlı ekran 30sn · pano 2dk · listelerde YOK).
-- · 3. listede tablolar küçük ama `tam_tarama` (seq_scan) yüksekse → `count(*)`
--   exact sayımları. Denetimde bir kısmı reltuples'a çevrilmişti (O3).
-- · 4'te net._http_response on binlerdeyse eski kayıtlar silinebilir.
-- ⚠️ pg_stat_statements sayaçları kümülatiftir; sıfırlamak istersen (opsiyonel):
--     select pg_stat_statements_reset();
--   Sıfırladıktan sonra 1 gün bekleyip tekrar bak — değişimi net görürsün.
-- ═══════════════════════════════════════════════════════════════════════════
