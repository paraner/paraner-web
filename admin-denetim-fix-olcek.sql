-- ═══════════════════════════════════════════════════════════════════════════
-- ÖLÇEK DÜZELTMELERİ (2026-07-18) — O1 · O3 · O4
-- Denetim: DENETIM-ADMIN-2026-07-18.md
--
-- Üçü de BUGÜN sorun çıkarmıyor (veri az). Büyüdükçe ısırırlar; ikisi panelin
-- HATA VERMESİNE yol açar (timeout), o yüzden şimdiden kapatılıyor.
-- ⚠️ Şema değişmiyor; yeni bir indeks + iki fonksiyon gövdesi + bir yeni fonksiyon.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── O1) user_devices.last_seen indeksi ─────────────────────────────────────
-- admin_online_users ve admin_active_counts'ın İKİSİ de bu kolonla filtreliyor
-- ama tek indeks user_id üzerindeydi (login-devices-migration.sql:32) → her
-- Canlı Görünüm açılışı TAM TABLO TARAMASI. 3.000 kullanıcı × 2-3 cihazda ucuz,
-- 100k'da her 30 saniyede bir (LiveRefresh) tekrarlanan tarama olur.
-- ⚠️ CONCURRENTLY KULLANILMIYOR: Supabase SQL Editor ifadeleri transaction içinde
-- çalıştırıyor, CREATE INDEX CONCURRENTLY orada HATA verir. Tablo şu an küçük →
-- normal CREATE INDEX'in kısa kilidi zararsız. (Tablo büyüdükten sonra bu indeksi
-- yeniden kurman gerekirse psql'den CONCURRENTLY ile yap.)
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen
  ON public.user_devices (last_seen DESC);


-- ── O4) "Ölü kayıt" SAYISI için ayrı RPC — satırları ağdan geçirme ─────────
-- admin_dead_profiles() LIMIT'siz TÜM ölü profilleri döndürüyor, panel ise
-- yalnız `data.length` (sayı) kullanıyor → 100k kayıtta MB'larca satır boşuna
-- taşınıp timeout'a giriyordu. Sayı lazımsa sayıyı döndür.
-- ⚠️ admin_dead_profiles() SİLİNMİYOR: ileride "ölü kayıt listesi" ekranı için
--    lazım olacak (GOREVLER'deki ?seg=dead). Yalnız sayaç bundan okuyacak.
CREATE OR REPLACE FUNCTION public.admin_dead_profile_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count bigint;
BEGIN
  PERFORM public.assert_admin();
  SELECT count(*) INTO v_count
  FROM public.profiles p
  WHERE NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.user_id = p.id);
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_dead_profile_count() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_dead_profile_count() TO authenticated;


-- ── O3) admin_module_adoption: count(*) → HİBRİT (küçükte gerçek, büyükte tahmin) ──
-- Eski hâli 22 tabloda `count(DISTINCT sahip)` + `count(*)` çalıştırıyordu.
-- Postgres'te count(*) indeksle kısayola İNMEZ → milyonlarca transactions
-- satırında seq scan ×22. Supabase'de `authenticated` rolünün statement_timeout'u
-- varsayılan 8 SANİYE (SECURITY DEFINER bunu değiştirmez) → RPC yavaşlamakla
-- kalmaz, HATA VERMEYE başlar ve panel bölümü tamamen kaybolur.
--
-- KARAR (18.07 akşamı düzeltildi): `kayit_sayisi` HİBRİT — 50.000 satırın altında
-- GERÇEK count(*) (milisaniye sürer), üstünde pg_class.reltuples tahmini (timeout'tan
-- kaçmak için). İlk sürüm yalnız tahmin kullanıyordu ve YANLIŞTI: ANALYZE görmemiş
-- tabloda reltuples 0/-1 döndüğü için panel "3 profil kullanıyor · 0 kayıt" diyordu.
-- `kullanici_sayisi` her zaman gerçek: benimseme kararı ondan okunuyor.
--
-- ⚠️ Kolon adları/tipleri AYNI kalıyor → web tarafında değişiklik gerekmez.
-- ⚠️ D3 (aynı denetim) de kapatıldı: kolon seçimi ALFABETİKTİ (ORDER BY
--    column_name → 'profile_id' < 'user_id'). Bugün 22 tablonun hiçbirinde
--    ikisi birden yok, yani doğru çalışıyordu ama TESADÜFEN. Bir migration
--    herhangi bir tabloya profile_id eklerse benimseme sayıları SESSİZCE
--    değişirdi. Artık niyet açık: user_id varsa o kazanır.
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
    -- ⚠️ Liste admin-panel-rpc.sql'deki ile BİREBİR AYNI olmalı (tek kaynak orası).
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
    -- Sahiplik kolonu: user_id ÖNCELİKLİ (alfabetik sıraya güvenme — D3).
    SELECT c.column_name INTO v_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = r.tablo
      AND c.column_name IN ('user_id', 'profile_id')
    ORDER BY CASE c.column_name WHEN 'user_id' THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_col IS NULL THEN CONTINUE; END IF;  -- tablo/kolon yok → satırı atla

    -- Kullanıcı sayısı: GERÇEK (benimseme kararı buradan okunuyor).
    EXECUTE format('SELECT count(DISTINCT %I) FROM public.%I', v_col, r.tablo) INTO v_users;

    /* Kayıt sayısı — HİBRİT (2026-07-18 düzeltmesi).
       ⚠️ İLK SÜRÜM HATALIYDI: yalnız reltuples kullanıyordu. reltuples PLANLAYICI TAHMİNİ;
       tablo hiç ANALYZE/autovacuum görmemişse -1 veya 0 döner → panelde "İşlemler · 3 profil
       kullanıyor · 0 kayıt" gibi saçma satırlar çıktı (Mehmet ekran görüntüsüyle yakaladı).
       Doğrusu: küçük tabloda GERÇEK say (ucuz), yalnız BÜYÜK tabloda tahmine düş (timeout'tan
       kaçmak için). Eşik 50.000: altında count(*) milisaniyeler sürer. */
    SELECT c.reltuples::bigint INTO v_rows
    FROM pg_class c
    WHERE c.oid = ('public.' || quote_ident(r.tablo))::regclass;

    IF v_rows IS NULL OR v_rows < 50000 THEN
      -- Küçük/bilinmeyen tablo → gerçek sayım (doğruluk timeout riskinden önemli).
      EXECUTE format('SELECT count(*) FROM public.%I', r.tablo) INTO v_rows;
    END IF;

    modul := r.modul;
    tablo := r.tablo;
    kullanici_sayisi := v_users;
    kayit_sayisi := COALESCE(v_rows, 0);
    RETURN NEXT;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_module_adoption() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_module_adoption() TO authenticated;


-- ── DOĞRULAMA (admin rolüyle) ──────────────────────────────────────────────
-- select * from public.admin_module_adoption();          → 22'ye kadar satır, hata yok
-- select public.admin_dead_profile_count();              → tek sayı
-- select indexname from pg_indexes
--   where tablename = 'user_devices';                    → idx_user_devices_last_seen görünmeli
