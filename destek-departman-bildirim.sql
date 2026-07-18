-- ═══════════════════════════════════════════════════════════════════════════
-- DESTEK DEPARTMAN YÖNLENDİRME — ADIM 5 (EKİBE E-POSTA)  ·  2026-07-18
-- Plan: DESTEK-DEPARTMAN-PLAN.md §5 adım 5
--
-- NE EKSİKTİ: yeni talep gelince ekibe SADECE uygulama-içi çan bildirimi gidiyordu
-- (destek-departman.sql · notify_staff_new_ticket). Panele bakmayan personel talebi
-- görmüyordu. Bu dosya e-postayı ekler: müşteri → ekip yönü artık kapalı.
--
-- ⚠️ GOREVLER.md'deki "support-reply-notify alıcıyı departmana göre seçsin" notu YANLIŞTI:
--    o fonksiyon agent yanıtını MÜŞTERİYE yollar, alıcısı her zaman talebin sahibidir —
--    seçilecek bir alıcı yok. Gerçek eksik buydu, AYRI fonksiyonla çözüldü.
--
-- ⚠️ TETİKLEYİCİ `support_tickets` DEĞİL, `ticket_messages`. Sebep (kaynaktan doğrulandı):
--    createTicket() önce ticket'ı, SONRA ilk mesajı yazıyor (web lib/support.ts:39-50).
--    Ticket INSERT anında mesaj gövdesi HENÜZ YOK → e-posta içeriksiz giderdi.
--    Çan bildirimi ticket INSERT'inde kalıyor (o yalnız `subject` kullanıyor, sorun değil).
--
-- ÖN KOŞULLAR:
--   1) destek-departman.sql çalışmış olmalı (staff_departments + department kolonu)
--   2) Vault'ta `support_webhook_secret` VAR (destek-faz0.sql'de kurulmuştu — aynısı kullanılıyor)
--   3) EDGE DEPLOY:  supabase functions deploy support-new-ticket-notify --no-verify-jwt
--      ⚠️ SIRA: önce deploy, SONRA bu SQL. Ters sırada ilk talepte 404'e POST edilir
--         (zararsız — exception yutuluyor, talep yine açılır — ama o mail kaybolur).
-- ═══════════════════════════════════════════════════════════════════════════


CREATE OR REPLACE FUNCTION public.notify_staff_ticket_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  v_secret text;
  v_first  boolean;
BEGIN
  -- Yalnız MÜŞTERİ mesajı. Agent yanıtı zaten support-reply-notify ile müşteriye gidiyor.
  IF NEW.sender_type <> 'user' THEN RETURN NEW; END IF;

  /* YALNIZ İLK MESAJ = "yeni talep". Sonraki müşteri yanıtları bu maili TETİKLEMEZ.
     Bilinçli kapsam kararı: müşteri her yazdığında ekibe mail = kısa sürede gürültü →
     personel maili susturur → asıl yeni talep de kaçar. Takip yanıtları panelde
     "Yanıt bekleyen" filtresinde görünüyor (app/admin/destek).
     ⚠️ İleride "takip yanıtında da mail" istenirse: aşağıdaki v_first bloğunu kaldırmak
     YETER, edge function tarafında değişiklik gerekmez.
     NOT: trigger AFTER INSERT → NEW satırı tabloda ZATEN var, bu yüzden `id <> NEW.id`. */
  SELECT NOT EXISTS (
    SELECT 1 FROM public.ticket_messages m
    WHERE m.ticket_id = NEW.ticket_id AND m.id <> NEW.id
  ) INTO v_first;
  IF NOT v_first THEN RETURN NEW; END IF;

  -- E-posta gönderimi talebin AÇILMASINI asla bozmasın (çan bildirimi zaten yazıldı).
  BEGIN
    SELECT decrypted_secret INTO v_secret
      FROM vault.decrypted_secrets WHERE name = 'support_webhook_secret' LIMIT 1;
    IF v_secret IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://oqhonmmbcqrkcaoijgnb.supabase.co/functions/v1/support-new-ticket-notify',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-support-secret', v_secret),
        body := jsonb_build_object('type', 'INSERT', 'table', 'ticket_messages',
                                   'schema', 'public', 'record', to_jsonb(NEW))
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_staff_ticket_email ON public.ticket_messages;
CREATE TRIGGER trg_notify_staff_ticket_email
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_staff_ticket_email();


-- ═══════════════════════════════════════════════════════════════════════════
-- DOĞRULAMA
--
-- 1) İKİNCİ bir hesapla (müşteri) /panel/destek → "Satış & Abonelik" seçip talep aç.
--    → admin@paraner.com'a "[Satış & Abonelik] Yeni talep: ..." maili gelmeli,
--      içinde MESAJ GÖVDESİ + müşteri adı/e-postası dolu olmalı (boşsa tetikleyici yanlış yerde).
--    → "Talebi Aç" butonu admin.paraner.com/destek/<id> açmalı.
--
-- 2) Aynı talebe müşteri İKİNCİ mesajı yazsın → YENİ MAİL GELMEMELİ (ilk-mesaj kuralı).
--
-- 3) Kendi talebini açan personel kendine mail almamalı:
--    admin@paraner.com ile talep aç → sana mail GELMEMELİ.
--
-- 4) Gönderim log'u:  Supabase → Edge Functions → support-new-ticket-notify → Logs
--    → {"sent":N,"failed":0}.  "no recipients" uyarısı görürsen o departmanda kimse yok
--      (staff_departments'a ata) — talep kimseye düşmüyor demektir.
--
-- 5) net.http_post kuyruğu (mail hiç gelmediyse ÖNCE buraya bak):
--    select id, status_code, error_msg, created
--      from net._http_response order by created desc limit 5;
--    → 401 = secret uyuşmuyor (Vault ↔ Edge Secrets aynı değer mi?)
--    → 404 = fonksiyon deploy edilmemiş
-- ═══════════════════════════════════════════════════════════════════════════
