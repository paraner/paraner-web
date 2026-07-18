-- ═══════════════════════════════════════════════════════════════════════════
-- K3 FIX (2026-07-18) — destek personeli TAKLİDİ engellendi
-- Denetim: DENETIM-ADMIN-2026-07-18.md
--
-- SORUN: destek-faz0.sql'deki messages_insert politikası yalnız
--   `sender_id = auth.uid()` + bilet erişimi kontrol ediyordu; `sender_type`'a
--   HİÇ bakmıyordu. Normal müşteri kendi biletine sender_type='agent' yazabiliyordu:
--     1) Arayüzde Paraner destek yanıtı gibi görünür (sahte ekran görüntüsü),
--     2) trg_touch_ticket durumu 'answered' yapar → bilet agent kuyruğundaki
--        AÇIK listeden DÜŞER → gerçek destek talebi görünmez olur (asıl zarar),
--     3) trg_notify_agent_reply tetiklenir → Resend'den e-posta gider (kota).
--
-- ÇÖZÜM: sender_type ile gerçek rol eşleşmek ZORUNDA.
--   'agent' yazabilmek için is_support_agent(), 'user' yazabilmek için bilet sahibi.
--
-- ⚠️ Agent paneli (web /admin/destek + mobil) mesajı KULLANICI OTURUMUYLA yazıyor
--   (service_role değil) → is_support_agent() true döner, agent akışı BOZULMAZ.
-- ⚠️ sender_type başka bir değer olursa (yazım hatası) insert artık REDDEDİLİR —
--   sessizce yanlış tipte kayıt oluşmasındansa hata vermesi doğrudur.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists messages_insert on public.ticket_messages;
create policy messages_insert on public.ticket_messages for insert
  with check (
    sender_id = auth.uid()
    and (
      -- Destek personeli: her bilete agent olarak yazabilir.
      (sender_type = 'agent' and public.is_support_agent())
      -- Müşteri: YALNIZ kendi biletine ve YALNIZ 'user' olarak.
      or (sender_type = 'user' and exists (
            select 1 from public.support_tickets t
            where t.id = ticket_id and t.user_id = auth.uid()
          ))
    )
  );

-- ── DOĞRULAMA ──────────────────────────────────────────────────────────────
-- Müşteri oturumuyla (kendi bileti):
--   insert into ticket_messages (ticket_id, sender_id, sender_type, body)
--   values ('<kendi-bilet-id>', auth.uid(), 'agent', 'test');
--   → "new row violates row-level security policy" VERMELİ.
--   Aynı satır sender_type='user' ile GEÇMELİ.
-- Agent oturumuyla sender_type='agent' GEÇMELİ.
