import { createClient } from "../../../lib/supabase/server";
import AyarlarClient, { type Profile } from "./AyarlarClient";

export default async function AyarlarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, profile_name, profile_type, currency, is_active, invoice_prefix, invoice_next_number"
    )
    .order("created_at", { ascending: true });

  return (
    <AyarlarClient
      email={user?.email ?? "—"}
      profiles={(profiles as Profile[]) ?? []}
    />
  );
}
