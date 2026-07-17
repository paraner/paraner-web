/* Gemini fiyatlandırması — AI maliyet hesabının TEK KAYNAĞI.
 *
 * ⚠️ GOOGLE'IN FİYAT API'Sİ YOK. 17.07.2026'da ai.google.dev/gemini-api/docs/pricing
 * kontrol edildi: fiyatlar yalnız dokümantasyon sayfasında yayınlanıyor, programatik
 * uç nokta yok. Bu yüzden fiyat BURADA sabit; Google değiştirirse burayı güncelle.
 *
 * ⚠️ Google FATURAYI kullanıcı bazında BÖLEMEZ: onlar tek bir API anahtarı görüyor,
 * bizim kullanıcılarımızdan haberleri yok. "Hangi hesap ne kadar harcadı" dağılımı
 * yalnız BİZİM kaydımızdan çıkar: ai-chat edge function her çağrının token'ını
 * daily_ai_usage'a yazıyor (supabase/ai-token-maliyet.sql).
 *
 * Model: gemini-2.5-flash (ai-chat/index.ts'te sabit — tek sağlayıcı, tek model).
 */

/** 1 MİLYON token başına USD. Kaynak: ai.google.dev/gemini-api/docs/pricing (17.07.2026). */
export const GEMINI_FLASH_PRICING = {
  /** Metin VE görsel (fiş tarama) girişi aynı fiyatta. Ses $1.00 — kullanmıyoruz. */
  inputPerMillionUsd: 0.3,
  outputPerMillionUsd: 2.5,
} as const;

/** Fiyatın hangi tarihte doğrulandığı — panelde gösteriliyor ki kimse bayat sayıya güvenmesin. */
export const PRICING_CHECKED_AT = "17.07.2026";
export const PRICING_SOURCE = "ai.google.dev/gemini-api/docs/pricing";

/** Token → USD. Giriş ve çıkış AYRI fiyatlanır (çıkış ~8× pahalı). */
export function tokenCostUsd(promptTokens: number, completionTokens: number): number {
  return (
    (promptTokens / 1_000_000) * GEMINI_FLASH_PRICING.inputPerMillionUsd +
    (completionTokens / 1_000_000) * GEMINI_FLASH_PRICING.outputPerMillionUsd
  );
}

/** Küçük tutarlar için: $0.0001 gibi değerler "0,00" görünmesin. */
export function formatUsd(v: number): string {
  if (v === 0) return "$0";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}
