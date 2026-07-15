import "server-only";
import { createClient } from "./supabase/server";

export type StaffRole = "admin" | "agent";

/* İç ekip rolü — user_roles'tan. admin > agent önceliği.
   admin: tam yetki (müşteri yönetimi + destek). agent: yalnız destek.
   Staff değilse null → admin paneline giremez. */
export async function getStaffRole(): Promise<StaffRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (data ?? []).map((r) => (r as { role: string }).role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("agent")) return "agent";
  return null;
}
