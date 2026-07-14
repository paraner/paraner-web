import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import IzinlerClient, { type Leave, type EmployeeRef } from "./IzinlerClient";

export default async function IzinlerPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  // İki sorgu birbirinden BAĞIMSIZ (izinler employee_id'ye değil profile_id'ye bağlı)
  // → paralel. Eskiden art arda await ediliyordu = boşuna bir ağ turu.
  const [{ data: employees }, { data: leaves }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, name")
      .eq("user_id", profile.id)
      .order("name", { ascending: true }),
    supabase
      .from("employee_leaves")
      .select("id, employee_id, leave_type, start_date, end_date, days, reason, status")
      .eq("profile_id", profile.id)
      .order("start_date", { ascending: false })
      .limit(200),
  ]);

  return (
    <IzinlerClient
      profileId={profile.id}
      employees={(employees as EmployeeRef[]) ?? []}
      leaves={(leaves as Leave[]) ?? []}
    />
  );
}
