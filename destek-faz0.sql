-- ══════════════════════════════════════════════════════════════════════════
-- Destek Sistemi — Faz 0 şeması (web + mobil ORTAK Supabase: oqhonmmbcqrkcaoijgnb)
-- Mobil Claude ile mutabık (DESTEK-SEMA-MOBIL.md). Push YOK (Faz 1).
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → yapıştır → Run.
-- Tek seferlik + idempotent (if not exists). Güvenle tekrar çalıştırılabilir.
-- ══════════════════════════════════════════════════════════════════════════

-- ── Tablolar ───────────────────────────────────────────────────────────────
create table if not exists public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  subject         text not null,
  status          text not null default 'open'
                    check (status in ('open','answered','resolved','closed')),
  priority        text not null default 'normal' check (priority in ('low','normal','high')),
  category        text,
  assignee_id     uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists support_tickets_user_idx
  on public.support_tickets(user_id, last_message_at desc);

create table if not exists public.ticket_messages (
  id             uuid primary key default gen_random_uuid(),
  ticket_id      uuid not null references public.support_tickets(id) on delete cascade,
  sender_id      uuid not null references auth.users(id),
  sender_type    text not null check (sender_type in ('user','agent')),
  body           text not null,
  attachment_url text,
  created_at     timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_idx
  on public.ticket_messages(ticket_id, created_at);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  data       jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications(user_id, created_at desc);

create table if not exists public.user_roles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('agent','admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ── Rol helper (RLS özyinelemesini önler) ──────────────────────────────────
create or replace function public.is_support_agent()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('agent','admin')
  );
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.notifications  enable row level security;
alter table public.user_roles     enable row level security;

-- tickets: kullanıcı kendi + agent hepsi
drop policy if exists tickets_select on public.support_tickets;
create policy tickets_select on public.support_tickets for select
  using (user_id = auth.uid() or public.is_support_agent());
drop policy if exists tickets_insert on public.support_tickets;
create policy tickets_insert on public.support_tickets for insert
  with check (user_id = auth.uid());
drop policy if exists tickets_update on public.support_tickets;
create policy tickets_update on public.support_tickets for update
  using (user_id = auth.uid() or public.is_support_agent());

-- messages: ticket'ı görebilen görür; gönderen kendisi
drop policy if exists messages_select on public.ticket_messages;
create policy messages_select on public.ticket_messages for select
  using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and (t.user_id = auth.uid() or public.is_support_agent())
  ));
drop policy if exists messages_insert on public.ticket_messages;
create policy messages_insert on public.ticket_messages for insert
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and (t.user_id = auth.uid() or public.is_support_agent())
    )
  );

-- notifications: kullanıcı kendi (okur + okundu + siler). INSERT trigger/service_role (SECURITY DEFINER).
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select using (user_id = auth.uid());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update using (user_id = auth.uid());
-- DELETE: mobilin "Tümünü sil"/× için istediği (yoksa sadece okundu yapılıyordu)
drop policy if exists notif_delete on public.notifications;
create policy notif_delete on public.notifications for delete using (user_id = auth.uid());

-- user_roles: kendi rolünü okur; yazma service_role/manuel (Dashboard'dan atanır)
drop policy if exists roles_select on public.user_roles;
create policy roles_select on public.user_roles for select using (user_id = auth.uid());

-- ── Realtime yayını (in-app çan + canlı thread) ────────────────────────────
alter publication supabase_realtime add table public.ticket_messages;
alter publication supabase_realtime add table public.notifications;

-- ── updated_at / last_message_at otomatik güncelleme ───────────────────────
create or replace function public.touch_ticket_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.support_tickets
    set last_message_at = new.created_at, updated_at = now(),
        -- agent yanıtı → answered; kullanıcı yeni mesajı → open
        status = case when new.sender_type = 'agent' then 'answered'
                      else 'open' end
  where id = new.ticket_id;
  return new;
end $$;
drop trigger if exists trg_touch_ticket on public.ticket_messages;
create trigger trg_touch_ticket after insert on public.ticket_messages
  for each row execute function public.touch_ticket_on_message();

-- ── Agent yanıtı → kullanıcıya (1) uygulama-içi bildirim + (2) e-posta ──────
-- SECURITY DEFINER: agent, kullanıcının notifications satırını RLS'e takılmadan oluşturur.
-- data.ticket_id HER ZAMAN dolu (mobil + web route bundan kuruluyor; link web-only kolaylık).
-- E-posta: Database Webhook UI'sına GEREK YOK — pg_net ile support-reply-notify doğrudan
-- çağrılır (async, mesaj INSERT'ini bloke etmez). Secret Vault'tan okunur (repoya sızmaz).
-- ⚠️ ÖN KOŞUL (Mehmet, SQL Editor'da bir kez — secret'ı Notlar'dan, bu dosyaya YAZMA):
--     select vault.create_secret('<SUPPORT_WEBHOOK_SECRET değeri>', 'support_webhook_secret');
create or replace function public.notify_on_agent_reply()
returns trigger language plpgsql security definer set search_path = public, net, vault as $$
declare
  v_user_id uuid;
  v_subject text;
  v_secret text;
begin
  if new.sender_type <> 'agent' then return new; end if;
  select user_id, subject into v_user_id, v_subject
    from public.support_tickets where id = new.ticket_id;
  if v_user_id is null then return new; end if;

  -- (1) uygulama-içi bildirim (çan) — web + mobil realtime
  insert into public.notifications (user_id, type, title, body, link, data)
  values (
    v_user_id,
    'support_reply',
    'Talebin yanıtlandı',
    coalesce(v_subject, 'Destek talebi') || ' — ' || left(new.body, 120),
    '/panel/destek/' || new.ticket_id::text,
    jsonb_build_object('ticket_id', new.ticket_id, 'message_id', new.id)
  );

  -- (2) e-posta — support-reply-notify edge function (Resend). Vault'ta secret yoksa sessiz atla.
  begin
    select decrypted_secret into v_secret
      from vault.decrypted_secrets where name = 'support_webhook_secret' limit 1;
    if v_secret is not null then
      perform net.http_post(
        url := 'https://oqhonmmbcqrkcaoijgnb.supabase.co/functions/v1/support-reply-notify',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-support-secret', v_secret),
        body := jsonb_build_object('type', 'INSERT', 'table', 'ticket_messages',
                                   'schema', 'public', 'record', to_jsonb(new))
      );
    end if;
  exception when others then
    -- e-posta göndermek mesaj kaydını asla bozmasın (çan zaten yazıldı)
    null;
  end;

  return new;
end $$;
drop trigger if exists trg_notify_agent_reply on public.ticket_messages;
create trigger trg_notify_agent_reply after insert on public.ticket_messages
  for each row execute function public.notify_on_agent_reply();

-- ── NOTLAR ─────────────────────────────────────────────────────────────────
-- 1) Storage bucket 'ticket-attachments' (private) → Dashboard > Storage'dan oluştur
--    (Faz 0'da ek dosya opsiyonel; UI'ya sonra eklenir).
-- 2) Destek personelini agent yap:  insert into public.user_roles (user_id, role)
--       values ('<AGENT_AUTH_USER_ID>', 'agent');
--    (İlk agent = kendi hesabın; auth.users'tan id'yi al.)
-- 3) support-reply-notify edge function + Database Webhook → Faz 0 bildirim adımı (Resend + notifications INSERT).
-- 4) expo_push_token + push → Faz 1 (mobil koordinasyonlu).
