// Birikim varlık kataloğu — mobil `savings-form.tsx` ASSET_TYPES ile birebir.
// Client-güvenli (piyasa fetch'i sunucuda; burada yalnızca katalog + değerleme matematiği).
import {
  type MarketData,
  getCurrencyRate,
  getGoldBuyPrice,
  getCurrencyChange,
  getGoldChange,
} from "./market";

export type AssetGroup = "cash" | "forex" | "gold";

export interface AssetDef {
  id: string;
  name: string;
  icon: string;
  unit: string; // "TL" | "USD" | "gr" | "adet"
  group: AssetGroup;
}

export const ASSET_TYPES: AssetDef[] = [
  { id: "TRY", name: "Türk Lirası", icon: "🇹🇷", unit: "TL", group: "cash" },
  { id: "USD", name: "ABD Doları", icon: "🇺🇸", unit: "USD", group: "forex" },
  { id: "EUR", name: "Euro", icon: "🇪🇺", unit: "EUR", group: "forex" },
  { id: "GBP", name: "İngiliz Sterlini", icon: "🇬🇧", unit: "GBP", group: "forex" },
  { id: "GRAM_GOLD", name: "Gram Altın", icon: "🥇", unit: "gr", group: "gold" },
  { id: "QUARTER_GOLD", name: "Çeyrek Altın", icon: "🪙", unit: "adet", group: "gold" },
  { id: "HALF_GOLD", name: "Yarım Altın", icon: "🪙", unit: "adet", group: "gold" },
  { id: "FULL_GOLD", name: "Tam Altın", icon: "🪙", unit: "adet", group: "gold" },
  { id: "REPUBLIC_GOLD", name: "Cumhuriyet Altını", icon: "🪙", unit: "adet", group: "gold" },
];

// Altın asset_type → gerçek görsel (mobil assets/gold ile aynı dosyalar, public/gold).
export const GOLD_IMAGES: Record<string, string> = {
  GRAM_GOLD: "/gold/gram.png",
  QUARTER_GOLD: "/gold/ceyrek.png",
  HALF_GOLD: "/gold/yarim.png",
  FULL_GOLD: "/gold/tam.png",
  REPUBLIC_GOLD: "/gold/cumhuriyet.png",
};

// Altın asset_type → Truncgil isim (fiyat eşleştirme)
export const GOLD_NAME_MAP: Record<string, string> = {
  GRAM_GOLD: "Gram Altın",
  QUARTER_GOLD: "Çeyrek Altın",
  HALF_GOLD: "Yarım Altın",
  FULL_GOLD: "Tam Altın",
  REPUBLIC_GOLD: "Cumhuriyet Altını",
};

export function getAssetDef(id: string): AssetDef {
  return ASSET_TYPES.find((a) => a.id === id) || ASSET_TYPES[0];
}

// Bir varlığın güncel TL karşılığı (miktar × birim fiyat). Mobil getTLValue ile aynı.
export function getTLValue(
  assetType: string,
  amount: number,
  market: MarketData | null
): number {
  if (assetType === "TRY") return amount;
  if (!market) return 0;
  const def = getAssetDef(assetType);
  if (def.group === "forex") {
    const rate = getCurrencyRate(market.currencies, assetType);
    return rate > 0 ? amount * rate : 0;
  }
  if (def.group === "gold" && GOLD_NAME_MAP[assetType]) {
    const price = getGoldBuyPrice(market.gold, GOLD_NAME_MAP[assetType]);
    return price > 0 ? amount * price : 0;
  }
  return 0;
}

// Birim güncel fiyat (alış maliyeti ipucu + satış varsayılanı için).
export function getUnitPrice(assetType: string, market: MarketData | null): number {
  if (!market || assetType === "TRY") return 0;
  const def = getAssetDef(assetType);
  if (def.group === "forex") return getCurrencyRate(market.currencies, assetType);
  if (def.group === "gold" && GOLD_NAME_MAP[assetType])
    return getGoldBuyPrice(market.gold, GOLD_NAME_MAP[assetType]);
  return 0;
}

// Varlığın günlük değişim yüzdesi.
export function getChangePct(assetType: string, market: MarketData | null): number {
  if (!market) return 0;
  const def = getAssetDef(assetType);
  if (def.group === "forex") return getCurrencyChange(market.currencies, assetType);
  if (def.group === "gold" && GOLD_NAME_MAP[assetType])
    return getGoldChange(market.gold, GOLD_NAME_MAP[assetType]);
  return 0; // nakit
}
