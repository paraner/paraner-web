import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import TekliflerClient, { type Quote } from "./TekliflerClient";

export default async function TekliflerPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const [{ data: quotes }, { count }] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_number, customer_name, grand_total, currency, status, valid_until, created_at"
      )
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
  ]);

  return (
    <TekliflerClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      quotes={(quotes as Quote[]) ?? []}
      nextNumber={(count ?? 0) + 1}
    />
  );
}
