// Profil görseli (işletme logosu / bireysel avatar) — public `avatars` bucket'ı.
// Yol deseni receipts ile aynı mantıkta: `${profileId}/...` → profil bazında izole.
import { createClient } from "./supabase/client";

export const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

/** Görseli avatars bucket'ına yükler → public URL döndürür. */
export async function uploadProfileImage(profileId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${profileId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(filePath, file, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (error) throw error;
  return supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
}

/** Eski görseli storage'dan siler (URL bizim bucket'a ait değilse sessizce geçer). */
export async function removeProfileImage(url: string | null) {
  if (!url || !url.includes("/avatars/")) return;
  const supabase = createClient();
  const path = decodeURIComponent(url.split("/avatars/")[1] ?? "");
  if (path) await supabase.storage.from("avatars").remove([path]);
}
