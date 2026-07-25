"use client";

/* Özel (kullanıcı) kategorileri — ORTAK TABLODA (`user_categories`).
 *
 * ⚠️ ESKİDEN CİHAZ-YERELDİ (localStorage) ve mobilde de öyleydi (AsyncStorage) → telefonda
 * oluşturduğun kategori web'de yoktu, web'deki telefonda. İşlem o kategoriyle kaydedilince
 * diğer tarafta ham kimlik ("custom_yakit") görünüyordu. Artık üçü de (web, mobil, Parla)
 * aynı tabloyu okuyor. Tablo: parla/sql/kategoriler-ortak-tablo.sql
 *
 * ⚠️ `id` = tabloda `slug` = `transactions.category` alanına yazılan değer. Eski kayıtlar
 * bozulmasın diye biçim DEĞİŞTİRİLMEDİ (web `custom_<etiket>`, mobil `custom_<zaman>`).
 */

import { createClient } from "./supabase/client";
import {
  CUSTOM_CAT_COLS,
  type CustomCatRow,
  type CustomCategory,
  rowToCustomCategory,
} from "./customCategoriesShared";

export type { CustomCategory };

/** Profilin özel kategorileri (ortak tablodan). */
export async function fetchCustomCategories(profileId: string): Promise<CustomCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_categories")
    .select(CUSTOM_CAT_COLS)
    .eq("user_id", profileId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.warn("[customCategories] okunamadi:", error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToCustomCategory(r as unknown as CustomCatRow));
}

/** Yeni kategori. ⚠️ `.select()` şart: RLS 0 satır etkilerse PostgREST hata DÖNDÜRMEZ. */
export async function createCustomCategory(profileId: string, cat: CustomCategory): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_categories")
    .insert({
      user_id: profileId,
      slug: cat.id,
      label: cat.label,
      icon: cat.icon ?? null,
      color: cat.color ?? null,
      kind: cat.type,
    })
    .select("slug");
  if (error) console.warn("[customCategories] eklenemedi:", error.message);
  return !error && !!data && data.length > 0;
}

export async function updateCustomCategory(
  profileId: string,
  id: string,
  patch: { label: string; color: string; icon: string },
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_categories")
    .update({ label: patch.label, color: patch.color, icon: patch.icon })
    .eq("user_id", profileId)
    .eq("slug", id)
    .select("slug");
  return !error && !!data && data.length > 0;
}

export async function deleteCustomCategory(profileId: string, id: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_categories")
    .delete()
    .eq("user_id", profileId)
    .eq("slug", id)
    .select("slug");
  return !error && !!data && data.length > 0;
}

/* ── Eski cihaz-yerel kategorileri BİR KEZ tabloya taşı ────────────────────────
   Kullanıcı bu tarayıcıda kategori oluşturmuşsa kaybolmasın. Taşındıktan sonra bayrak
   konur: silinen bir kategori tekrar geri gelmesin. Yerel veri SİLİNMEZ (geri dönüş ağı). */
const ESKI_KEY = (profileId: string) => `paraner:customCats:${profileId}`;
const TASINDI_KEY = (profileId: string) => `paraner:customCats:migrated:${profileId}`;

export async function migrateLocalCategories(profileId: string): Promise<number> {
  if (typeof window === "undefined") return 0;
  try {
    if (localStorage.getItem(TASINDI_KEY(profileId))) return 0;
    const raw = localStorage.getItem(ESKI_KEY(profileId));
    localStorage.setItem(TASINDI_KEY(profileId), "1"); // tekrar denenmesin (boşsa da)
    if (!raw) return 0;

    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return 0;

    let sayi = 0;
    for (const c of arr) {
      if (!c?.id || !c?.label) continue;
      const ok = await createCustomCategory(profileId, {
        id: c.id,
        label: c.label,
        color: c.color ?? "#888780",
        icon: c.icon ?? "tag",
        type: c.type === "income" ? "income" : "expense",
      });
      if (ok) sayi++;
    }
    return sayi;
  } catch {
    return 0;
  }
}

// "Yakıt Gideri" → "custom_yakit_gideri". TR harfleri sadeleştirilir.
function slugify(label: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
  };
  const base = label
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (m) => map[m] ?? m)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `custom_${base || Date.now()}`;
}

// Mevcutlarla çakışmayan benzersiz id üret.
export function uniqueCustomId(label: string, existing: CustomCategory[]): string {
  const taken = new Set(existing.map((c) => c.id));
  let id = slugify(label);
  let i = 2;
  while (taken.has(id)) id = `${slugify(label)}_${i++}`;
  return id;
}
