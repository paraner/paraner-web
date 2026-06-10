import { createClient } from "../../../lib/supabase/server";
import IslemlerClient, { type Tx, type Account } from "./IslemlerClient";

export default async function IslemlerPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, currency")
    .eq("is_active", true)
    .maybeSingle();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const currency = profile.currency ?? "TRY";

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase
      .from("bank_accounts")
      .select("id, name, currency, balance")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("id, title, amount, type, category, date, currency, bank_account_id")
      .eq("user_id", profile.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <IslemlerClient
      profileId={profile.id}
      currency={currency}
      accounts={(accounts as Account[]) ?? []}
      initialTransactions={(transactions as Tx[]) ?? []}
    />
  );
}
