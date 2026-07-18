import "server-only";
import { notFound } from "next/navigation";
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

/* Yalnız-yönetici SAYFA guard'ı — müşteri verisi açan her sayfanın İLK satırı bu olmalı.
   ⚠️ Layout'taki guard YETMEZ: o sadece "staff mi" diye bakıyor, agent de geçiyor. Sidebar'da
   linki gizlemek de yetmez — agent URL'yi elle yazabilir. Müşteri sayfaları service_role ile
   veri çektiği için (RLS bypass) burada durdurulmazsa destek personeli TÜM müşterilerin
   e-postasını/planını/işlem sayısını görürdü. (Aksiyonlar ayrıca lib/adminActions.requireAdmin
   ile korunuyor; bu okuma tarafının karşılığı.)
   notFound(): "yetkin yok" demektense sayfanın varlığını bile sızdırma. */
export async function requireAdminPage(): Promise<void> {
  if ((await getStaffRole()) !== "admin") notFound();
}

/* Staff (admin VEYA agent) SAYFA guard'ı — hem rolü döndürür hem kapıyı tutar.
   ⚠️ Neden layout guard'ı yetmez (denetim 2026-07-18 / Y1): Next 16'da layout
   istemci-taraflı gezinmede YENİDEN ÇALIŞMAZ (Partial Rendering) — Next'in kendi
   auth rehberi bu deseni açıkça önermiyor. Rolü geri alınan kişi kabukta gezmeye
   devam eder (staleTimes.dynamic:30 bunu +30sn uzatır). service_role ile veri açan
   HER sayfa kendi guard'ını çağırmalı; layout guard'ı yalnız UX (erken yönlendirme). */
export async function requireStaffPage(): Promise<StaffRole> {
  const role = await getStaffRole();
  if (!role) notFound();
  return role;
}
