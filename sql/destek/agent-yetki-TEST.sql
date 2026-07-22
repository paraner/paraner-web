-- ═══════════════════════════════════════════════════════════════════════════
-- AGENT YETKİ TESTİ (2026-07-22) — "çalışan talebi SİLEMEZ" + departman ayrımı
--
-- NEDEN: Talep silme 2026-07-21'de eklendi ve "yalnız admin siler" diye tasarlandı
-- (buton `role === "admin"` ile gizli + sunucuda `requireAdmin()`). AMA agent rolünde
-- hesap olmadığı için HİÇ DENENMEDİ. Aynı şekilde departman ayrımı (Adım 4) da
-- yalnız doğrudan JWT sorgusuyla test edilmişti, TARAYICIDA değil.
-- Bu dosya ikisini TEK turda kapatır.
--
-- ⚠️ `destek-departman-TEST.sql`'in yerini almaz, onu TAMAMLAR: oradaki beklenen sayılar
--    2026-07-18'in verisine göre yazılmıştı (6 talep) ve bugün geçersiz. Burada sayı
--    SABİT YAZILMIYOR — Adım 0 canlıdan okuyor, beklentiyi ondan kuruyorsun.
--
-- ⚠️ admin@paraner.com'un rolüne DOKUNULMAZ. Kendi hesabını kilitleme riski yok.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ADIM 0: BEKLENTİYİ CANLIDAN OKU (sadece OKUR) ──────────────────────────
-- Agent'a 'oneri' departmanı verilecek → tarayıcıda TAM OLARAK bu kadar talep görmeli.
SELECT department, count(*) AS talep_sayisi
FROM public.support_tickets
GROUP BY department
ORDER BY department;
-- ▶ 'oneri' satırındaki sayıyı NOT AL. (Hiç 'oneri' talebi yoksa testten önce
--    panelden bir tane aç, yoksa "0 gördü" ile "fazla daralttık" ayırt edilemez.)


-- ── ADIM 1: test hesabını AGENT yap, YALNIZ 'oneri' departmanına koy ───────
-- <TEST_MAIL> yerine gerçek adresi yaz. (admin YAPMA — admin her şeyi görür, test ölür.)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'agent' FROM auth.users WHERE email = '<TEST_MAIL>'
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_departments (user_id, department)
SELECT id, 'oneri' FROM auth.users WHERE email = '<TEST_MAIL>'
ON CONFLICT DO NOTHING;

-- Atama tuttu mu? (2 satır, ikisi de dolu olmalı)
SELECT 'rol' AS ne, r.role AS deger FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id WHERE u.email = '<TEST_MAIL>'
UNION ALL
SELECT 'departman', d.department FROM public.staff_departments d
  JOIN auth.users u ON u.id = d.user_id WHERE u.email = '<TEST_MAIL>';


-- ── ADIM 2: TARAYICI KONTROLLERİ (admin.paraner.com'a <TEST_MAIL> ile gir) ──
--
--  A) DEPARTMAN AYRIMI
--     ✅ Destek sayfasında YALNIZ Adım 0'daki 'oneri' sayısı kadar talep görünür.
--     ❌ Hepsi görünüyorsa RLS SIZDIRIYOR → dur, haber ver.
--     ❌ 0 görünüyorsa fazla daralttık (departman ataması gitmemiş) → Adım 1'i tekrar bak.
--
--  B) 🔴 TALEP SİLME KAPALI MI (bu turun ASIL sorusu)
--     ✅ Talep listesinde satırların solunda SEÇİM KUTUSU YOK.
--     ✅ Başlıkta "Talepler · müşteri" yazar ama seç kutusu YOK.
--     ✅ Bir talebe gir → sağ üstte "Çözüldü" var ama "Sil" YOK.
--     ❌ Herhangi biri görünüyorsa: UI guard'ı delinmiş → dur, haber ver.
--
--  C) MÜŞTERİ VERİSİ KAPALI MI
--     ✅ Sol menüde "Müşteriler" ve "Ekip" GÖRÜNMEZ.
--     ✅ URL'yi ELLE yaz: admin.paraner.com/admin/musteriler → 404.
--     ❌ Sayfa açılıyorsa yetki sızıntısı → dur, haber ver.
--
--  D) 🔴 SUNUCU KAPISI (asıl güvenlik — UI'ı gizlemek yetmez)
--     Agent oturumundayken tarayıcı konsolunda server action'ı ELLE çağırmak
--     mümkün değil (action id'si gerekir), o yüzden pratik kontrol şu:
--     agent'ken bir talebi silmeyi başaramamalı VE denetim kaydına HİÇBİR
--     'ticket_deleted' satırı düşmemeli. Aşağıdaki sorgu testten SONRA çalıştırılır:
--        SELECT action, actor_email, created_at FROM public.admin_audit_log
--        WHERE action LIKE 'ticket_delete%' ORDER BY created_at DESC LIMIT 5;
--     ✅ <TEST_MAIL> adresine ait satır OLMAMALI.


-- ── ADIM 3: TEMİZLİK (test biter bitmez çalıştır) ──────────────────────────
-- ⚠️ ATLAMA: agent rolü kalırsa o hesap destek taleplerini görmeye devam eder.
DELETE FROM public.staff_departments
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '<TEST_MAIL>');
DELETE FROM public.user_roles
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '<TEST_MAIL>')
    AND role = 'agent';

-- Temizlik tuttu mu? İKİ satır da 0 olmalı.
SELECT 'kalan rol' AS ne, count(*) AS adet FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id WHERE u.email = '<TEST_MAIL>'
UNION ALL
SELECT 'kalan departman', count(*) FROM public.staff_departments d
  JOIN auth.users u ON u.id = d.user_id WHERE u.email = '<TEST_MAIL>';
