-- ═══════════════════════════════════════════════════════════════════════════
-- HESAP SİLME — DESTEK YAZIŞMASI KORUNSUN (ON DELETE SET NULL)  ·  2026-07-20
-- Karar: Mehmet, seçenek (b) — "yazışma geçmişi kalır, silinmiş kullanıcı olarak görünür".
--        Gerekçe: destek yazışması bir denetim/anlaşmazlık kaydıdır; müşteri silinse de
--        "bu talep açılmıştı, şöyle yanıtlandı" bilgisi kaybolmamalı.
--
-- ── NEDEN BU DOSYA VAR (ürün hatası) ──────────────────────────────────────
-- /admin/musteriler → "Kalıcı sil", destek talebi açmış HERHANGİ bir müşteride
-- HTTP 500 veriyordu:  {"code":"23503","constraint":"ticket_messages_sender_id_fkey"}
-- Sebep: ticket_messages.sender_id → auth.users FK'sinde ON DELETE davranışı YOK
-- (destek-faz0.sql:28). 2026-07-20 DB temizliğinde 8 hesabın 3'ü bu yüzden silinemedi.
--
-- ⚠️ TEK FK YETMEZ — GÖZDEN KAÇAN ASIL TUZAK:
--    sender_id'yi SET NULL yapmak TEK BAŞINA hiçbir şeyi korumaz. Çünkü
--    support_tickets.user_id → auth.users FK'si ON DELETE CASCADE (faz0.sql:11) ve
--    ticket_messages.ticket_id → support_tickets da CASCADE (faz0.sql:27):
--      kullanıcı silinir → TALEP gider → mesajlar peşinden gider.
--    Yani yazışmayı gerçekten korumak için user_id de CASCADE'den SET NULL'a çevrilmeli.
--    (Silme hatası ortadan kalkardı ama veri de kalmazdı → "düzelttik" sanırdık.)
--
-- ⚠️ ÜÇÜNCÜ FK — aynı hatanın uyuyan kopyası:
--    support_tickets.assignee_id → auth.users da ON DELETE davranışsız (faz0.sql:17).
--    Bugün acıtmıyor çünkü kolon HİÇ kullanılmıyor (GOREVLER: "assignee_id duruyor,
--    kullanılmıyor"). Ama talebe atama özelliği açılır açılmaz, atama yapılmış bir
--    PERSONELİ silmek aynı 23503 hatasını verirdi. Şimdi kapatıyoruz.
--
-- ── NE OLACAK (davranış) ──────────────────────────────────────────────────
--   Müşteri silinince:  talep + yazışma KALIR, user_id/sender_id NULL olur ("silinmiş kullanıcı")
--   Personel silinince: yazdığı agent mesajları KALIR, sender_id NULL olur; ataması boşalır
--   notifications / user_roles / staff_departments: CASCADE (değişmiyor) — bunlar geçici
--     kayıt, kişiye özel ve saklanmasının bir değeri yok.
--
-- ⚠️ KİMLİK TAMAMEN KOPAR: talepte silinen kişinin e-postası/adı SAKLANMAZ.
--    Bu bilinçli ve KVKK/GDPR "silme hakkı" ile uyumlu tarafta durur (anonimleştirme).
--    İstenirse ileride `support_tickets`'a `owner_email_snapshot` gibi bir kolon eklenebilir —
--    ama o AYRI bir karar (kişisel veriyi silme talebine rağmen tutmak demektir).
--    Karar verilene kadar EKLEMİYORUZ: sonradan eklemek kolay, sızmış veriyi geri almak zor.
--
-- ── ÖN KOŞUL ──────────────────────────────────────────────────────────────
--   sql/destek/destek-faz0.sql çalışmış olmalı (tablolar mevcut).
--   Bu dosya idempotent — güvenle tekrar çalıştırılabilir.
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → yapıştır → Run.
-- SONRA: sql/destek/destek-hesap-silme-DOGRULAMA.sql ile ölç ("Success" ≠ "doğru").
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Yardımcı: FK adını TAHMİN ETME, catalog'dan bul ────────────────────────
-- Ders (2026-07-18, denetim O8): kısıtlar faz0'da İSİMSİZ tanımlı → adı Postgres üretti.
-- Yanlış adla `DROP CONSTRAINT IF EXISTS` SESSİZCE hiçbir şey yapar ve "düzeldi" sanırız.
CREATE OR REPLACE FUNCTION pg_temp.fk_adi(p_tablo text, p_kolon text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
   WHERE c.conrelid  = p_tablo::regclass
     AND c.contype   = 'f'
     AND c.confrelid = 'auth.users'::regclass
     AND array_length(c.conkey, 1) = 1
     AND a.attname   = p_kolon
   LIMIT 1;
$$;


DO $$
DECLARE v_fk text;
BEGIN
  -- ══ 1) support_tickets.user_id : CASCADE → SET NULL ══════════════════════
  -- Bu olmadan talep komple silinir; alttaki 2. adım anlamsız kalır.
  ALTER TABLE public.support_tickets ALTER COLUMN user_id DROP NOT NULL;

  v_fk := pg_temp.fk_adi('public.support_tickets', 'user_id');
  IF v_fk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.support_tickets DROP CONSTRAINT %I', v_fk);
  END IF;
  ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

  -- ══ 2) ticket_messages.sender_id : (davranışsız) → SET NULL ═══════════════
  -- Asıl 500 hatasının kaynağı.
  ALTER TABLE public.ticket_messages ALTER COLUMN sender_id DROP NOT NULL;

  v_fk := pg_temp.fk_adi('public.ticket_messages', 'sender_id');
  IF v_fk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.ticket_messages DROP CONSTRAINT %I', v_fk);
  END IF;
  ALTER TABLE public.ticket_messages
    ADD CONSTRAINT ticket_messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;

  -- ══ 3) support_tickets.assignee_id : (davranışsız) → SET NULL ════════════
  -- Uyuyan kopya: atama özelliği açılınca personel silme aynı hatayı verirdi.
  v_fk := pg_temp.fk_adi('public.support_tickets', 'assignee_id');
  IF v_fk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.support_tickets DROP CONSTRAINT %I', v_fk);
  END IF;
  ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_assignee_id_fkey
    FOREIGN KEY (assignee_id) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;


-- ── 4) Bildirim trigger'ında NULL sertleştirmesi ───────────────────────────
-- destek-departman.sql:125 → `WHERE s.user_id <> NEW.user_id` ("kendi talebimin
-- bildirimini alma"). NEW.user_id NULL olursa `<>` NULL döner → HİÇ KİMSEYE bildirim
-- gitmez (SQL üç-değerli mantık). Bugün ERİŞİLEMEZ (talep hep sahipli açılır, NULL
-- ancak sonradan silmeyle oluşur) ama NOT NULL kalktığı için varsayım artık
-- garanti değil. `IS DISTINCT FROM` NULL'da da doğru çalışır.
CREATE OR REPLACE FUNCTION public.notify_staff_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, data)
  SELECT DISTINCT s.user_id,
         'support_new_ticket',
         'Yeni destek talebi',
         NEW.subject,
         '/admin/destek/' || NEW.id::text,
         jsonb_build_object('ticket_id', NEW.id, 'department', NEW.department)
    FROM (
      SELECT d.user_id FROM public.staff_departments d WHERE d.department = NEW.department
      UNION
      SELECT r.user_id FROM public.user_roles r WHERE r.role = 'admin'
    ) s
   WHERE s.user_id IS DISTINCT FROM NEW.user_id;   -- kendi talebinin bildirimini alma
  RETURN NEW;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- GÜVENLİK NOTU — "NOT NULL kalktı, şimdi sahipsiz kayıt yazılabilir mi?"
-- HAYIR. RLS zaten kapatıyor, çünkü NULL karşılaştırması true DÖNMEZ (fail-closed):
--   tickets_insert   WITH CHECK (user_id  = auth.uid())   → NULL = ... → NULL → RED
--   messages_insert  WITH CHECK (sender_id = auth.uid())  → NULL = ... → NULL → RED
-- Yani NULL'a yalnız FK'nin SET NULL'ı ile GEÇİLİR (silme anında), istemci yazamaz.
--
-- Sahipsiz talebi kim görür?
--   Müşteri: `user_id = auth.uid()` NULL'da eşleşmez → hiçbir müşteri sahiplenemez ✔
--   Personel: `is_support_agent() AND staff_sees_department(department)` → department
--             kolonu DURUYOR (silinmedi) → talep kendi departmanının kuyruğunda kalır ✔
--   Yeni müşteri mesajı: imkânsız (sahibi yok) → yazışma donar, arşiv gibi davranır ✔
-- ═══════════════════════════════════════════════════════════════════════════
