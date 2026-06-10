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

// "2026-06-10" → "10.06.2026" (GG.AA.YYYY). Timezone kaymasını önlemek için
// tarih string'i elle parçalanır (new Date(...) UTC'ye kayabiliyor).
export function formatDate(date: string): string {
  const [y, m, d] = date.split("T")[0].split("-");
  if (!y || !m || !d) return date;
  return `${d}.${m}.${y}`;
}
