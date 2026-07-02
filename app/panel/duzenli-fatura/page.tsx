import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import DuzenliFaturaClient, { type RecurringInvoice } from "./DuzenliFaturaClient";

export default async function DuzenliFaturaPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data } = await supabase
    .from("recurring_invoices")
    .select(
      "id, customer_name, description, amount, vat_rate, period, is_active, next_date, last_generated"
    )
    .eq("profile_id", profile.id)
    .order("next_date", { ascending: true })
    .limit(200);

  return (
    <DuzenliFaturaClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      invoicePrefix={profile.invoice_prefix ?? "MGZR"}
      items={(data as RecurringInvoice[]) ?? []}
    />
  );
}
