-- Yeni talepte TALEBİ AÇAN KİŞİYE de bildirim (2026-07-22, Mehmet)
--
-- SORUN: Müşteri talep açınca çanına/bildirim sayfasına HİÇBİR ŞEY düşmüyordu.
-- Sebep `notify_staff_new_ticket` içindeki son satırdı:
--     WHERE s.user_id <> NEW.user_id;   -- kendi talebinin bildirimini alma
-- Bu satır DOĞRU bir amaçla yazılmıştı (ekip üyesi kendi açtığı talep için "Yeni destek
-- talebi" iş bildirimi almasın) ama yan etkisi şuydu: sıradan müşteri de zaten o sorgunun
-- kaynağında (staff_departments / user_roles) olmadığı için HİÇ bildirim almıyordu.
-- Yani müşteri "talebim gitti mi?" sorusunun cevabını üründe hiçbir yerde göremiyordu.
--
-- ÇÖZÜM: İki AYRI bildirim, iki AYRI amaç:
--   1) EKİBE  → 'support_new'        "Yeni destek talebi"  → /admin/destek/<id>   (iş bildirimi)
--   2) SAHİBE → 'support_created'    "Talebin alındı"      → /panel/destek/<id>   (onay bildirimi)
-- Sahip, ekip sorgusundan HÂLÂ dışlanıyor → ekip üyesi kendi talebinde ÇİFT bildirim almaz;
-- bunun yerine (herkes gibi) tek bir "Talebin alındı" bildirimi alır.
--
-- ⚠️ MOBİL DE ETKİLENİR — ve bu İSTENEN sonuç: mobil çan aynı `notifications` tablosunu
--    okuyor, yani mobil kullanıcı da onay bildirimini görür (parite kazancı, kırılma değil).
--    Mobil kod değişikliği GEREKMEZ: yeni satır mevcut listeye normal bir kayıt olarak düşer.
-- ⚠️ `link` alanı SAHİP için /panel/... olmalı: NotificationBell'de link data.ticket_id'den
--    ÖNCELİKLİ (app/panel/NotificationBell.tsx). Ekip linki (/admin/...) verilseydi müşteri
--    giremeyeceği bir adrese tıklardı.
-- ⚠️ Tek trigger, tek fonksiyon — ikinci bir trigger EKLENMEDİ: aynı olayda iki trigger'ın
--    sırası garanti değil ve biri patlarsa diğerinin durumu belirsiz kalır.

CREATE OR REPLACE FUNCTION public.notify_staff_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  /* 1) EKİP: o departmanın üyeleri + TÜM admin'ler. Sahip dışlanır (çift bildirim olmasın).
     ⚠️ `link` DOLU olmalı: NotificationBell'de link, data.ticket_id'den ÖNCELİKLİ
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
  WHERE s.user_id <> NEW.user_id;   -- kendi talebinin İŞ bildirimini alma

  /* 2) SAHİP: "Talebin alındı" onayı. Sahibi silinmiş olamaz (INSERT anı) ama kolon
     NULL kabul ettiği için (ON DELETE SET NULL, 2026-07-20) yine de guard'lı. */
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, data)
    VALUES (
      NEW.user_id,
      'support_created',
      'Talebin alındı',
      NEW.subject,
      '/panel/destek/' || NEW.id::text,
      jsonb_build_object('ticket_id', NEW.id, 'department', NEW.department)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger'ın kendisi DEĞİŞMEDİ (aynı ad, aynı olay) — yalnız fonksiyon gövdesi güncellendi.
-- Yine de tanımı burada tekrarlıyoruz ki bu dosya tek başına çalıştırılabilsin.
DROP TRIGGER IF EXISTS trg_notify_staff_new_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_staff_new_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_staff_new_ticket();

-- ─────────────────────────── DOĞRULAMA (sadece OKUR) ───────────────────────────
-- Çalıştırdıktan sonra bunu da çalıştır: 2 satır, ikisi de ✅ olmalı.
SELECT
  'Fonksiyon sahibe bildirim yazıyor mu' AS kontrol,
  CASE WHEN pg_get_functiondef('public.notify_staff_new_ticket()'::regprocedure)
            LIKE '%support_created%'
       THEN '✅ evet' ELSE '❌ HAYIR — dosya çalışmamış' END AS sonuc
UNION ALL
SELECT
  'Trigger support_tickets INSERT''te bağlı mı',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'support_tickets'
      AND t.tgname = 'trg_notify_staff_new_ticket'
      AND NOT t.tgisinternal
  ) THEN '✅ evet' ELSE '❌ HAYIR' END;

-- Canlı test (isteğe bağlı): panelden yeni talep aç, sonra
--   SELECT type, title, link FROM public.notifications
--   WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 3;
-- → 'support_created' / 'Talebin alındı' satırı görünmeli.
