import "server-only";

/* Özel (kullanıcı) kategorileri — SUNUCU tarafı okuma.
 *
 * ⚠️ NEDEN GEREKLİ (Mehmet, 25.07 canlı): Genel Bakış'taki "Kategori Analizi" ve rapor
 * ekranları yalnız SABİT kataloğu biliyordu → telefonda/Parla'da oluşturulmuş bir
 * kategoriye kayıtlı harcama ekranda ham kimlik olarak görünüyordu ("custom_1784911989778").
 * İşlemler sayfası bunu istemcide çözüyordu; diğerleri hiç okumuyordu.
 *
 * `cache()` ile sarılı → aynı istekte kaç sayfa/bileşen sorarsa sorsun TEK sorgu.
 * Sunucuda okunuyor: istemcide sonradan çekilse ekran ilk anda ham kimliği gösterip
 * sonra düzelirdi (göz kırpması).
 */

import { cache } from "react";
import { createClient } from "./supabase/server";
import {
  CUSTOM_CAT_COLS,
  type CustomCatRow,
  type CustomCategory,
  rowToCustomCategory,
} from "./customCategoriesShared";

export type { CustomCategory };

export const getCustomCategories = cache(async (profileId: string): Promise<CustomCategory[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_categories")
    .select(CUSTOM_CAT_COLS)
    .eq("user_id", profileId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    // Kategori adı çözülemezse ekran ÇÖKMESİN: sabit katalog + "Diğer" ile devam eder.
    console.warn("[customCategoriesServer] okunamadi:", error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToCustomCategory(r as unknown as CustomCatRow));
});
