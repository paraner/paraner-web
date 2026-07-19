-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN PANELİ RPC'LERİ   (17.07.2026)
-- Supabase → SQL Editor'de çalıştır. İdempotent (tekrar çalıştırmak zararsız).
--
-- ⚠️ ŞEMA DEĞİŞMİYOR: tablo/kolon eklenmiyor, yalnız 4 okuma fonksiyonu.
-- ⚠️ Hepsi SECURITY DEFINER + YÖNETİCİ GUARD'I: agent (destek) bile çağıramaz.
--    Guard olmasaydı bu fonksiyonlar herkesin e-postasını sızdırırdı.
--
-- NEDEN GEREKLİ (üçü de panelde bugün yaşanan gerçek sorunlar):
--  1) admin_online_users — Canlı Görünüm e-postayı auth.users'tan alıyor ve AKTİF KİŞİ
--     BAŞINA 1 getUserById atıyor. 3000 eşzamanlı aktifte çöker; şimdi 50'de kırpıyoruz.
--     Bu fonksiyon hepsini TEK sorguda döner.
--  2) admin_dead_profiles — "kayıt olmuş ama hiç işlem girmemiş" (ölü kayıt). JS'te
--     yapmak tüm transactions.user_id'yi çekmeyi gerektirir; DB'de tek sorgu.
--  3) admin_module_adoption — hangi modülü kaç kişi kullanıyor. 20+ tabloya ayrı ayrı
--     sorgu atmak yerine tek çağrı.
--  4) admin_active_counts — DAU/WAU/MAU.
-- ═══════════════════════════════════════════════════════════════════════════

-- Ortak guard: yalnız 'admin' rolü. (agent = destek personeli müşteri verisi göremez —
-- app/admin/* sayfalarındaki requireAdminPage ile aynı kural, DB tarafında da.)
CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Yetkisiz işlem';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assert_admin() TO authenticated;

-- ── 1) Şu an aktif kullanıcılar (e-posta DAHİL, tek sorgu) ─────────────────
CREATE OR REPLACE FUNCTION public.admin_online_users(p_since timestamptz)
RETURNS TABLE (
  user_id     uuid,
  email       text,
  last_seen   timestamptz,
  device_name text,
  platform    text,
  city        text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN QUERY
  -- Bir kişinin birden fazla cihazı olabilir (telefon + tarayıcı) → EN YENİ olanı.
  SELECT DISTINCT ON (d.user_id)
    d.user_id, u.email::text, d.last_seen, d.device_name, d.platform, d.last_city
  FROM public.user_devices d
  JOIN auth.users u ON u.id = d.user_id
  WHERE d.last_seen >= p_since
  ORDER BY d.user_id, d.last_seen DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_online_users(timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_online_users(timestamptz) TO authenticated;

-- ── 2) DAU / WAU / MAU ─────────────────────────────────────────────────────
-- Kaynak: user_devices.last_seen (kalp atışı 5 dk'da bir tazeliyor).
-- ⚠️ SINIR: last_seen yalnız SON görülmeyi tutar, geçmiş yok → bu sayılar "son X gün
-- içinde en az bir kez görülen" demektir. Geçmişe dönük gün-gün grafik ÜRETİLEMEZ.
CREATE OR REPLACE FUNCTION public.admin_active_counts()
RETURNS TABLE (dau bigint, wau bigint, mau bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN QUERY
  SELECT
    count(DISTINCT user_id) FILTER (WHERE last_seen >= now() - interval '1 day'),
    count(DISTINCT user_id) FILTER (WHERE last_seen >= now() - interval '7 days'),
    count(DISTINCT user_id) FILTER (WHERE last_seen >= now() - interval '30 days')
  FROM public.user_devices;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_active_counts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_active_counts() TO authenticated;

-- ── 3) Ölü kayıtlar: hiç işlem girmemiş profiller ──────────────────────────
-- transactions.user_id = PROFİL id (kişi id DEĞİL) — projenin genel kuralı.
CREATE OR REPLACE FUNCTION public.admin_dead_profiles()
RETURNS TABLE (
  profil_id    uuid,
  auth_user_id uuid,
  ad           text,
  profil_turu  text,
  kayit        timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN QUERY
  SELECT p.id, p.auth_user_id, COALESCE(p.profile_name, p.name, '—')::text,
         p.profile_type::text, p.created_at
  FROM public.profiles p
  WHERE NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.user_id = p.id)
  ORDER BY p.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_dead_profiles() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_dead_profiles() TO authenticated;

-- ── 4) Modül benimseme: hangi modülü kaç profil kullanıyor ─────────────────
-- ⚠️ Sahiplik kolonu tablodan tabloya DEĞİŞİYOR (user_id vs profile_id) → kolon adı
-- SABİT YAZILMIYOR, information_schema'dan okunuyor. Tablo veya kolon yoksa o satır
-- sessizce ATLANIR (şema değişirse fonksiyon patlamaz).
CREATE OR REPLACE FUNCTION public.admin_module_adoption()
RETURNS TABLE (modul text, tablo text, kullanici_sayisi bigint, kayit_sayisi bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r        record;
  v_col    text;
  v_users  bigint;
  v_rows   bigint;
BEGIN
  PERFORM public.assert_admin();

  FOR r IN
    SELECT * FROM (VALUES
      ('İşlemler',            'transactions'),
      ('Faturalar',           'invoices'),
      ('Teklifler',           'quotes'),
      ('Ürünler',             'products'),
      ('Stok hareketleri',    'stock_movements'),
      ('Çalışanlar',          'employees'),
      ('Çalışan harcamaları', 'employee_expenses'),
      ('İzinler',             'employee_leaves'),
      ('Maaş ödemeleri',      'salary_payments'),
      ('Cari hesaplar',       'current_accounts'),
      ('Veresiye',            'credit_book'),
      ('Borç/Alacak',         'debts'),
      ('Çek/Senet',           'checks_notes'),
      ('Kasa/Banka',          'bank_accounts'),
      ('Düzenli ödemeler',    'recurring_payments'),
      ('Düzenli faturalar',   'recurring_invoices'),
      ('Bütçeler',            'category_budgets'),
      ('Cüzdan/Varlıklar',    'savings_assets'),
      ('Birikim hedefleri',   'savings_goals'),
      ('Mutabakat',           'reconciliations'),
      ('Kişiler',             'contacts'),
      ('AI sohbet',           'chat_messages')
    ) AS t(modul, tablo)
  LOOP
    SELECT c.column_name INTO v_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = r.tablo
      AND c.column_name IN ('user_id', 'profile_id')
    ORDER BY c.column_name
    LIMIT 1;

    CONTINUE WHEN v_col IS NULL;  -- tablo/kolon yok → atla

    EXECUTE format('SELECT count(DISTINCT %I), count(*) FROM public.%I', v_col, r.tablo)
      INTO v_users, v_rows;

    modul := r.modul;
    tablo := r.tablo;
    kullanici_sayisi := v_users;
    kayit_sayisi := v_rows;
    RETURN NEXT;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_module_adoption() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_module_adoption() TO authenticated;

-- ── DOĞRULAMA ──────────────────────────────────────────────────────────────
-- Yönetici hesabıyla (admin@paraner.com) uygulamadan çağrılır. SQL Editor'de
-- auth.uid() NULL olduğu için burada "Yetkisiz işlem" almanız NORMALDİR — guard çalışıyor
-- demektir. Panel açıldığında veriler görünüyorsa kurulum tamamdır.
