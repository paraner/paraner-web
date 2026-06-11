import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import { fetchMarket } from "../../../lib/market";
import CuzdanimClient, { type Asset } from "./CuzdanimClient";

// Cüzdanım (birikim varlıkları) — canlı Truncgil fiyatıyla değer + kâr/zarar + ekleme/satış.
export default async function CuzdanimPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const [{ data: assets }, market] = await Promise.all([
    supabase
      .from("savings_assets")
      .select("id, asset_type, amount, avg_cost, purchase_date, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true }),
    fetchMarket(),
  ]);

  const list: Asset[] = (assets ?? []).map((a) => ({
    id: a.id,
    asset_type: a.asset_type,
    amount: Number(a.amount) || 0,
    avg_cost: a.avg_cost != null ? Number(a.avg_cost) : null,
    purchase_date: a.purchase_date ?? null,
  }));

  return (
    <CuzdanimClient
      profileId={profile.id}
      currency={profile.currency || "TRY"}
      assets={list}
      market={market}
    />
  );
}
