import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import StokClient, { type StokProduct, type Movement } from "./StokClient";

export default async function StokPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  // İki sorgu bağımsız (ikisi de user_id ile filtreli) → paralel; eskiden sıralıydı.
  const [{ data: products }, { data: movements }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, unit, buy_price, sell_price, stock_quantity, min_stock_alert, code, category"
      )
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .eq("type", "product")
      .order("name", { ascending: true })
      .limit(300),
    supabase
      .from("stock_movements")
      .select("id, product_id, type, quantity, unit_price, note, date, products(name, unit)")
      .eq("user_id", profile.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  return (
    <StokClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      products={(products as StokProduct[]) ?? []}
      movements={(movements as unknown as Movement[]) ?? []}
    />
  );
}
