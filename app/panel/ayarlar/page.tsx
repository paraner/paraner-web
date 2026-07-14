import { createClient } from "../../../lib/supabase/server";
import { getProfiles } from "../../../lib/supabase/profile";
import AyarlarClient, { type Profile, type DeviceRow } from "./AyarlarClient";

export default async function AyarlarPage() {
  const supabase = await createClient();

  // Eskiden 3 ağ turu ART ARDA gidiyordu: auth.getUser() → profiles → user_devices.
  // Artık üçü de PARALEL + profiles sorgusu tamamen eksildi:
  //  - profiles: layout zaten getProfiles() ile çekiyor ve React cache()'li → aynı istekte
  //    ikinci kez sorgulamak yerine paylaşılan sonucu kullanıyoruz.
  //  - getUser() burada BİLEREK korundu (getClaims'e çevrilmedi): e-posta JWT'nin içinde
  //    yazıldığı andaki değerdir; kullanıcı e-postasını değiştirince token tazelenene kadar
  //    (~1 saat) ESKİ adres görünürdü. Ayarlar nadiren açılan bir sayfa, doğruluk hızdan önce.
  const [{ data: userData }, profiles, { data: devices }] = await Promise.all([
    supabase.auth.getUser(),
    getProfiles(),
    supabase
      .from("user_devices")
      .select("id, device_id, device_name, platform, last_city, first_seen, last_seen")
      .order("last_seen", { ascending: false }),
  ]);

  const email = userData?.user?.email ?? "—";

  return (
    <AyarlarClient
      email={email}
      profiles={profiles as unknown as Profile[]}
      devices={(devices as DeviceRow[]) ?? []}
    />
  );
}
