import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import BorcAlacakClient, { type Debt } from "./BorcAlacakClient";

export default async function BorcAlacakPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data } = await supabase
    .from("debts")
    .select("id, person_name, amount, type, note, is_paid")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <BorcAlacakClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      items={(data as Debt[]) ?? []}
    />
  );
}
