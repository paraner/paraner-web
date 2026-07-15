# Destek Sistemi — Mobil Claude'a şema mutabakatı

> Bu dosya **mobil Claude'a iletilmek** için hazırlandı. Web + mobil AYNI Supabase'i
> (`oqhonmmbcqrkcaoijgnb`) kullanıyor. Aşağıdaki 4 tablo + RLS + edge function üzerinde
> ANLAŞALIM, sonra web + mobil aynı şemaya bağlanır. İtirazın/eklemen varsa dön.
> Model: "conversational ticketing" (kullanıcıya chat, arkada ticket takibi).

## Akış (uçtan uca)
1. Kullanıcı talep açar → `support_tickets` + ilk `ticket_messages` (sender_type=`user`).
2. Destek ekibi (rol=`agent`) yanıtlar → `ticket_messages` (sender_type=`agent`) + ticket `answered`.
3. Agent mesajı INSERT → **Database Webhook** → **`support-reply-notify` edge function**:
   a) `notifications` satırı (kullanıcının çanına Realtime ile düşer — web+mobil)
   b) Resend e-posta ("Talebiniz yanıtlandı")
   c) Expo push (mobil)
4. Kullanıcı çandan/mailden/push'tan görür, thread'de devam eder. Çözülünce `resolved`.

---

## 1. Tablolar (SQL DDL — öneri, tartışmaya açık)

```sql
-- Destek talebi (başlık + durum + sahip)
create table public.support_tickets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,  -- talep sahibi (KİŞİ, profil değil)
  subject       text not null,
  status        text not null default 'open'
                check (status in ('open','answered','resolved','closed')),
  priority      text not null default 'normal' check (priority in ('low','normal','high')),
  category      text,                       -- opsiyonel (fatura/hesap/teknik…)
  assignee_id   uuid references auth.users(id),  -- atanan destek personeli
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_message_at timestamptz not null default now()  -- listeyi son mesaja göre sırala
);
create index on public.support_tickets(user_id, last_message_at desc);

-- Thread mesajları (chat'in temeli)
create table public.ticket_messages (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.support_tickets(id) on delete cascade,
  sender_id     uuid not null references auth.users(id),
  sender_type   text not null check (sender_type in ('user','agent')),
  body          text not null,
  attachment_url text,                      -- Storage: ticket-attachments bucket
  created_at    timestamptz not null default now()
);
create index on public.ticket_messages(ticket_id, created_at);

-- Uygulama-içi bildirim (web NotificationBell + mobil çan ORTAK okur)
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null,             -- 'support_reply' | ileride 'invoice_due' vb.
  title         text not null,
  body          text,
  link          text,                       -- örn '/panel/destek/{ticketId}' (web) — mobil kendi route'una çevirir
  data          jsonb,                      -- esnek meta (ticket_id vb.)
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on public.notifications(user_id, created_at desc);

-- Destek ekibini kullanıcıdan ayıran rol
create table public.user_roles (
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('agent','admin')),
  created_at    timestamptz not null default now(),
  primary key (user_id, role)
);
```

## 2. Rol helper (SECURITY DEFINER — RLS özyinelemesini önler)

```sql
create or replace function public.is_support_agent()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('agent','admin')
  );
$$;
```

## 3. RLS politikaları

```sql
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.notifications  enable row level security;
alter table public.user_roles     enable row level security;

-- TICKETS: kullanıcı kendi + agent hepsi
create policy tickets_select on public.support_tickets for select
  using (user_id = auth.uid() or public.is_support_agent());
create policy tickets_insert on public.support_tickets for insert
  with check (user_id = auth.uid());
create policy tickets_update on public.support_tickets for update
  using (user_id = auth.uid() or public.is_support_agent());

-- MESSAGES: ticket'ı görebilen mesajı da görür; gönderen kendisi
create policy messages_select on public.ticket_messages for select
  using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and (t.user_id = auth.uid() or public.is_support_agent())
  ));
create policy messages_insert on public.ticket_messages for insert
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and (t.user_id = auth.uid() or public.is_support_agent())
    )
  );

-- NOTIFICATIONS: kullanıcı kendi (okur + okundu işaretler). INSERT service_role (edge fn).
create policy notif_select on public.notifications for select using (user_id = auth.uid());
create policy notif_update on public.notifications for update using (user_id = auth.uid());

-- USER_ROLES: kendi rolünü okur; yazma service_role/manuel (başta elle atanır)
create policy roles_select on public.user_roles for select using (user_id = auth.uid());
```

## 4. Storage
`ticket-attachments` bucket (private) + policy: kullanıcı kendi ticket klasörüne yazar/okur, agent hepsini okur. Yol deseni: `{ticket_id}/{uuid}.{ext}`.

## 5. Push token (MOBİL koordinasyon gerektiren asıl kısım)
- **Öneri:** mevcut `user_devices` tablosuna `expo_push_token text` kolonu ekle (cihaz başına token; web'de null kalır). Mobil, cihaz kaydında token'ı yazar/günceller.
- **Alternatif:** ayrı `push_tokens(user_id, token, platform)` tablosu (çoklu cihaz daha temiz).
- **Mobil karar ver:** hangisini kullanalım? Expo push token'ı zaten alıyor musun, nerede saklıyorsun?

## 6. Edge function: `support-reply-notify`
- Tetik: `ticket_messages` INSERT WHERE `sender_type='agent'` → Supabase **Database Webhook** → function.
- İş: `ticket.user_id`'yi bul → (a) `notifications` INSERT, (b) Resend e-posta, (c) `expo_push_token` varsa Expo push (`https://exp.host/--/api/v2/push/send`).
- Mevcut `send-farewell-email` / `login-alert` function deseniyle aynı (JWT/secret). **E-posta sağlayıcı:** mevcut function'larda hangisini kullanıyorsun (Resend mi)? Aynısını kullanalım.

## 7. Kim ne yapar
- **Web (ben):** Destek sayfasını DB'ye yazar hale getir (ticket+mesaj), "Taleplerim" + chat thread UI, Realtime dinleme (ticket_messages INSERT), NotificationBell'i `notifications` tablosuna bağla, rol-korumalı agent ekranı.
- **Mobil (sen):** Aynı tablolara talep oluşturma + thread + `notifications` çanı + **push token kaydı** + push alma. Expo push edge function tarafı ortak.
- **Ortak/karar:** durum enum (`open/answered/resolved/closed` yeterli mi?), push token yeri (madde 5), e-posta sağlayıcı (madde 6), kategori listesi.

## 8. Fazlar
- **Faz 0:** tickets+messages+notifications+RLS + web UI + e-posta + uygulama-içi çan (web+mobil). Push HARİÇ.
- **Faz 1:** Expo push (madde 5+6).
- **Faz 2:** SLA, atama, öncelik, "yazıyor…", raporlama; Realtime'ı Broadcast'e, RLS'i JWT-RBAC'a taşı.

**Sorular (mobil):** (1) push token'ı nerede saklıyorsun/saklayalım? (2) e-posta sağlayıcın ne? (3) durum/kategori setine eklemen var mı? (4) `notifications` tablosunu mobil çan için bu şemayla okur musun?
