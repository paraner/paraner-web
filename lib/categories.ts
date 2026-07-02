// Kategori kataloğu — mobil uygulamayla birebir aynı (constants/categories.ts).
// Not: mobildeki "özel kategoriler" cihazda (AsyncStorage) saklanır, DB'de değil —
// bu yüzden web yalnızca sabit kategorileri bilir.

export type Category = { id: string; label: string; color: string; icon?: string };

export const CATEGORIES: Category[] = [
  { id: "market", label: "Market", icon: "cart", color: "#1D9E75" },
  { id: "kafe", label: "Kafe", icon: "cafe", color: "#BA7517" },
  { id: "ulasim", label: "Ulaşım", icon: "car", color: "#378ADD" },
  { id: "fatura", label: "Faturalar", icon: "document-text", color: "#7F77DD" },
  { id: "eglence", label: "Eğlence", icon: "game-controller", color: "#D85A30" },
  { id: "saglik", label: "Sağlık", icon: "medical", color: "#E24B4A" },
  { id: "giyim", label: "Giyim", icon: "shirt", color: "#D4537E" },
  { id: "yemek", label: "Yemek", icon: "restaurant", color: "#EF9F27" },
  { id: "sigara", label: "Sigara", icon: "flame", color: "#888780" },
  { id: "kira", label: "Kira", icon: "home", color: "#6366F1" },
  { id: "abonelik", label: "Abonelik", icon: "card", color: "#0EA5E9" },
  { id: "egitim", label: "Eğitim", icon: "school", color: "#8B5CF6" },
  { id: "duzenli", label: "Düzenli Ödemeler", icon: "repeat", color: "#1A6BFA" },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "maas", label: "Maaş", icon: "wallet", color: "#1D9E75" },
  { id: "freelance", label: "Freelance", icon: "laptop", color: "#0EA5E9" },
  { id: "kira_geliri", label: "Kira Geliri", icon: "home", color: "#6366F1" },
  { id: "yatirim", label: "Yatırım Getirisi", icon: "trending-up", color: "#00BFA6" },
  { id: "ek_is", label: "Ek İş", icon: "briefcase", color: "#378ADD" },
  { id: "hediye", label: "Hediye / Bağış", icon: "gift", color: "#D4537E" },
  { id: "iade", label: "İade / Geri Ödeme", icon: "return-down-back", color: "#EF9F27" },
];

// Sistem kategorileri (transfer/bakiye düzeltme/tahsilat) — mobil constants/categories.ts
// ile birebir. Bunlar eksik olunca mobil kaynaklı işlemler web'de ham id ("collection_in")
// olarak görünüyordu.
const TRANSFER: Record<string, Category> = {
  transfer_out: { id: "transfer_out", label: "Transfer (Giden)", icon: "swap-horizontal", color: "#378ADD" },
  transfer_in: { id: "transfer_in", label: "Transfer (Gelen)", icon: "swap-horizontal", color: "#378ADD" },
  transfer_fee: { id: "transfer_fee", label: "Transfer Ücreti", icon: "card", color: "#BA7517" },
  adjust_in: { id: "adjust_in", label: "Bakiye Düzeltmesi (Yatırma)", icon: "add-circle", color: "#378ADD" },
  adjust_out: { id: "adjust_out", label: "Bakiye Düzeltmesi (Çekme)", icon: "remove-circle", color: "#378ADD" },
  collection_in: { id: "collection_in", label: "Tahsilat", icon: "swap-horizontal", color: "#00BFA6" },
  collection_out: { id: "collection_out", label: "Fatura Ödemesi", icon: "swap-horizontal", color: "#00BFA6" },
};

const OTHER: Category = { id: "", label: "Diğer", icon: "tag", color: "#888780" };

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
