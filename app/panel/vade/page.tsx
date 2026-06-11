import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import VadeClient, { type AgingInvoice } from "./VadeClient";

export default async function VadePage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data } = await supabase
    .from("invoices")
    .select("id, customer_name, amount, currency, type, invoice_date, payment_status")
    .eq("user_id", profile.id)
    .neq("payment_status", "paid")
    .order("invoice_date", { ascending: true })
    .limit(300);

  return (
    <VadeClient
      currency={profile.currency ?? "TRY"}
      invoices={(data as AgingInvoice[]) ?? []}
    />
  );
}
