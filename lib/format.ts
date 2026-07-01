// Para ve tarih biçimlendirme — mobil uygulamayla birebir aynı görünüm.

// ₺1.234,56 (sembol başta, binlik nokta, ondalık virgül)
export function formatCurrency(amount: number, currency: string = "TRY"): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Kullanıcı girdisi tutarı sayıya çevir. Türkçe biçim: "1.234,56" (nokta binlik,
// virgül ondalık) DE desteklenir → 1234.56. Virgül yoksa İngilizce ondalık kabul
// edilir. Geçersizse NaN döner (çağıran genelde `|| 0` ile ele alır).
export function parseAmount(input: string): number {
  if (input == null) return NaN;
  let s = String(input).trim().replace(/\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); // binlik nokta at, virgül→nokta
  return Number(s);
}

// "2026-06-10" → "10.06.2026" (GG.AA.YYYY). Timezone kaymasını önlemek için
// tarih string'i elle parçalanır (new Date(...) UTC'ye kayabiliyor).
export function formatDate(date: string): string {
  const [y, m, d] = date.split("T")[0].split("-");
  if (!y || !m || !d) return date;
  return `${d}.${m}.${y}`;
}
