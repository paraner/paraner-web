// Piyasa fiyatları (Truncgil) — mobil `marketService.ts` ile birebir mantık.
// Web'de SERVER tarafında çekilir (CORS yok) ve Next fetch ile 5 dk cache'lenir.

const TRUNCGIL_URL = "https://finans.truncgil.com/today.json";
const CACHE_TTL_SEC = 5 * 60; // 5 dakika

export interface CurrencyRate {
  code: string;
  name: string;
  buyRate: number;
  sellRate: number;
  changePercent: number;
}

export interface GoldPrice {
  name: string;
  buyPrice: number;
  sellPrice: number;
  changePercent: number;
}

export interface MarketData {
  currencies: CurrencyRate[];
  gold: GoldPrice[];
  timestamp: number;
  isStale?: boolean;
}

// "6.306,79" → 6306.79
function parseTR(val: string): number {
  if (!val) return 0;
  return parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
}

// "%0,30" → 0.30
function parsePct(val: string): number {
  if (!val) return 0;
  return parseFloat(val.replace("%", "").replace(",", ".")) || 0;
}

const CURRENCY_MAP: Record<string, { code: string; name: string }> = {
  USD: { code: "USD", name: "ABD Doları" },
  EUR: { code: "EUR", name: "Euro" },
  GBP: { code: "GBP", name: "İngiliz Sterlini" },
  CHF: { code: "CHF", name: "İsviçre Frangı" },
  SAR: { code: "SAR", name: "Suudi Riyali" },
};

const GOLD_MAP: Record<string, string> = {
  "gram-altin": "Gram Altın",
  "ceyrek-altin": "Çeyrek Altın",
  "yarim-altin": "Yarım Altın",
  "tam-altin": "Tam Altın",
  "cumhuriyet-altini": "Cumhuriyet Altını",
};

// Sunucuda Truncgil'i çek + Next cache (revalidate 5 dk). Hata olursa boş döner.
export async function fetchMarket(): Promise<MarketData> {
  try {
    const res = await fetch(TRUNCGIL_URL, {
      next: { revalidate: CACHE_TTL_SEC },
    });
    if (!res.ok) throw new Error("Veri alınamadı");
    const data: Record<string, { Alış?: string; Satış?: string; Değişim?: string }> =
      await res.json();

    const currencies: CurrencyRate[] = [];
    for (const [key, info] of Object.entries(CURRENCY_MAP)) {
      const item = data[key];
      if (item) {
        currencies.push({
          code: info.code,
          name: info.name,
          buyRate: parseTR(item["Alış"] ?? ""),
          sellRate: parseTR(item["Satış"] ?? ""),
          changePercent: parsePct(item["Değişim"] ?? ""),
        });
      }
    }

    const gold: GoldPrice[] = [];
    for (const [key, name] of Object.entries(GOLD_MAP)) {
      const item = data[key];
      if (item) {
        gold.push({
          name,
          buyPrice: parseTR(item["Alış"] ?? ""),
          sellPrice: parseTR(item["Satış"] ?? ""),
          changePercent: parsePct(item["Değişim"] ?? ""),
        });
      }
    }

    return { currencies, gold, timestamp: Date.now(), isStale: false };
  } catch {
    return { currencies: [], gold: [], timestamp: Date.now(), isStale: true };
  }
}

// ─── Yardımcılar ───
export function getCurrencyRate(currencies: CurrencyRate[], code: string): number {
  return currencies.find((c) => c.code === code)?.buyRate || 0;
}

export function getGoldBuyPrice(gold: GoldPrice[], name: string): number {
  return gold.find((g) => g.name === name)?.buyPrice || 0;
}

export function getCurrencyChange(currencies: CurrencyRate[], code: string): number {
  return currencies.find((c) => c.code === code)?.changePercent || 0;
}

export function getGoldChange(gold: GoldPrice[], name: string): number {
  return gold.find((g) => g.name === name)?.changePercent || 0;
}
