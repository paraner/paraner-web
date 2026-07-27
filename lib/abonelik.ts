import { profileLifecycle } from "./lifecycle";
import { TRIAL_DAYS } from "./plans";

/* Abonelik durumu — TEK KAYNAK. İki yer okuyor:
     · üst bardaki plan/deneme rozeti (app/panel/PlanRozeti.tsx, layout'tan beslenir)
     · Ayarlar > Abonelik sekmesi
   ⚠️ SUNUCUDA hesaplanır: istemcide `Date.now()` cihazın saatidir; saatini geri alan
   kullanıcıya "denemen daha bitmedi" gösterirdi. Hesap mantığı admin panelinin kullandığı
   `profileLifecycle` ile AYNI fonksiyondan gelir (iki ayrı deneme matematiği olmasın).
   ⚠️ Nihai kararı DB'deki `get_trial_status` RPC'si verir; ikisi de aynı TRIAL_DAYS'i
   kullandığı sürece sonuç aynıdır. */

const GUN = 86400000;

export type AbonelikDurum = {
  /** trial: deneme sürüyor · zombie: deneme bitmiş ama premium açık kalmış ·
      paid: gerçek/manuel abonelik · free: ücretsiz */
  tur: "trial" | "zombie" | "paid" | "free";
  /** trial: kalan gün · zombie: bitişin üstünden geçen gün */
  kalanGun: number;
  tier: string | null;
  /** Denemenin bittiği/biteceği gün (ISO) — sabit tarih, istemcide biçimlendirmesi güvenli. */
  bitisIso: string | null;
  denemeKullanildi: boolean;
};

type ProfilAlanlari = {
  id: string;
  profile_name?: string | null;
  name?: string | null;
  profile_type?: string | null;
  currency?: string | null;
  is_premium?: boolean | null;
  subscription_tier?: string | null;
  trial_start_date?: string | null;
  trial_plan?: string | null;
};

export function aboneDurumu(p: ProfilAlanlari): AbonelikDurum {
  const dongu = profileLifecycle({
    id: p.id,
    profile_name: p.profile_name ?? null,
    name: p.name ?? null,
    profile_type: p.profile_type ?? null,
    is_premium: p.is_premium ?? null,
    subscription_tier: p.subscription_tier ?? null,
    currency: p.currency ?? null,
    created_at: null,
    trial_plan: p.trial_plan ?? null,
    trial_start_date: p.trial_start_date ?? null,
  });
  return {
    tur: dongu.kind === "no_profile" ? "free" : dongu.kind,
    kalanGun: dongu.days,
    tier: p.subscription_tier ?? null,
    bitisIso: p.trial_start_date
      ? new Date(new Date(p.trial_start_date).getTime() + TRIAL_DAYS * GUN).toISOString()
      : null,
    // "Hiç deneme kullanmamış mı" — mobil lib/trial.ts:43 ile AYNI guard (ikisi de dolu olmalı).
    denemeKullanildi: Boolean(p.trial_plan && p.trial_start_date),
  };
}
