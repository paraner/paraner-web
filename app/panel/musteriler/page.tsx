import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import MusterilerClient, { type Contact } from "./MusterilerClient";

export default async function MusterilerPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data } = await supabase
    .from("contacts")
    .select(
      "id, type, name, company_name, phone, email, address, tax_number, tax_office, note"
    )
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(300);

  return <MusterilerClient profileId={profile.id} contacts={(data as Contact[]) ?? []} />;
}
