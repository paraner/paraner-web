-- ═══════════════════════════════════════════════════════════════════════════
-- DESTEK DEPARTMAN YÖNLENDİRME — ADIM 4 (RLS DARALTMASI)  ·  2026-07-18
-- Plan: docs/DESTEK-DEPARTMAN-PLAN.md §5 adım 4  ·  Ön koşul: sql/destek/destek-departman.sql ÇALIŞMIŞ olmalı
--
-- NE DEĞİŞİYOR: bugüne kadar `is_support_agent()` true olan HERKES (agent+admin) TÜM
-- talepleri görüyordu. Artık personel yalnız KENDİ departmanının taleplerini görür.
-- Admin değişmez — `staff_sees_department()` admin için HER ZAMAN true döner.
--
-- ⚠️ FAIL-CLOSED: `staff_departments`'ta HİÇ satırı olmayan bir 'agent' artık HİÇBİR
--    talep göremez (eskiden hepsini görürdü). Bu bilinçli: yanlış tarafa hata yapmak
--    "sızdır"mak değil "gizle"mek olmalı. → Yeni personel alınca /admin/ekip'ten (ya da
--    SQL ile) departman ataması ŞART, yoksa gelen kutusu boş görünür.
--
-- ⚠️ MÜŞTERİ TARAFI HİÇ DEĞİŞMİYOR: `user_id = auth.uid()` dalı her politikada aynen duruyor.
--    Müşteri kendi talebini departmanı ne olursa olsun görür/yazar. Mobil de etkilenmez.
--
-- ⚠️ ETKİ: web /admin/destek + /admin/destek/[id] talepleri KULLANICI OTURUMUYLA okuyor
--    (service_role DEĞİL — app/admin/destek/page.tsx'teki nota bakın) → bu daraltma
--    panelde GERÇEKTEN etkili olur. Müşteri bağlamı (listPeople) service_role'dedir,
--    o ayrı eksen, talep gizliliğini etkilemez.
--
-- ⚠️ K3 KORUNUYOR: messages_insert'teki sender_type/rol eşleşmesi (sql/admin/admin-denetim-fix-K3.sql)
--    AYNEN duruyor, üstüne departman koşulu EKLENİYOR. Bu dosya K3'ü geri ALMAZ.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1) Talepler: okuma ─────────────────────────────────────────────────────
-- Müşteri kendi talebi · personel yalnız kapsadığı departman.
DROP POLICY IF EXISTS tickets_select ON public.support_tickets;
CREATE POLICY tickets_select ON public.support_tickets FOR SELECT
  USING (
    user_id = auth.uid()
    OR (public.is_support_agent() AND public.staff_sees_department(department))
  );


-- ── 2) Talepler: güncelleme ────────────────────────────────────────────────
-- Durum değiştirme (answered/closed) buradan geçiyor. Okuyamadığı talebi
-- güncelleyebilmesi ANLAMSIZ olurdu → aynı koşul.
-- USING = hangi satıra dokunabilir · WITH CHECK = dokunduktan SONRA hâlâ geçerli mi.
-- WITH CHECK olmadan bir agent talebi BAŞKA departmana taşıyıp (department='satis')
-- kendi görüş alanından çıkarabilir/başkasınınkine sokabilirdi.
DROP POLICY IF EXISTS tickets_update ON public.support_tickets;
CREATE POLICY tickets_update ON public.support_tickets FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (public.is_support_agent() AND public.staff_sees_department(department))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (public.is_support_agent() AND public.staff_sees_department(department))
  );


-- ── 3) Mesajlar: okuma ─────────────────────────────────────────────────────
-- Talebi göremeyen mesajlarını da görmemeli (yoksa departman gizliliği delinir:
-- konu başlığı gizli ama yazışma açık kalırdı).
DROP POLICY IF EXISTS messages_select ON public.ticket_messages;
CREATE POLICY messages_select ON public.ticket_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (
        t.user_id = auth.uid()
        OR (public.is_support_agent() AND public.staff_sees_department(t.department))
      )
  ));


-- ── 4) Mesajlar: yazma ─────────────────────────────────────────────────────
-- K3 (sender_type ↔ gerçek rol eşleşmesi) KORUNUYOR, üstüne departman eklendi.
--   · 'agent' yazabilmek için: staff OL + O DEPARTMANI kapsa
--   · 'user'  yazabilmek için: biletin sahibi ol  (değişmedi)
DROP POLICY IF EXISTS messages_insert ON public.ticket_messages;
CREATE POLICY messages_insert ON public.ticket_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (sender_type = 'agent' AND public.is_support_agent() AND EXISTS (
         SELECT 1 FROM public.support_tickets t
         WHERE t.id = ticket_id AND public.staff_sees_department(t.department)
       ))
      OR (sender_type = 'user' AND EXISTS (
         SELECT 1 FROM public.support_tickets t
         WHERE t.id = ticket_id AND t.user_id = auth.uid()
       ))
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- DOĞRULAMA — ÜÇ SENARYO, AYRI AYRI (plan: "yanlış politika ya gizler ya sızdırır")
--
-- A) ADMIN (bugünkü tek personel — hiçbir şey kaybetmemeli):
--    admin@paraner.com oturumuyla /admin/destek → TÜM departmanların talepleri görünmeli.
--    SQL: select department, count(*) from support_tickets group by 1;
--         → daraltma ÖNCESİ ile AYNI sayılar çıkmalı.
--
-- B) MÜŞTERİ (hiç etkilenmemeli):
--    müşteri oturumuyla /panel/destek → kendi talepleri + yazışma açılmalı.
--    Başkasının talebini okuyamamalı (eskisi gibi).
--
-- C) DEPARTMAN AYRIMI (asıl test — geçici agent ile):
--    Bugün gerçek agent yok, o yüzden admin@paraner.com'u GEÇİCİ olarak agent'a düşürüp
--    tek departmana bırakarak test edilir. Test bitince GERİ AL:
--
--    -- 1. admin rolünü geçici kaldır, agent bırak:
--    --    delete from user_roles where user_id = '<uid>' and role = 'admin';
--    -- 2. yalnız 'satis' departmanında bırak:
--    --    delete from staff_departments where user_id = '<uid>' and department <> 'satis';
--    -- 3. select id, subject, department from support_tickets;
--    --    → YALNIZ department='satis' satırları dönmeli (teknik/faturalama/oneri GİZLİ)
--    -- 4. GERİ AL:
--    --    insert into user_roles (user_id, role) values ('<uid>', 'admin');
--    --    insert into staff_departments (user_id, department)
--    --      select '<uid>', d from (values ('teknik'),('satis'),('faturalama'),('oneri')) v(d)
--    --      on conflict do nothing;
--
--    ⚠️ 4. adımı ATLAMA — admin rolünü geri vermeden /admin paneline giremezsin.
-- ═══════════════════════════════════════════════════════════════════════════
