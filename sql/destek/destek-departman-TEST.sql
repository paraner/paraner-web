-- ═══════════════════════════════════════════════════════════════════════════
-- DESTEK DEPARTMAN — İKİNCİ HESAPLA CANLI TEST  (2026-07-18)
-- Adım 4 (RLS departman ayrımı) + Adım 5 (ekibe e-posta) tek hesapla test edilir.
--
-- ⚠️ SIRA ÖNEMLİ: önce TEST 1 (hesap HİÇBİR talebin sahibi değilken — sayılar temiz),
--    sonra TEST 2. Ters sırada hesap kendi talebinin sahibi olur ve sayı 1 değil 2 çıkar,
--    "acaba sızdırdı mı?" diye boşuna kafa karışır.
--
-- ⚠️ TEST 1 admin@paraner.com'un rolüne DOKUNMAZ (eski plandaki riskli C senaryosu iptal) —
--    kendi hesabını kilitleme ihtimali yok. Yeni hesapla yapılıyor.
--
-- BAŞLANGIÇ DURUMU (2026-07-18 doğrulandı): 6 talep, hepsi admin@paraner.com'a ait,
--   5 × teknik  ·  1 × oneri.  Testin beklenen sayıları buna dayanıyor.
--   Değişmişse önce şunu çalıştır:  select department, count(*) from support_tickets group by 1;
-- ═══════════════════════════════════════════════════════════════════════════


-- ── HAZIRLIK: ikinci hesabı aç ─────────────────────────────────────────────
-- paraner.com/kayit üzerinden normal bir hesap aç (ör. test-destek@…).
-- Aşağıdaki tüm sorgularda <TEST_MAIL> yerine o adresi yaz.


-- ═══ TEST 1 — ADIM 4: agent yalnız KENDİ departmanını görüyor mu? ═══════════
-- Hesabı 'agent' yap ve YALNIZ 'oneri' departmanına koy.
-- (admin YAPMA — admin her şeyi görür, test anlamsızlaşır.)

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'agent' FROM auth.users WHERE email = '<TEST_MAIL>'
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_departments (user_id, department)
SELECT id, 'oneri' FROM auth.users WHERE email = '<TEST_MAIL>'
ON CONFLICT DO NOTHING;

-- ▶ ŞİMDİ: admin.paraner.com'a <TEST_MAIL> ile GİR → Destek sayfası.
--
--   BEKLENEN ✅ : YALNIZ 1 talep görünür — "cdscsc" (Öneri rozetli).
--   BAŞARISIZ ❌ : 6 talep görünüyorsa RLS SIZDIRIYOR → dur, haber ver.
--   BAŞARISIZ ❌ : 0 talep görünüyorsa fazla daralttık (staff_departments ataması gitmemiş).
--
--   AYRICA (yetki ayrımı — agent müşteri verisi görmemeli):
--   Sol menüde "Müşteriler" GÖRÜNMEMELİ. URL'yi elle yaz (admin.paraner.com/admin/musteriler)
--   → 404 gelmeli (requireAdminPage). Gelmiyorsa yetki sızıntısı var → dur, haber ver.


-- ═══ TEST 2 — ADIM 5: yeni talepte ekibe e-posta gidiyor mu? ═══════════════
-- Önce hesabı personellikten ÇIKAR ki sıradan müşteri gibi davransın
-- (personel kendi talebinin mailini almaz — o yüzden agent kalırsa test yanıltır).

DELETE FROM public.staff_departments
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '<TEST_MAIL>');
DELETE FROM public.user_roles
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '<TEST_MAIL>') AND role = 'agent';

-- ▶ ŞİMDİ: app.paraner.com/panel/destek'e <TEST_MAIL> ile gir →
--   "Satış & Abonelik" seçip talep aç (konu + mesaj DOLU olsun).
--
--   BEKLENEN ✅ : admin@paraner.com'a e-posta gelir —
--     · konu:  [Satış & Abonelik] Yeni talep: <konu> — Paraner
--     · içinde MESAJ GÖVDESİ + müşteri adı/e-postası dolu
--     · "Talebi Aç" → admin.paraner.com/destek/<id>
--   ⚠️ Gövde BOŞSA tetikleyici yanlış yerde demektir → haber ver.
--
-- ▶ SONRA: aynı talebe müşteri olarak İKİNCİ bir mesaj yaz.
--   BEKLENEN ✅ : YENİ MAİL GELMEZ (yalnız ilk mesaj mail atar — bilinçli karar).

-- Mail gelmediyse ÖNCE buraya bak (401 = secret uyuşmuyor · 404 = edge yok · 200 = gitti):
--   select status_code, error_msg, created from net._http_response order by created desc limit 5;


-- ═══ TEMİZLİK (test bitince) ═══════════════════════════════════════════════
-- Test talebini ve bildirimlerini sil (<TEST_MAIL> hesabını silmeden önce):
--   delete from public.support_tickets
--     where user_id = (select id from auth.users where email = '<TEST_MAIL>');
--   (ticket_messages + notifications FK CASCADE ile gider — denetim O8)
--
-- Hesabı tamamen silmek istersen admin panelinden "Kalıcı sil" kullan
-- (auth + profiller + veriler birlikte gider).
