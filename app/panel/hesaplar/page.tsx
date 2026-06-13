import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import HesaplarClient, { type Account } from "./HesaplarClient";

export default async function HesaplarPage() {
  const supabase = await createClient();

  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select(
      "id, name, type, bank_name, iban, routing_no, account_no, card_theme, balance, currency, is_default"
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true });

  return (
    <HesaplarClient
      profileId={profile.id}
      profileType={profile.profile_type ?? "individual"}
      defaultCurrency={profile.currency ?? "TRY"}
      accounts={(accounts as Account[]) ?? []}
    />
  );
}
