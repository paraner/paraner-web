// Para birimleri — mobil ile birebir (constants/currencies.ts).
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const CURRENCIES: Currency[] = [
  { code: "TRY", symbol: "₺", name: "Türk Lirası", flag: "🇹🇷" },
  { code: "USD", symbol: "$", name: "ABD Doları", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "İngiliz Sterlini", flag: "🇬🇧" },
  { code: "CHF", symbol: "CHF", name: "İsviçre Frangı", flag: "🇨🇭" },
  { code: "SAR", symbol: "SAR", name: "Suudi Riyali", flag: "🇸🇦" },
];

export const getCurrencySymbol = (code: string): string =>
  CURRENCIES.find((c) => c.code === code)?.symbol || code;
