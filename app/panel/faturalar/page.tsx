import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import FaturalarClient, { type Invoice } from "./FaturalarClient";

export default async function FaturalarPage() {
  const supabase = await createClient();

  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, customer_name, amount, currency, payment_status, type, invoice_date"
    )
    .eq("user_id", profile.id)
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <FaturalarClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      invoicePrefix={profile.invoice_prefix ?? "BPR"}
      invoiceNextNumber={profile.invoice_next_number ?? 1}
      invoices={(invoices as Invoice[]) ?? []}
    />
  );
}
