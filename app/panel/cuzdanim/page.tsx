import { createClient } from "../../../lib/supabase/server";

// Cüzdanım (birikim varlıkları) — v1 SALT-OKUNUR.
// Varlık ekleme/satış canlı piyasa fiyatı (Truncgil) gerektirir; bu yüzden şimdilik
// mobil uygulamada yapılır. Burada mevcut varlıklar listelenir.
export default async function CuzdanimPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: assets } = await supabase
    .from("savings_assets")
    .select("id, asset_type, amount, avg_cost")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true });

  const list = assets ?? [];

  return (
    <>
      <h1 className="panel-h1">Cüzdanım</h1>
      <p className="panel-sub">Birikim ve yatırım varlıkların</p>

      <div
        className="auth-soon"
        style={{ marginTop: 0, marginBottom: 22, textAlign: "left", maxWidth: 640 }}
      >
        ℹ️ Varlık ekleme/satış canlı piyasa fiyatı gerektirdiği için şimdilik mobil
        uygulamadan yapılıyor. Burada varlıkların görüntülenir.
      </div>

      {list.length === 0 ? (
        <div className="panel-empty">Henüz varlık yok.</div>
      ) : (
        <div className="tx-list" style={{ maxWidth: 640 }}>
          {list.map((a) => (
            <div key={a.id} className="info-row">
              <span className="v">{a.asset_type}</span>
              <span className="k">
                {Number(a.amount) || 0}
                {a.avg_cost ? ` · ort. ${Number(a.avg_cost).toLocaleString("tr-TR")} ₺` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
