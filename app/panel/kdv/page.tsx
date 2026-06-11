import { getActiveProfile } from "../../../lib/supabase/profile";
import KdvClient from "./KdvClient";

export default async function KdvPage() {
  const profile = await getActiveProfile();
  return <KdvClient currency={profile?.currency ?? "TRY"} />;
}
