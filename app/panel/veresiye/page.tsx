import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import VeresiyeClient, { type CreditCustomer } from "./VeresiyeClient";

export default async function VeresiyePage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data } = await supabase
    .from("credit_book")
    .select("id, customer_name, phone, total_debt")
    .eq("user_id", profile.id)
    .order("total_debt", { ascending: false })
    .limit(300);

  return (
    <VeresiyeClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      customers={(data as CreditCustomer[]) ?? []}
    />
  );
}
