import { createAdminClient, hasAdminKey } from "../../../lib/supabase/admin";
import AdminKeyNotice from "../AdminKeyNotice";
import MusterilerClient, { type AdminProfile } from "./MusterilerClient";

export default async function AdminMusterilerPage() {
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  const { data } = await admin
    .from("profiles")
    .select(
      "id, profile_name, name, profile_type, is_premium, subscription_tier, trial_plan, currency, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  return <MusterilerClient rows={(data as AdminProfile[]) ?? []} />;
}
