-- ═══════════════════════════════════════════════════════════════════════════
-- PARLA SOHBET GEÇMİŞİ — 90 GÜN SAKLAMA   (24.07.2026, Mehmet kararı)
-- Supabase → SQL Editor'de çalıştır. İdempotent (tekrar çalıştırmak zararsız).
--
-- SORUN: `chat_messages` sonsuza kadar birikiyordu. Oysa kullanıcı için pratik
-- değeri yok: ekranda son 50 mesaj gösteriliyor (ParlaChat + mobil chatStore),
-- yapay zekâya bağlam olarak son 10 mesaj gidiyor. Gerisi yalnız yer kaplıyor
-- ve "ne kadar veri tutuyorsunuz" sorusunun cevabını zayıflatıyor.
--
-- KARAR: 90 gün. Sektörde bu tip asistanlarda 30-90 gün standart.
-- ⚠️ ŞEMA DEĞİŞMİYOR: tablo/kolon eklenmiyor. Yalnız bir fonksiyon + zamanlanmış iş.
-- ⚠️ Kullanıcının GELİR/GİDER kayıtlarına DOKUNMAZ — yalnız sohbet balonları silinir.
-- ⚠️ Sohbet mobil ile ORTAK (aynı tablo) → bu temizlik iki tarafı birden etkiler, doğrusu da bu.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── Temizlik fonksiyonu ────────────────────────────────────────────────────
-- SECURITY DEFINER: cron'un RLS'e takılmadan silebilmesi için (desen:
-- paraner-app/supabase/trial-expire-cron.sql `expire_stale_trials`).
CREATE OR REPLACE FUNCTION public.purge_old_chat_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  c_days constant integer := 90;  -- saklama süresi (tek yerde)
BEGIN
  WITH silinen AS (
    DELETE FROM chat_messages
    WHERE created_at < now() - (c_days || ' days')::interval
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM silinen;

  RAISE NOTICE 'purge_old_chat_messages: % eski sohbet mesaji silindi', v_count;
  RETURN v_count;
END;
$$;

-- ── Zamanlama: her gün 03:30 UTC ───────────────────────────────────────────
-- 03:00'da deneme düşürme cron'u çalışıyor; çakışmasın diye yarım saat sonra.
SELECT cron.unschedule('purge-old-chat-messages')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-chat-messages');

SELECT cron.schedule(
  'purge-old-chat-messages',
  '30 3 * * *',
  $$ SELECT public.purge_old_chat_messages(); $$
);

-- ── Birikmiş eski mesajları ŞİMDİ temizle (cron yarını beklemesin) ─────────
SELECT public.purge_old_chat_messages() AS silinen_mesaj_sayisi;

-- ── DOĞRULAMA ──────────────────────────────────────────────────────────────
-- 1) 90 günden eski mesaj kalmamalı (0 dönmeli):
--    select count(*) from chat_messages where created_at < now() - interval '90 days';
-- 2) Görev kurulmuş mu:
--    select jobname, schedule, active from cron.job where jobname = 'purge-old-chat-messages';
