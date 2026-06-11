import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import IzinlerClient, { type Leave, type EmployeeRef } from "./IzinlerClient";

export default async function IzinlerPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name")
    .eq("user_id", profile.id)
    .order("name", { ascending: true });

  const { data: leaves } = await supabase
    .from("employee_leaves")
    .select("id, employee_id, leave_type, start_date, end_date, days, reason, status")
    .eq("profile_id", profile.id)
    .order("start_date", { ascending: false })
    .limit(200);

  return (
    <IzinlerClient
      profileId={profile.id}
      employees={(employees as EmployeeRef[]) ?? []}
      leaves={(leaves as Leave[]) ?? []}
    />
  );
}
