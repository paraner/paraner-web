/* Özel (kullanıcı) kategorilerinin ORTAK parçası — sunucu ve istemci AYNI dönüşümü kullansın.
 *
 * ⚠️ Neden ayrı dosya: `lib/customCategories.ts` "use client" ile başlıyor → sunucu
 * bileşeninden import edilemez. Satır→kategori dönüşümünü iki yere kopyalamak yerine
 * (kopya = biri düzeltilip diğeri unutulur) tarafsız bu dosyada tutuluyor.
 */

import type { Category } from "./categories";

export type CustomCategory = Category & { type: "income" | "expense" };

/** Tablodan çekilecek kolonlar — `select("*")` yok (panel kuralı). */
export const CUSTOM_CAT_COLS = "slug, label, icon, color, kind";

export type CustomCatRow = {
  slug: string;
  label: string;
  icon: string | null;
  color: string | null;
  kind: string;
};

/** ⚠️ `id` = tablodaki `slug` = `transactions.category` alanına yazılan değer. */
export function rowToCustomCategory(r: CustomCatRow): CustomCategory {
  return {
    id: r.slug,
    label: r.label,
    color: r.color ?? "#888780",
    icon: r.icon ?? "tag",
    type: r.kind === "income" ? "income" : "expense",
  };
}
