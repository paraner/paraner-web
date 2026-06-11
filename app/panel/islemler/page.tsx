import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import IslemlerClient, { type Tx, type Account } from "./IslemlerClient";

export default async function IslemlerPage() {
  const supabase = await createClient();

  // Aktif profil cache'li — layout zaten çekti, burada tekrar ağ turu olmaz
  const profile = await getActiveProfile();

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
      .select(
        "id, title, amount, type, category, date, currency, bank_account_id, transfer_group_id, created_at, note, source, receipt_url, receipt_urls, receipt_thumbnails"
      )
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
