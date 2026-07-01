// Tarih yardımcıları — Supabase date kolonları YYYY-MM-DD bekler.
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function todayStr(): string {
  return ymd(new Date());
}

// Bir YYYY-MM-DD tarihini periyoda göre ilerlet (düzenli ödeme/fatura sonraki tarih).
// UTC-güvenli (new Date(str) timezone kaymasını önler) + ay taşması KISILIR
// (31 Oca +1 ay → 28/29 Şub, "3 Mar" değil). period: weekly|monthly|quarterly|yearly.
export function advanceDate(dateStr: string, period: string): string {
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  let year = y;
  let month = (m || 1) - 1; // 0-indeksli
  let day = d || 1;
  if (period === "weekly") {
    return new Date(Date.UTC(year, month, day + 7)).toISOString().slice(0, 10);
  }
  const addMonths = period === "yearly" ? 12 : period === "quarterly" ? 3 : 1;
  month += addMonths;
  year += Math.floor(month / 12);
  month = ((month % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  day = Math.min(day, lastDay); // ay taşmasını kıs
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}
