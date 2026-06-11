import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import DuzenliClient, { type Recurring } from "./DuzenliClient";

export default async function DuzenliOdemelerPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data } = await supabase
    .from("recurring_payments")
    .select(
      "id, title, amount, type, category, currency, period, next_due_date, last_confirmed_date, is_active, note"
    )
    .eq("user_id", profile.id)
    .order("next_due_date", { ascending: true })
    .limit(200);

  return (
    <DuzenliClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      items={(data as Recurring[]) ?? []}
    />
  );
}
