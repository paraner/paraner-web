import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import CalisanlarClient, { type Employee } from "./CalisanlarClient";

export default async function CalisanlarPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, phone, email, position")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <CalisanlarClient profileId={profile.id} employees={(employees as Employee[]) ?? []} />
  );
}
