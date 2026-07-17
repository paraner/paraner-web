/* Abonelik planları (tier) — MOBİL İLE ORTAK SÖZLÜK.
   Kaynak: paraner-app/stores/authStore.ts `SubscriptionTier` + app/(tabs)/profile/index.tsx
   PLAN_LABELS. DB'de CHECK constraint YOK → veritabanı her string'i kabul eder; bu yüzden
   uydurma bir değer (ör. "premium") sessizce yazılır ve mobil onu tanımaz/etiketleyemez.
   Buraya yazılmayan bir tier'ı ASLA DB'ye yazma.

   ⚠️ Bilinen tutarsızlık (Mehmet'e raporlandı, karar bekliyor): web onboarding
   `${accountType}_${plan}_monthly` üretiyor → bireysel + "max" seçilirse
   `individual_max_monthly` çıkıyor ve bu mobilde GEÇERLİ DEĞİL. */

export const SUBSCRIPTION_TIERS = [
  "individual_free",
  "individual_pro_monthly",
  "individual_pro_yearly",
  "business_pro_monthly",
  "business_max_monthly",
  "business_max_yearly",
] as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  individual_free: "Ücretsiz",
  individual_pro_monthly: "Bireysel Pro (Aylık)",
  individual_pro_yearly: "Bireysel Pro (Yıllık)",
  business_pro_monthly: "İşletme Pro (Aylık)",
  business_max_monthly: "İşletme Max (Aylık)",
  business_max_yearly: "İşletme Max (Yıllık)",
};

/** Sistemdeki TEK ücretsiz tier — işletme profili de düşerken buna düşer
    (mobil `expireTrial` de aynısını yapıyor: lib/trial.ts). */
export const FREE_TIER: SubscriptionTier = "individual_free";

/** Admin "Premium yap" derse profil türüne göre makul geçerli plan. */
export function defaultPaidTier(profileType: string | null): SubscriptionTier {
  return profileType === "business" ? "business_pro_monthly" : "individual_pro_monthly";
}

export const isValidTier = (t: string | null): t is SubscriptionTier =>
  t != null && (SUBSCRIPTION_TIERS as readonly string[]).includes(t);

/** Bilinmeyen/kirli değerleri de gösterebilmek için (panelde ham string'i kaybetme). */
export const tierLabel = (t: string | null): string =>
  t == null ? "—" : isValidTier(t) ? TIER_LABELS[t] : `${t} (geçersiz)`;

/* --- Deneme süresi --- */

/** Ücretsiz deneme 14 gün. ⚠️ Bu SADECE panelde GÖSTERİM/hesaplama içindir.
    Kararı veren yer veritabanındaki `get_trial_status` RPC'si (mobil onu okuyor);
    süre değişirse RPC + mobil lib/trial.ts + ai-chat edge function BİRLİKTE güncellenmeli. */
export const TRIAL_DAYS = 14;
