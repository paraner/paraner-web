import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import KarZararClient, { type Tx } from "./KarZararClient";

export default async function KarZararPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;

  const { data: tx } = await supabase
    .from("transactions")
    .select("amount, type, category, currency, date")
    .eq("user_id", profile.id)
    .neq("type", "transfer")
    .gte("date", startStr)
    .limit(8000);

  return <KarZararClient currency={profile.currency ?? "TRY"} transactions={(tx as Tx[]) ?? []} />;
}
