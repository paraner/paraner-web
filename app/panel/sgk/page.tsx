import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import SgkClient from "./SgkClient";

// Mobil `sgk-declarations.tsx` karşılığı: çalışan sayısı + toplam maaştan prim tahmini,
// üstüne sabit beyanname/bildirge takvimi.
export default async function SgkPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data } = await supabase
    .from("employees")
    .select("id, salary")
    .eq("user_id", profile.id)
    .limit(500);

  const calisanlar = (data as { id: string; salary: number | string | null }[]) ?? [];
  const toplamMaas = calisanlar.reduce((s, e) => s + (Number(e.salary) || 0), 0);

  return (
    <SgkClient
      currency={profile.currency ?? "TRY"}
      calisanSayisi={calisanlar.length}
      toplamMaas={toplamMaas}
    />
  );
}
