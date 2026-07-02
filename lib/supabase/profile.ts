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
      "id, currency, profile_name, profile_type, invoice_prefix, invoice_next_number, is_active, is_primary, avatar_url, company_logo_url, onboarding_completed, account_type, name"
    )
    .order("created_at", { ascending: true });
  return (data as ActiveProfile[]) ?? [];
});

// Aktif profil — getProfiles'tan türetilir, ekstra ağ turu yok.
// Öncelik: is_active (kullanıcının seçtiği) → is_primary (mobil default'uyla hizalı) → ilk.
// is_primary fallback'i, is_active hiç set değilken web'in mobil ile aynı profili
// seçmesini sağlar (mobil ana kaynağı cihaz-yerel AsyncStorage → tam parite şema ister).
export const getActiveProfile = cache(async (): Promise<ActiveProfile | null> => {
  const all = await getProfiles();
  return (
    all.find((p) => p.is_active) ??
    all.find((p) => p.is_primary) ??
    all[0] ??
    null
  );
});
