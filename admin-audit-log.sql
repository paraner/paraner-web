-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN AUDIT LOG — iç ekip aksiyonlarının kaydı
-- Supabase → SQL Editor'de çalıştır. İdempotent (tekrar çalıştırmak zararsız).
--
-- ⚠️ MOBİLİ ETKİLEMEZ: yeni tablo; mevcut hiçbir tabloya/kolona dokunulmuyor.
--
-- Neden: admin paneli artık şifre sıfırlama maili gönderiyor, plan değiştiriyor,
-- hesap askıya alıyor/siliyor. Ekip birden fazla kişi olunca "bunu kim yaptı"
-- sorusunun cevabı olmalı. Silinen kullanıcının kaydı burada KALIR (target_user_id
-- FK DEĞİL — bilinçli: kullanıcı silinince log kaybolmasın).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.admin_audit_log (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid not null,              -- aksiyonu yapan iç ekip üyesi (auth.users.id)
  actor_email    text not null,              -- o anki e-posta (kişi silinse de okunabilsin)
  action         text not null,              -- password_reset_sent | plan_premium | plan_free |
                                             -- user_banned | user_unbanned | user_deleted |
                                             -- role_granted | role_revoked | staff_invited
  target_user_id uuid,                       -- etkilenen kullanıcı (FK YOK — silinince log kalsın)
  target_email   text,
  detail         jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx  on public.admin_audit_log (target_user_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Politika YOK = normal kullanıcı (anon/authenticated) hiçbir satır göremez/yazamaz.
-- Panel service_role ile okuyup yazar; service_role RLS'i bypass eder.
-- Böylece log'a müşteri tarafından ERİŞİM YOK ve kimse kendi izini silemez.
alter table public.admin_audit_log enable row level security;

-- Yalnız admin'ler kendi ekiplerinin log'unu SQL Editor'den de okuyabilsin (opsiyonel kolaylık):
drop policy if exists audit_select_admin on public.admin_audit_log;
create policy audit_select_admin on public.admin_audit_log
  for select using (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
  );

-- Not: INSERT/UPDATE/DELETE politikası bilerek YOK → yalnız service_role yazar,
-- kimse (admin dahil) client üzerinden log satırını değiştiremez/silemez.
