/* Abonelik planları (tier) — MOBİL İLE ORTAK SÖZLÜK.
   Kaynak: paraner-rn-referans/stores/authStore.ts `SubscriptionTier` + app/(tabs)/profile/index.tsx
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

/* --- Satın alınabilir plan kataloğu (Ayarlar > Abonelik) ---

   ⚠️ TEK DOĞRU KAYNAK: mobil `app/premium.tsx` (getIndividualPlans / getBusinessPlans).
   Buradaki liste ONUN kopyasıdır — fiyat/isim/özellik değişecekse ÖNCE mobil değişir,
   sonra ŞU DÖRT yer birlikte güncellenir, yoksa müşteri her ekranda başka fiyat görür:
     ① mobil app/premium.tsx (asıl)  ② burası (panel > Ayarlar > Abonelik)
     ③ app/page.tsx PLANS (pazarlama sayfası)
     ④ app/layout.tsx AggregateOffer (Google'a yayınlanan fiyat şeması)
   ⚠️ `id` alanı DB'ye `subscription_tier` + `trial_plan` olarak YAZILIR → SUBSCRIPTION_TIERS
   dışında bir değer olamaz (DB'de CHECK yok, uydurma değer sessizce kaydolur). */

export type PlanDef = {
  id: SubscriptionTier;
  name: string;
  /** Karttaki büyük tutar — yıllık planlarda AYA İNDİRGENMİŞ (mobil ile aynı gösterim). */
  price: string;
  period: string;
  /** Yıllık planlarda gerçek tahsilat: "Toplam ₺1.349/yıl" */
  totalLabel?: string;
  badge?: string;
  /** Öne çıkan kart (mobilde `recommended`) */
  recommended?: boolean;
  savingsShort?: string;
  features: string[];
};

const INDIVIDUAL_PLANS: PlanDef[] = [
  {
    id: "individual_pro_yearly",
    name: "Pro Yıllık",
    price: "112,42",
    period: "/ay",
    totalLabel: "Toplam ₺1.349/yıl",
    badge: "3 AY BEDAVA",
    recommended: true,
    savingsShort: "₺449,70 tasarruf",
    features: [
      "Sınırsız Parla (AI asistan)",
      "Tüm birikim hedefleri",
      "Aylık tasarruf raporu",
      "Enflasyon analizi",
      "Fiş/makbuz tarama",
      "Öncelikli destek",
    ],
  },
  {
    id: "individual_pro_monthly",
    name: "Pro Aylık",
    price: "149,90",
    period: "/ay",
    badge: "14 GÜN ÜCRETSİZ",
    features: [
      "Sınırsız Parla (AI asistan)",
      "Tüm birikim hedefleri",
      "Aylık tasarruf raporu",
      "Enflasyon analizi",
      "Fiş/makbuz tarama",
      "Öncelikli destek",
    ],
  },
];

const BUSINESS_PLANS: PlanDef[] = [
  {
    id: "business_max_yearly",
    name: "İşletme Max Yıllık",
    price: "741",
    period: "/ay",
    totalLabel: "Toplam ₺8.900/yıl",
    badge: "EN AVANTAJLI",
    recommended: true,
    savingsShort: "₺1.780 tasarruf",
    features: [
      "Tüm İşletme Max özellikleri",
      "Çalışan harcama yönetimi",
      "Çoklu kullanıcı erişimi",
      "e-Fatura oluşturma",
      "Yıllık vergi özet raporu",
      "Öncelikli 7/24 destek",
    ],
  },
  {
    id: "business_pro_monthly",
    name: "İşletme Pro",
    price: "490",
    period: "/ay",
    badge: "14 GÜN ÜCRETSİZ",
    features: [
      "KDV ve stopaj takibi",
      "Fatura yükleme & OCR",
      "Aylık kâr/zarar PDF raporu",
      "AI işletme sağlık analizi",
      "Muhasebeci erişimi",
      "Cari hesap yönetimi",
    ],
  },
  {
    id: "business_max_monthly",
    name: "İşletme Max",
    price: "890",
    period: "/ay",
    features: [
      "Tüm İşletme Pro özellikleri",
      "Çalışan harcama yönetimi",
      "Çoklu kullanıcı erişimi",
      "Öncelikli destek hattı",
      "Yıllık vergi özet raporu",
      "e-Fatura oluşturma",
    ],
  },
];

/** Profil türüne göre gösterilecek planlar (işletme profiline bireysel plan satılmaz). */
export const plansFor = (profileType: string | null): PlanDef[] =>
  profileType === "business" ? BUSINESS_PLANS : INDIVIDUAL_PLANS;

/** 14 gün ücretsiz denemesi OLAN planlar — mobil premium.tsx `TRIAL_PLANS` ile birebir.
    Diğerleri (yıllık/Max) doğrudan ödeme ister → ödeme entegrasyonu gelene kadar satılamaz. */
export const TRIAL_PLANS: readonly SubscriptionTier[] = [
  "individual_pro_monthly",
  "business_pro_monthly",
];

export const planHasTrial = (id: SubscriptionTier) => TRIAL_PLANS.includes(id);

/** Deneme başlatılırken profile yazılan alanlar — mobil `lib/trial.ts startTrial` ile AYNI.
    ⚠️ `trial_notified_day5/day7` kolon adları tarihsel; anlamları "uyarı gösterildi" /
    "bitiş modalı gösterildi". Yeni denemede ikisi de sıfırlanmalı, yoksa mobil uyarıyı
    hiç göstermez (o bayrağı zaten görülmüş sanır). */
export const trialStartFields = (planId: SubscriptionTier) => ({
  is_premium: true,
  subscription_tier: planId,
  trial_plan: planId,
  trial_start_date: new Date().toISOString(),
  trial_notified_day5: false,
  trial_notified_day7: false,
});
