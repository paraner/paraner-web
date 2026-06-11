import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import CekSenetClient, { type CheckNote } from "./CekSenetClient";

export default async function CekSenetPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data } = await supabase
    .from("checks_notes")
    .select(
      "id, type, direction, person_name, amount, currency, issue_date, due_date, bank_name, check_number, status, note"
    )
    .eq("user_id", profile.id)
    .order("due_date", { ascending: true })
    .limit(200);

  return (
    <CekSenetClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      items={(data as CheckNote[]) ?? []}
    />
  );
}
