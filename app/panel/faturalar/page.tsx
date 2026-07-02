import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import FaturalarClient, { type Invoice } from "./FaturalarClient";

export default async function FaturalarPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const supabase = await createClient();

  const { type } = await searchParams;
  const initialFilter: "all" | "income" | "expense" =
    type === "income" ? "income" : type === "expense" ? "expense" : "all";

  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, customer_name, subtotal, vat_rate, vat_amount, amount, currency, payment_status, status, paid_amount, type, invoice_date, due_date, created_at"
    )
    .eq("user_id", profile.id)
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <FaturalarClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      invoicePrefix={profile.invoice_prefix ?? "MGZR"}
      invoiceNextNumber={profile.invoice_next_number ?? 1}
      invoices={(invoices as Invoice[]) ?? []}
      initialFilter={initialFilter}
    />
  );
}
