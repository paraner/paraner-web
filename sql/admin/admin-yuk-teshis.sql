-- ═══════════════════════════════════════════════════════════════════════════
-- YÜK TEŞHİSİ — "Disk IO Budget tükenmek üzere" uyarısı (2026-07-19)
-- ⚠️ SADECE OKUR. Hiçbir şeyi değiştirmez, güvenle tekrar çalıştırılır.
--
-- Amaç: yükün NEREDEN geldiğini TAHMİN etmemek. Kod tarafında en güçlü şüpheli
-- admin panelinin periyodik `router.refresh()`'i (bkz. app/admin/LiveRefresh.tsx) —
-- ama doğrulaması burası.
-- ═══════════════════════════════════════════════════════════════════════════


-- ⚠️ SUPABASE SQL EDITOR BİRDEN FAZLA SORGUDA YALNIZ SONUNCUNUN SONUCUNU GÖSTERİR
--    (2026-07-19'da yaşandı: sadece cron listesi göründü). Bu yüzden aşağıdaki
--    "TEK SORGU" bloğu hepsini TEK tabloda veriyor — normalde bunu çalıştır.
--    Altındaki ayrı sorgular derinleşmek istersen; birini seçip Run'a bas
--    (Supabase seçili metni çalıştırır).


-- ═══════════ TEK SORGU — HEPSİ BİRDEN (bunu çalıştır) ═════════════════════
with cagri as (
  select 'A · EN ÇOK ÇALIŞAN' as bolum,
         calls::text || ' çağrı · ort ' || round(mean_exec_time::numeric,1)::text || ' ms' as olcum,
         left(regexp_replace(query, '\s+', ' ', 'g'), 90) as detay,
         1 as sira, calls as sort
  from pg_stat_statements order by calls desc limit 10
),
disk as (
  select 'B · DİSKİ EN ÇOK YORAN',
         shared_blks_read::text || ' blok · ' || calls::text || ' çağrı',
         left(regexp_replace(query, '\s+', ' ', 'g'), 90),
         2, shared_blks_read
  from pg_stat_statements where shared_blks_read > 0
  order by shared_blks_read desc limit 10
),
tablolar as (
  select 'C · TABLOLAR',
         n_live_tup::text || ' satır · ' || pg_size_pretty(pg_total_relation_size(relid)),
         relname || '  (tam tarama: ' || seq_scan::text || ')',
         3, pg_total_relation_size(relid)
  from pg_stat_user_tables order by pg_total_relation_size(relid) desc limit 10
),
loglar as (
  select 'D · LOG TABLOLARI', count(*)::text || ' satır', 'net._http_response', 4, count(*)
  from net._http_response
  union all
  select 'D · LOG TABLOLARI', count(*)::text || ' satır', 'admin_audit_log', 4, count(*)
  from public.admin_audit_log
  union all
  select 'D · LOG TABLOLARI', count(*)::text || ' satır', 'notifications', 4, count(*)
  from public.notifications
),
cronlar as (
  select 'E · CRON', schedule, jobname || (case when active then '' else '  (KAPALI)' end), 5, jobid
  from cron.job
)
select bolum, olcum, detay from (
  select * from cagri union all select * from disk union all select * from tablolar
  union all select * from loglar union all select * from cronlar
) x
order by sira, sort desc;


-- ═══════════ AYRI SORGULAR (derinleşmek istersen, birini seçip Run) ═══════

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
-- 2026-07-19 ÖLÇÜMÜNÜN SONUCU (bir dahakine sıfırdan araştırma)
--
-- ÇAĞRI SAYISI sıralaması:
--   1. `wal->>...`  635.577  → Supabase Realtime'ın WAL taraması
--   2. `set_config search_path`  100.223  → bağlantı kurulumu (PostgREST/GoTrue)
--   3. users/sessions/identities/mfa_factors  ~21.600'er → GoTrue, her getUser 4 sorgu
--
-- ⚠️ EN ÖNEMLİ NÜANS: 1 numara (Realtime) DİSK OKUMA listesinde HİÇ YOK.
--    Yani "Disk IO Budget" uyarısının sebebi Realtime DEĞİL. Diski okuyanlar:
--      · `base_types` / `pks_fks` özyinelemeli sorguları (594 + 383 + 33 blok)
--        → ŞEMA INTROSPECTION: Supabase Studio sekmesi AÇIK kaldıkça ve PostgREST
--          şema önbelleğini tazeledikçe çalışır. En büyük kaldıraç: Studio'yu kapat.
--      · `DELETE FROM users` (396 blok) → hesap silme (seyrek, normal)
--
-- REALTIME YAYINI: notifications · ticket_messages · user_devices — ÜÇÜ DE KULLANILIYOR
--   (çan, destek sohbeti, askıya alınanı anında atma). Hiçbiri çıkarılamaz.
--   Kalp atışı zaten 5 dk'da bir ve sekme gizliyken duruyor → yazma yükü düşük.
--
-- YAPILAN DÜZELTMELER (2026-07-19):
--   · getSessionUser + getStaffRoleResult React cache()'li → admin sayfası başına
--     4 getUser (≈16 auth sorgusu) yerine 1.
--   · LiveRefresh sayfaya duyarlı → liste ekranlarında otomatik yenileme yok.
--
-- KALAN: Realtime'ın WAL taraması Supabase'in kendi işleyişi; realtime kapatılmadan
--   yok edilemez, kapatmak da 3 özelliği kırar. Bütçe periyodik yenileniyor;
--   sürekli sıkıntı olursa karar Mehmet'te (compute yükseltme).
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- NASIL OKUNUR
-- · 1. listede `calls` binlerdeyse ve sorgu support_tickets/user_devices/profiles
--   ise → suçlu panelin periyodik yenilemesiydi. 2026-07-19'da sayfaya duyarlı
--   hale getirildi (canlı ekran 30sn · pano 2dk · listelerde YOK).
-- · 3. listede tablolar küçük ama `tam_tarama` (seq_scan) yüksekse → `count(*)`
--   exact sayımları. Denetimde bir kısmı reltuples'a çevrilmişti (O3).
-- · 4'te net._http_response on binlerdeyse eski kayıtlar silinebilir.
-- ⚠️ "relation pg_stat_statements does not exist" hatası alırsan eklenti kapalıdır:
--    Dashboard → Database → Extensions → pg_stat_statements → Enable. O zaman A ve B
--    bölümleri gelmez; C/D/E yine çalışır (üstteki TEK SORGU'dan A ve B CTE'lerini sil).
-- ⚠️ pg_stat_statements sayaçları kümülatiftir; sıfırlamak istersen (opsiyonel):
--     select pg_stat_statements_reset();
--   Sıfırladıktan sonra 1 gün bekleyip tekrar bak — değişimi net görürsün.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════ REALTIME YÜKÜ (2026-07-19 ölçümünden sonra eklendi) ══════════
-- Ölçümde 1 numaralı yük: `wal->>...` sorgusu 635.577 çağrı → Supabase Realtime'ın
-- WAL taraması. Realtime, YAYINA (publication) eklenmiş her tabloyu izler.
-- Gereksiz tablo yayındaysa boşuna WAL işi yapılır.
-- Yalnızca gerçekten canlı olması gerekenler kalmalı:
--   · ticket_messages → destek sohbeti canlı akıyor (GEREKLİ)
--   · notifications   → çan bildirimi (GEREKLİ)
-- Listeyi gör:
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;

-- Gereksiz bir tablo varsa yayından çıkar (ÖRNEK — körlemesine çalıştırma,
-- önce üstteki listeyi gör ve mobil o tabloyu realtime dinliyor mu teyit et):
--   alter publication supabase_realtime drop table public.<tablo>;
