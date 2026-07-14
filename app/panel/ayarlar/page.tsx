import { createClient } from "../../../lib/supabase/server";
import { getProfiles } from "../../../lib/supabase/profile";
import AyarlarClient, { type Profile, type DeviceRow } from "./AyarlarClient";

export default async function AyarlarPage() {
  const supabase = await createClient();

  // Eskiden 3 ağ turu ART ARDA gidiyordu: auth.getUser() → profiles → user_devices.
  //  - getUser() (uzak tur) yerine getClaims(): e-posta JWT'nin içinde, yerelde okunur.
  //  - profiles: layout zaten getProfiles() ile çekiyor ve React cache()'li → aynı istekte
  //    ikinci kez sorgulamak yerine paylaşılan sonucu kullanıyoruz (bir sorgu eksildi).
  //  - devices: artık claims/profiles ile PARALEL.
  const [claimsRes, profiles, { data: devices }] = await Promise.all([
    supabase.auth.getClaims(),
    getProfiles(),
    supabase
      .from("user_devices")
      .select("id, device_id, device_name, platform, last_city, first_seen, last_seen")
      .order("last_seen", { ascending: false }),
  ]);

  const email = (claimsRes.data?.claims?.email as string | undefined) ?? "—";

  return (
    <AyarlarClient
      email={email}
      profiles={profiles as unknown as Profile[]}
      devices={(devices as DeviceRow[]) ?? []}
    />
  );
}
