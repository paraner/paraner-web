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
  // Kimlik/şirket alanları YALNIZCA bu sayfada lazım → paylaşılan getProfiles() select'ine
  // eklenmedi (o sorgu her panel sayfasında çalışıyor; 11 kolon daha = tüm panele bedava yük).
  // Ayrı ama PARALEL sorgu; RLS zaten kullanıcının kendi profilleriyle sınırlıyor.
  const [{ data: userData }, profiles, { data: devices }, { data: details }] = await Promise.all([
    supabase.auth.getUser(),
    getProfiles(),
    supabase
      .from("user_devices")
      .select("id, device_id, device_name, platform, last_city, first_seen, last_seen")
      .order("last_seen", { ascending: false }),
    supabase
      .from("profiles")
      .select(
        "id, name, phone, company_name, tax_number, tax_office, company_address, company_email, iban, website, mersis_no, trade_registry_no"
      ),
  ]);

  // Profil satırları + kimlik/şirket alanları tek nesnede birleşsin (client tek tip görsün).
  const detailById = new Map((details ?? []).map((d) => [(d as { id: string }).id, d]));
  const merged = (profiles as unknown as Profile[]).map((p) => ({
    ...p,
    ...(detailById.get(p.id) ?? {}),
  })) as Profile[];

  const email = userData?.user?.email ?? "—";
  // Şifresi var mı? Mobil ile ORTAK bayrak (auth user_metadata.has_password) — Google/Apple ve
  // e-posta+OTP kullanıcılarının şifresi yoktur → "Şifre Belirle" gösterilir. Provider'a bakmak
  // yanlış olurdu (OTP kullanıcısının provider'ı "email" ama şifresi yok).
  const hasPassword = Boolean(userData?.user?.user_metadata?.has_password);

  return (
    <AyarlarClient
      email={email}
      profiles={merged}
      devices={(devices as DeviceRow[]) ?? []}
      hasPassword={hasPassword}
    />
  );
}
