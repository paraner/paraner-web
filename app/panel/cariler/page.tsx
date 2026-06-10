import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import CarilerClient, { type Cari } from "./CarilerClient";

export default async function CarilerPage() {
  const supabase = await createClient();

  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: cariler } = await supabase
    .from("current_accounts")
    .select("id, name, type, balance")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true });

  return (
    <CarilerClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      cariler={(cariler as Cari[]) ?? []}
    />
  );
}
