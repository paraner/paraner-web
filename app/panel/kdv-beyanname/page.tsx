import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import KdvBeyannameClient, { type BeyanFatura } from "./KdvBeyannameClient";

// Mobil `vat-declaration.tsx` karşılığı. Mobil ay ay sorgu atıyor; web'de ay gezinmesi
// istemcide olduğu için TEK sorguda geçen yıl başından itibaren çekip client'ta filtreliyoruz
// (ay değiştirmek ağ turu istemesin).
export default async function KdvBeyannamePage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const startStr = `${new Date().getFullYear() - 1}-01-01`;

  const { data } = await supabase
    .from("invoices")
    .select("type, vat_amount, vat_rate, invoice_date, currency")
    .eq("user_id", profile.id)
    .gte("invoice_date", startStr)
    .limit(5000);

  return (
    <KdvBeyannameClient
      currency={profile.currency ?? "TRY"}
      invoices={(data as BeyanFatura[]) ?? []}
    />
  );
}
