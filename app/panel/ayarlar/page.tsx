import { createClient } from "../../../lib/supabase/server";
import { getProfiles } from "../../../lib/supabase/profile";
import { profileLifecycle } from "../../../lib/lifecycle";
import { TRIAL_DAYS } from "../../../lib/plans";
import AyarlarClient, { type Profile, type DeviceRow } from "./AyarlarClient";
import type { AbonelikDurum } from "./AbonelikBolumu";

const GUN = 86400000;

/* Abonelik durumu SUNUCUDA hesaplanır — istemcide `Date.now()` cihazın saatidir; saati
   geri alan kullanıcıya "denemen daha bitmedi" gösterirdi. Hesap mantığı admin panelinin
   kullandığı `profileLifecycle` ile AYNI fonksiyondan gelir (iki ayrı deneme matematiği
   olmasın diye). ⚠️ Nihai kararı DB'deki `get_trial_status` RPC'si verir; ikisi de aynı
   TRIAL_DAYS'i kullandığı sürece sonuç aynıdır. */
function aboneDurumu(p: Profile): AbonelikDurum {
  const dongu = profileLifecycle({
    id: p.id,
    profile_name: p.profile_name,
    name: p.name,
    profile_type: p.profile_type,
    is_premium: p.is_premium ?? null,
    subscription_tier: p.subscription_tier ?? null,
    currency: p.currency,
    created_at: null,
    trial_plan: p.trial_plan ?? null,
    trial_start_date: p.trial_start_date ?? null,
  });
  return {
    tur: dongu.kind === "no_profile" ? "free" : dongu.kind,
    kalanGun: dongu.days,
    tier: p.subscription_tier ?? null,
    // Deneme bitişi = başlangıç + 14 gün. Sabit bir tarih olduğu için istemcide
    // biçimlendirilmesi güvenli (saat manipülasyonundan etkilenmez).
    bitisIso: p.trial_start_date
      ? new Date(new Date(p.trial_start_date).getTime() + TRIAL_DAYS * GUN).toISOString()
      : null,
    // "Hiç deneme kullanmamış mı" — mobil lib/trial.ts:43 ile AYNI guard (ikisi de dolu olmalı).
    denemeKullanildi: Boolean(p.trial_plan && p.trial_start_date),
  };
}

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
        // Abonelik alanları (is_premium…trial_plan) BU sorguya eklendi — ayrı bir sorgu
        // açmak fazladan ağ turu olurdu; bunlar zaten yalnız Ayarlar'da lazım.
        "id, name, phone, company_name, tax_number, tax_office, company_address, company_email, iban, website, mersis_no, trade_registry_no, is_premium, subscription_tier, trial_start_date, trial_plan"
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

  // Abonelik sekmesi AKTİF profilin durumunu gösterir (profil değişince sayfa yeniden yüklenir).
  const aktif = merged.find((p) => p.is_active) ?? merged[0] ?? null;

  return (
    <AyarlarClient
      email={email}
      profiles={merged}
      devices={(devices as DeviceRow[]) ?? []}
      hasPassword={hasPassword}
      abonelik={aktif ? aboneDurumu(aktif) : null}
    />
  );
}
