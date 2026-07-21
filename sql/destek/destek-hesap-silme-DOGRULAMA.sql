-- ═══════════════════════════════════════════════════════════════════════════
-- DOĞRULAMA — hesap silme / destek yazışması korunumu   ·   2026-07-20
-- SADECE OKUR. Hiçbir şeyi değiştirmez, güvenle tekrar çalıştırılabilir.
--
-- Ne için var: "Success" yazması işin doğru olduğunu göstermez (2026-07-18 dersi).
-- destek-hesap-silme-set-null.sql çalıştıktan SONRA burayı çalıştır → 6 satır ✅/❌.
--
-- ⚠️ NASIL ÇALIŞTIRILIR: bu dosyada ÜÇ AYRI sorgu var. Supabase SQL Editor hepsini birden
--    çalıştırınca YALNIZ SONUNCUSUNUN sonucunu gösterir (Bölüm 1 ve 2 görünmez).
--    → Her bölümü AYRI AYRI çalıştır: bölümü fareyle SEÇ, sonra Run (⌘↵).
--      Seçim varken Supabase yalnız seçili metni çalıştırır.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── BÖLÜM 1: beklenen 6 kontrol ────────────────────────────────────────────
WITH fk AS (
  SELECT c.conrelid::regclass::text AS tablo,
         a.attname                  AS kolon,
         c.confdeltype              AS silme   -- a=NO ACTION, c=CASCADE, n=SET NULL
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
   WHERE c.contype = 'f'
     AND c.confrelid = 'auth.users'::regclass
     AND array_length(c.conkey, 1) = 1
),
kolonlar AS (
  -- ⚠️ Takma ad `notnull` OLAMAZ: NOTNULL PostgreSQL'de ayrılmış anahtar kelime
  --    (`x NOTNULL` = `x IS NOT NULL`) → parser onu operatör sanıp 42601 verir.
  SELECT (attrelid::regclass)::text AS tablo, attname AS kolon, attnotnull AS zorunlu
    FROM pg_attribute
   WHERE attrelid IN ('public.support_tickets'::regclass, 'public.ticket_messages'::regclass)
     AND attnum > 0 AND NOT attisdropped
)
SELECT * FROM (
  -- 1) Asıl hata: ticket_messages.sender_id artık SET NULL mı?
  SELECT 1 AS sira,
    'ticket_messages.sender_id → SET NULL (silme 500 hatası)' AS kontrol,
    CASE WHEN (SELECT silme FROM fk WHERE tablo='ticket_messages' AND kolon='sender_id') = 'n'
         THEN '✅ tamam'
         ELSE '❌ EKSİK → destek-hesap-silme-set-null.sql çalıştırılmamış' END AS sonuc

  -- 2) ASIL TUZAK: user_id CASCADE kalırsa yazışma yine yok olur (1 tek başına yetmez)
  UNION ALL SELECT 2,
    'support_tickets.user_id → SET NULL (yazışma KORUNSUN)',
    CASE WHEN (SELECT silme FROM fk WHERE tablo='support_tickets' AND kolon='user_id') = 'n'
         THEN '✅ tamam'
         WHEN (SELECT silme FROM fk WHERE tablo='support_tickets' AND kolon='user_id') = 'c'
         THEN '❌ HÂLÂ CASCADE → müşteri silinince TALEP DE SİLİNİYOR, (b) kararı uygulanmamış'
         ELSE '❌ EKSİK → destek-hesap-silme-set-null.sql çalıştırılmamış' END

  -- 3) Uyuyan kopya: atama özelliği açılınca personel silmeyi kilitlerdi
  UNION ALL SELECT 3,
    'support_tickets.assignee_id → SET NULL (personel silinebilsin)',
    CASE WHEN (SELECT silme FROM fk WHERE tablo='support_tickets' AND kolon='assignee_id') = 'n'
         THEN '✅ tamam' ELSE '❌ EKSİK → destek-hesap-silme-set-null.sql' END

  -- 4+5) NOT NULL kalkmış olmalı, yoksa FK SET NULL'ı UYGULAYAMAZ ve silme yine patlar
  UNION ALL SELECT 4,
    'support_tickets.user_id NOT NULL kalktı',
    CASE WHEN (SELECT zorunlu FROM kolonlar WHERE tablo='support_tickets' AND kolon='user_id') = false
         THEN '✅ tamam' ELSE '❌ HÂLÂ NOT NULL → SET NULL uygulanamaz, silme yine 500 verir' END

  UNION ALL SELECT 5,
    'ticket_messages.sender_id NOT NULL kalktı',
    CASE WHEN (SELECT zorunlu FROM kolonlar WHERE tablo='ticket_messages' AND kolon='sender_id') = false
         THEN '✅ tamam' ELSE '❌ HÂLÂ NOT NULL → SET NULL uygulanamaz, silme yine 500 verir' END

  -- 6) Bildirim trigger'ı NULL'a dayanıklı mı (IS DISTINCT FROM)
  UNION ALL SELECT 6,
    'notify_staff_new_ticket NULL-güvenli (IS DISTINCT FROM)',
    CASE WHEN pg_get_functiondef('public.notify_staff_new_ticket()'::regprocedure)
              LIKE '%IS DISTINCT FROM%'
         THEN '✅ tamam' ELSE '❌ EKSİK → `<> NEW.user_id` NULL''da kimseye bildirim göndermez' END
) t ORDER BY sira;


-- ── BÖLÜM 2: GENEL FK DENETİMİ ─────────────────────────────────────────────
-- "Başka nerede aynı bomba var?" Repo'daki SQL dosyaları tabloların TAMAMINI
-- göstermiyor olabilir (Dashboard'dan elle açılmış tablo repo'da görünmez) →
-- doğruyu catalog'dan oku. `NO ACTION` satırı = o kişiyi silmek 23503 ile PATLAR.
SELECT c.conrelid::regclass::text AS tablo,
       a.attname                  AS kolon,
       CASE c.confdeltype
         WHEN 'a' THEN '🔴 NO ACTION — bu satır varken kişi SİLİNEMEZ (23503)'
         WHEN 'r' THEN '🔴 RESTRICT — bu satır varken kişi SİLİNEMEZ'
         WHEN 'c' THEN '⚠️  CASCADE — kişiyle birlikte bu kayıt da SİLİNİR'
         WHEN 'n' THEN '✅ SET NULL — kayıt kalır, kimlik kopar'
         WHEN 'd' THEN '✅ SET DEFAULT'
       END AS silme_davranisi
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
 WHERE c.contype = 'f'
   AND c.confrelid = 'auth.users'::regclass
 ORDER BY (c.confdeltype IN ('a','r')) DESC, tablo, kolon;
-- 🔴 satır çıkarsa: hesap silme O TABLO yüzünden patlar. Kararı ver (CASCADE mi
--    SET NULL mi), sql/destek/destek-hesap-silme-set-null.sql'deki deseni kopyala.


-- ── BÖLÜM 3: SAHİPSİZ (silinmiş kullanıcıya ait) KAYIT SAYISI ──────────────
-- Silme sonrası "yazışma gerçekten kaldı mı" sorusunun cevabı.
SELECT 'sahipsiz talep'  AS ne, count(*) AS adet FROM public.support_tickets  WHERE user_id  IS NULL
UNION ALL
SELECT 'sahipsiz mesaj',       count(*)          FROM public.ticket_messages  WHERE sender_id IS NULL;
-- Henüz kimse silinmediyse 0/0 normaldir. Bir hesabı sildikten SONRA
-- buradaki sayı ARTMALI (0 kalırsa yazışma korunmamış demektir).
