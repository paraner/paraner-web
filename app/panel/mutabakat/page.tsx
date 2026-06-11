import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import MutabakatClient, { type Reconciliation, type AccountRef } from "./MutabakatClient";

export default async function MutabakatPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const [{ data: recs }, { data: accounts }] = await Promise.all([
    supabase
      .from("reconciliations")
      .select(
        "id, account_id, account_name, period_start, period_end, our_balance, their_balance, status, note"
      )
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("current_accounts")
      .select("id, name")
      .eq("user_id", profile.id)
      .order("name", { ascending: true }),
  ]);

  return (
    <MutabakatClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      items={(recs as Reconciliation[]) ?? []}
      accounts={(accounts as AccountRef[]) ?? []}
    />
  );
}
