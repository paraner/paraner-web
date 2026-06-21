import { cache } from "react";
import { createClient } from "./server";
import type { ActiveProfile } from "./profileShared";

// Tip + saf yardımcı ortak dosyada; buradan da dışa aktararak mevcut importları korur.
export { profileAvatarUrl } from "./profileShared";
export type { ActiveProfile } from "./profileShared";

// Kullanıcının tüm profilleri — React cache() ile sarılı (istek başına tek sorgu).
// Hem sayfalar (aktif profil) hem sidebar profil değiştirici bunu paylaşır.
export const getProfiles = cache(async (): Promise<ActiveProfile[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, currency, profile_name, profile_type, invoice_prefix, invoice_next_number, is_active, avatar_url, company_logo_url, onboarding_completed, account_type, name"
    )
    .order("created_at", { ascending: true });
  return (data as ActiveProfile[]) ?? [];
});

// Aktif profil — getProfiles'tan türetilir, ekstra ağ turu yok.
export const getActiveProfile = cache(async (): Promise<ActiveProfile | null> => {
  const all = await getProfiles();
  return all.find((p) => p.is_active) ?? all[0] ?? null;
});
