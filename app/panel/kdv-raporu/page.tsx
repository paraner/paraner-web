import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import KdvRaporClient, { type InvoiceVat } from "./KdvRaporClient";

export default async function KdvRaporuPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;

  const { data } = await supabase
    .from("invoices")
    .select("type, subtotal, vat_amount, amount, currency, invoice_date")
    .eq("user_id", profile.id)
    .gte("invoice_date", startStr)
    .limit(5000);

  return (
    <KdvRaporClient
      currency={profile.currency ?? "TRY"}
      invoices={(data as InvoiceVat[]) ?? []}
    />
  );
}
