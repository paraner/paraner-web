// Tarih yardımcıları — Supabase date kolonları YYYY-MM-DD bekler.
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function todayStr(): string {
  return ymd(new Date());
}
