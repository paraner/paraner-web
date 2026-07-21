-- ═══════════════════════════════════════════════════════════════════════════
-- DESTEK EK DOSYASI — private bucket + policy'ler   ·   2026-07-20
-- Mehmet kararı: müşteri talep açarken VE sohbette dosya ekleyebilsin (ekran görüntüsü/PDF),
-- dosyalar PRIVATE + imzalı link ile açılsın.
--
-- ⚠️ NEDEN MEVCUT DESEN KOPYALANMADI: `receipts`/`avatars` bucket'ları PUBLIC ve policy'leri
--    klasörü `profiles.id` ile eşliyor (paraner-app/supabase/receipts-storage.sql:27-34).
--    Destek bunlardan İKİ yönden ayrılıyor:
--      · Sahiplik KİŞİ bazlı (support_tickets.user_id = auth.users.id), profil değil
--      · Dosyayı talebin SAHİBİ + O DEPARTMANI GÖREN PERSONEL açabilmeli (üçüncü taraf yok)
--    Bu yüzden policy'ler `support_tickets` üzerinden yeniden yazıldı.
--
-- YOL DESENİ:  {ticket_id}/{rastgele}.{uzanti}     (docs/DESTEK-SEMA-MOBIL.md:45 ile aynı)
--    Klasör = talep id → policy `storage.foldername(name))[1]` ile talebi bulup yetki sorar.
--
-- ⚠️ PUBLIC DEĞİL: `getPublicUrl` bu bucket'ta ÇALIŞMAZ (URL üretir ama 400 döner).
--    Okuma her seferinde `createSignedUrl` ile süreli link üretilerek yapılır (lib/ticketAttachments.ts).
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → yapıştır → Run. İdempotent.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1) Bucket ──────────────────────────────────────────────────────────────
-- file_size_limit + allowed_mime_types SUNUCU tarafı kapı: istemcideki `accept` ve
-- `file.size` kontrolü kullanıcıyı yönlendirir ama zorlamaz (devtools'tan aşılır).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments',
  'ticket-attachments',
  false,                                   -- PRIVATE
  10485760,                                -- 10 MB
  array['image/png','image/jpeg','image/gif','image/webp','application/pdf']
)
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ── 2) Yetki yardımcısı ────────────────────────────────────────────────────
-- "Bu talebin dosyalarına dokunabilir miyim?" — tek yerde, dört policy de bunu çağırır.
-- Kural, taleplerin kendi RLS'iyle (destek-departman-rls.sql tickets_select) AYNI:
--   müşteri kendi talebi · personel yalnız kapsadığı departman.
-- ⚠️ Sahibi silinmiş talep (user_id NULL) → müşteri dalı eşleşmez, yalnız personel erişir. Doğru.
create or replace function public.can_access_ticket_files(p_ticket_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.support_tickets t
     where t.id = p_ticket_id
       and (
         t.user_id = auth.uid()
         or (public.is_support_agent() and public.staff_sees_department(t.department))
       )
  );
$$;
revoke all on function public.can_access_ticket_files(uuid) from public, anon;
grant execute on function public.can_access_ticket_files(uuid) to authenticated;


-- ── 3) Storage policy'leri ─────────────────────────────────────────────────
-- Klasör adı geçerli bir uuid değilse `::uuid` cast'i patlar → güvenli tarafta kalmak için
-- önce desen kontrolü. (Talep id'leri gen_random_uuid(), bu koşul normalde hep geçer.)
drop policy if exists ticket_files_select on storage.objects;
create policy ticket_files_select on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_access_ticket_files(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists ticket_files_insert on storage.objects;
create policy ticket_files_insert on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_access_ticket_files(((storage.foldername(name))[1])::uuid)
  );

/* GÜNCELLEME/SİLME: bilinçli olarak YALNIZ yükleyene değil, hiç kimseye verilmiyor.
   Destek eki bir yazışma kaydıdır — müşteri "kanıtı" sonradan değiştirip/silememeli.
   Temizlik gerekirse service_role ile (admin tarafı) yapılır. */
drop policy if exists ticket_files_update on storage.objects;
drop policy if exists ticket_files_delete on storage.objects;


-- ═══════════════════════════════════════════════════════════════════════════
-- DOĞRULAMA (sadece okur)
-- ═══════════════════════════════════════════════════════════════════════════
select 'bucket private mi'  as kontrol,
       case when not public then '✅ private' else '❌ PUBLIC — dosyalar korumasız' end as sonuc
  from storage.buckets where id = 'ticket-attachments'
union all
select 'boyut siniri',
       case when file_size_limit = 10485760 then '✅ 10 MB' else '❌ ' || coalesce(file_size_limit::text,'yok') end
  from storage.buckets where id = 'ticket-attachments'
union all
select 'policy sayisi (2 olmali: select+insert)',
       case when count(*) = 2 then '✅ ' || count(*) else '❌ ' || count(*) end
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects' and policyname like 'ticket_files_%';
