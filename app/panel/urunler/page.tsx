import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import UrunlerClient, { type Product } from "./UrunlerClient";

export default async function UrunlerPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, type, code, unit, buy_price, sell_price, vat_rate, stock_quantity, min_stock_alert, category, is_active"
    )
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <UrunlerClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      products={(products as Product[]) ?? []}
    />
  );
}
