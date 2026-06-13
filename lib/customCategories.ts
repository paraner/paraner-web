// Özel (kullanıcı) kategorileri — mobil ile AYNI mantık: cihaz/tarayıcı yerel
// saklama (localStorage), DB'de değil. Bu yüzden profil + tarayıcı bazında yaşar.
// transactions.category alanına id yazılır; etiket/renk burada çözülür.
"use client";

import type { Category } from "./categories";

export type CustomCategory = Category & { type: "income" | "expense" };

const KEY = (profileId: string) => `paraner:customCats:${profileId}`;

export function loadCustomCategories(profileId: string): CustomCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY(profileId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((c) => c && c.id && c.label) : [];
  } catch {
    return [];
  }
}

export function saveCustomCategories(profileId: string, cats: CustomCategory[]) {
  try {
    localStorage.setItem(KEY(profileId), JSON.stringify(cats));
  } catch {
    // kota dolu / gizli mod — sessiz geç
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
