-- ═══════════════════════════════════════════════════════════════════════════
-- AI KURALLARI — SÜRÜM 2: "kaydettim" yalanını kapat
--
-- SORUN (24.07.2026, canlıda yakalandı): Kullanıcı "1000 tl nebahat hanıma gidr" yazdı.
-- Yazım hatası ("gidr") yüzünden sunucunun kelime tanıma katmanı eşleşmedi, mesaj yapay
-- zekâya düştü. Sürüm 1'deki şu kural —
--   "Kullanici islem eklemek, silmek veya sorgulamak isterse bu islemler sistem tarafindan
--    otomatik yapilir; sen analiz, oneri ve sohbet icin buradasin."
-- — modele "işlem zaten kaydedildi" izlenimi verdi: "kaydedildi" dedi, üstüne bu ayın
-- toplamlarını KENDİ hesaplayıp yazdı (500 + 1000 = 1500). Kayıt yoktu.
-- Bu, üründeki en zararlı hata türü: kullanıcı kaydettim sanıp gider takibini kaybeder.
--
-- ÇÖZÜM: model artık kaydetmez, TALEP eder (`@@ISLEM{...}` etiketi — sözleşme edge function
-- `brain/context.ts` içinde, koddadır çünkü ayrıştırıcıyla birebir eşleşmesi şart).
-- Sunucu kaydı yapar ve onay metnini KENDİ yazar → "kaydedildi" cümlesi ancak veritabanına
-- gerçekten yazıldıysa çıkabilir.
--
-- Bu dosya YALNIZ `closing` bölümünü değiştirir; diğer kurallar (kişilik, üslup, rehber…)
-- aktif sürümden AYNEN kopyalanır → panelden yapılmış düzenlemeler korunur.
-- ⚠️ Bu SQL'i çalıştırmadan önce edge function'ın yeni sürümü deploy edilmiş olmalı.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Aktif sürümü tut (kurallar korunsun)
create temp table _aktif_kural on commit drop as
  select config from public.ai_config_versions where is_active limit 1;

-- Tek-aktif-sürüm indeksi yüzünden ÖNCE pasifleştir, SONRA ekle
update public.ai_config_versions set is_active = false where is_active;

insert into public.ai_config_versions (config, note, is_active)
select
  jsonb_set(
    config,
    '{closing}',
    $json$[
      "Veritabanina SEN yazamazsin. Bir islemin kaydedildigini/silindigini ASLA soyleme; onayi sistem yazar.",
      "Kullanici islem eklemek isterse asagidaki ISLEM KAYDETME kurallarina uy.",
      "Sorgulama ve analiz senin isin: eldeki verilerle somut konus."
    ]$json$::jsonb
  ),
  'Sürüm 2 — AI artık "kaydettim" diyemiyor; işlem kaydı sistem tarafından yapılır (uydurma onay hatası kapatıldı).',
  true
from _aktif_kural;

commit;

-- ── DOĞRULAMA (1 satır, sürüm 2 aktif olmalı) ──
-- select note, is_active, created_at from public.ai_config_versions order by created_at desc limit 3;
