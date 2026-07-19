-- ═══════════════════════════════════════════════════════════════════════════
-- DESTEK DEPARTMAN YÖNLENDİRME — ADIM 1 (DB)  ·  2026-07-18
-- Plan + gerekçeler: docs/DESTEK-DEPARTMAN-PLAN.md
--
-- Mehmet'in kararları: 4 departman · öncelik alanı müşteriye SORULMAYACAK · şema izni verildi.
--
-- ⚠️ MOBİL AYNI ŞEMAYI KULLANIYOR (paraner-app/lib/support.ts talep açıyor).
--    department kolonu DEFAULT'lu → eski mobil sürüm KIRILMADAN çalışmaya devam eder,
--    onun açtığı talepler 'teknik'e düşer. App Store sürümü BEKLEMEDEN uygulanabilir.
--
-- ⚠️ RLS DARALTMASI BU DOSYADA YOK — bilinçli. Önce departman verisi birikmeli ve panel
--    ayrımı görülmeli. Daraltma (agent yalnız kendi departmanını görsün) AYRI dosyada,
--    personel alınmadan ÖNCE. Bugün tek staff Mehmet ve o admin → kimse etkilenmiyor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1) Talebin departmanı ──────────────────────────────────────────────────
-- Not: 'category' kolonu zaten vardı ama kısıtsız serbest metindi ve HİÇ kullanılmıyordu.
-- Onu yeniden amaçlandırmak yerine AYRI kolon: CHECK'li, DEFAULT'lu, niyeti okunur.
-- (category ileride "konu etiketi" olarak kullanılabilir — departmandan farklı bir eksen.)
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT 'teknik';

-- CHECK'i ayrı ekliyoruz: kolon zaten varsa ADD COLUMN atlanır ama kısıt yine kurulur.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_department_check'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_department_check
      CHECK (department IN ('teknik', 'satis', 'faturalama', 'oneri'));
  END IF;
END $$;

-- Departman kuyruğu sorgusu: "bu departmanın açık talepleri, en yeni üstte".
CREATE INDEX IF NOT EXISTS support_tickets_department_idx
  ON public.support_tickets (department, last_message_at DESC);


-- ── 2) Kim hangi ekipte ────────────────────────────────────────────────────
-- Neden user_roles'a kolon DEĞİL: user_roles PK'sı (user_id, role). Oraya departman
-- eklemek anahtarı bozar ve "admin'in departmanı ne?" sorusunu doğurur. Ayrı tablo =
-- rol (yetki seviyesi) ile departman (çalışma alanı) birbirine karışmaz.
-- Bir kişi BİRDEN FAZLA departmanda olabilir (küçük ekipte şart).
CREATE TABLE IF NOT EXISTS public.staff_departments (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department text NOT NULL CHECK (department IN ('teknik', 'satis', 'faturalama', 'oneri')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, department)
);

ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;

-- Personel KENDİ departmanlarını görebilir (panelde "hangi ekiptesin" göstermek için).
-- Yazma yok: atama yalnız service_role ile /admin/ekip üzerinden yapılır.
DROP POLICY IF EXISTS staff_dep_select ON public.staff_departments;
CREATE POLICY staff_dep_select ON public.staff_departments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- ── 3) Yetki yardımcısı ────────────────────────────────────────────────────
-- "Bu kişi şu departmanın taleplerini görebilir mi?"
--   · admin  → HER ZAMAN evet (Mehmet'in şartı: admin her şeyi görür)
--   · agent  → yalnız staff_departments'ta kaydı olan departmanlar
-- SECURITY DEFINER + STABLE: RLS içinden çağrılacak, özyineleme olmasın
-- (is_support_agent() ile aynı desen — sql/destek/destek-faz0.sql:59).
CREATE OR REPLACE FUNCTION public.staff_sees_department(p_department text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles r
            WHERE r.user_id = auth.uid() AND r.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.staff_departments d
               WHERE d.user_id = auth.uid() AND d.department = p_department);
$$;
REVOKE ALL ON FUNCTION public.staff_sees_department(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_sees_department(text) TO authenticated;


-- ── 4) Mevcut personeli departmanlara ata ──────────────────────────────────
-- Bugün tek staff Mehmet (admin@paraner.com) ve o admin → zaten hepsini görüyor.
-- Yine de 4 departmana da ekliyoruz: ileride rolü 'agent'a düşse bile kuyruklar boş kalmasın
-- ve "agent görünümü" gerçek veriyle test edilebilsin.
INSERT INTO public.staff_departments (user_id, department)
SELECT r.user_id, d.dep
FROM public.user_roles r
CROSS JOIN (VALUES ('teknik'), ('satis'), ('faturalama'), ('oneri')) AS d(dep)
WHERE r.role IN ('admin', 'agent')
ON CONFLICT (user_id, department) DO NOTHING;


-- ── 5) Yeni talep gelince EKİBE bildirim ───────────────────────────────────
-- ⚠️ Bugüne kadar TERS YÖN YOKTU: agent yanıtı müşteriye bildirim + e-posta gönderiyordu,
-- ama YENİ TALEP geldiğinde ekibe hiçbir şey gitmiyordu → Mehmet panele bakmak zorundaydı.
-- Bildirim gidecek kişiler: o departmanın üyeleri + TÜM admin'ler (admin her şeyi görür).
-- Talebi açan kişi kendisi staff olsa bile KENDİNE bildirim gitmez.
CREATE OR REPLACE FUNCTION public.notify_staff_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  /* ⚠️ `link` DOLU olmalı: NotificationBell'de link, data.ticket_id'den ÖNCELİKLİ
     (app/panel/NotificationBell.tsx:132). Boş bırakılsa personel MÜŞTERİ sayfasına
     (/panel/destek/...) atılırdı; oysa işini admin panelinde yapıyor. */
  INSERT INTO public.notifications (user_id, type, title, body, link, data)
  SELECT DISTINCT s.user_id,
         'support_new',
         'Yeni destek talebi',
         NEW.subject,
         '/admin/destek/' || NEW.id::text,
         jsonb_build_object('ticket_id', NEW.id, 'department', NEW.department)
  FROM (
    SELECT d.user_id FROM public.staff_departments d WHERE d.department = NEW.department
    UNION
    SELECT r.user_id FROM public.user_roles r WHERE r.role = 'admin'
  ) s
  WHERE s.user_id <> NEW.user_id;   -- kendi talebinin bildirimini alma
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_new_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_staff_new_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_staff_new_ticket();


-- ── DOĞRULAMA ──────────────────────────────────────────────────────────────
-- 1) Kolon + kısıt:
--    select department, count(*) from support_tickets group by 1;   → hepsi 'teknik'
--    insert into support_tickets (user_id, subject, department)
--      values (auth.uid(), 'x', 'yanlis');                          → CHECK hatası VERMELİ
-- 2) Ekip ataması:
--    select * from staff_departments;                                → 4 satır (Mehmet)
-- 3) Yetki:
--    select public.staff_sees_department('satis');                   → admin oturumunda true
-- 4) Bildirim: panelden yeni talep aç → notifications'a 'Yeni destek talebi' düşmeli
--    (kendi talebini açtığın için SANA düşmez; ikinci bir hesapla test et).
