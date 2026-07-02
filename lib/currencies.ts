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
  { code: "AED", symbol: "AED", name: "BAE Dirhemi", flag: "🇦🇪" },
  { code: "QAR", symbol: "QAR", name: "Katar Riyali", flag: "🇶🇦" },
  { code: "KWD", symbol: "KWD", name: "Kuveyt Dinarı", flag: "🇰🇼" },
  { code: "BHD", symbol: "BHD", name: "Bahreyn Dinarı", flag: "🇧🇭" },
  { code: "JPY", symbol: "¥", name: "Japon Yeni", flag: "🇯🇵" },
  { code: "CNY", symbol: "¥", name: "Çin Yuanı", flag: "🇨🇳" },
  { code: "RUB", symbol: "₽", name: "Rus Rublesi", flag: "🇷🇺" },
  { code: "AZN", symbol: "₼", name: "Azerbaycan Manatı", flag: "🇦🇿" },
  { code: "CAD", symbol: "$", name: "Kanada Doları", flag: "🇨🇦" },
  { code: "AUD", symbol: "$", name: "Avustralya Doları", flag: "🇦🇺" },
  { code: "SEK", symbol: "kr", name: "İsveç Kronu", flag: "🇸🇪" },
  { code: "NOK", symbol: "kr", name: "Norveç Kronu", flag: "🇳🇴" },
  { code: "DKK", symbol: "kr", name: "Danimarka Kronu", flag: "🇩🇰" },
  { code: "PLN", symbol: "zł", name: "Polonya Zlotisi", flag: "🇵🇱" },
  { code: "INR", symbol: "₹", name: "Hindistan Rupisi", flag: "🇮🇳" },
  { code: "EGP", symbol: "EGP", name: "Mısır Lirası", flag: "🇪🇬" },
  { code: "ZAR", symbol: "R", name: "Güney Afrika Randı", flag: "🇿🇦" },
  { code: "BRL", symbol: "R$", name: "Brezilya Reali", flag: "🇧🇷" },
  { code: "MXN", symbol: "$", name: "Meksika Pesosu", flag: "🇲🇽" },
  { code: "KRW", symbol: "₩", name: "Güney Kore Wonu", flag: "🇰🇷" },
  { code: "HKD", symbol: "$", name: "Hong Kong Doları", flag: "🇭🇰" },
  { code: "SGD", symbol: "$", name: "Singapur Doları", flag: "🇸🇬" },
  { code: "NZD", symbol: "$", name: "Yeni Zelanda Doları", flag: "🇳🇿" },
  { code: "UAH", symbol: "₴", name: "Ukrayna Grivnası", flag: "🇺🇦" },
];

export const getCurrencySymbol = (code: string): string =>
  CURRENCIES.find((c) => c.code === code)?.symbol || code;
