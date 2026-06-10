import { createClient } from "../../../lib/supabase/server";
import HesaplarClient, { type Account } from "./HesaplarClient";

export default async function HesaplarPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, name, type, bank_name, iban, balance, currency, is_default")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true });

  return (
    <HesaplarClient
      profileId={profile.id}
      accounts={(accounts as Account[]) ?? []}
    />
  );
}
