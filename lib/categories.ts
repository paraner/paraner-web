// Kategori kataloğu — mobil uygulamayla birebir aynı (constants/categories.ts).
// Not: mobildeki "özel kategoriler" cihazda (AsyncStorage) saklanır, DB'de değil —
// bu yüzden web yalnızca sabit kategorileri bilir.

export type Category = { id: string; label: string; color: string };

export const CATEGORIES: Category[] = [
  { id: "market", label: "Market", color: "#1D9E75" },
  { id: "kafe", label: "Kafe", color: "#BA7517" },
  { id: "ulasim", label: "Ulaşım", color: "#378ADD" },
  { id: "fatura", label: "Faturalar", color: "#7F77DD" },
  { id: "eglence", label: "Eğlence", color: "#D85A30" },
  { id: "saglik", label: "Sağlık", color: "#E24B4A" },
  { id: "giyim", label: "Giyim", color: "#D4537E" },
  { id: "yemek", label: "Yemek", color: "#EF9F27" },
  { id: "sigara", label: "Sigara", color: "#888780" },
  { id: "kira", label: "Kira", color: "#6366F1" },
  { id: "abonelik", label: "Abonelik", color: "#0EA5E9" },
  { id: "egitim", label: "Eğitim", color: "#8B5CF6" },
  { id: "duzenli", label: "Düzenli Ödemeler", color: "#1A6BFA" },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "maas", label: "Maaş", color: "#1D9E75" },
  { id: "freelance", label: "Freelance", color: "#0EA5E9" },
  { id: "kira_geliri", label: "Kira Geliri", color: "#6366F1" },
  { id: "yatirim", label: "Yatırım Getirisi", color: "#00BFA6" },
  { id: "ek_is", label: "Ek İş", color: "#378ADD" },
  { id: "hediye", label: "Hediye / Bağış", color: "#D4537E" },
  { id: "iade", label: "İade / Geri Ödeme", color: "#EF9F27" },
];

const TRANSFER: Record<string, Category> = {
  transfer_out: { id: "transfer_out", label: "Transfer (Giden)", color: "#378ADD" },
  transfer_in: { id: "transfer_in", label: "Transfer (Gelen)", color: "#378ADD" },
  transfer_fee: { id: "transfer_fee", label: "Transfer Ücreti", color: "#BA7517" },
};

const OTHER: Category = { id: "", label: "Diğer", color: "#888780" };

// Kategori id'sinden etiket+renk bulur. Bulamazsa "Diğer".
// Eski kayıtlar bazen label ile kaydedilmiş olabilir → label ile de eşleştirir.
export function findCategory(categoryId: string | null | undefined): Category {
  if (!categoryId) return OTHER;
  if (TRANSFER[categoryId]) return TRANSFER[categoryId];
  const all = [...CATEGORIES, ...INCOME_CATEGORIES];
  const byId = all.find((c) => c.id === categoryId);
  if (byId) return byId;
  const byLabel = all.find((c) => c.label === categoryId);
  if (byLabel) return byLabel;
  return { id: categoryId, label: categoryId, color: "#888780" };
}
