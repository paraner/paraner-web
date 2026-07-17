import { TRIAL_DAYS } from "./plans";
import type { AdminPerson, AdminPersonProfile } from "./adminUsers";

/* Müşteri yaşam döngüsü — admin panelinin durum hesabı.
   ⚠️ NEDEN `is_premium`'a GÜVENMİYORUZ: denemeyi bitirme işini yalnız mobil istemci yapıyor
   (paraner-app/lib/trial.ts `expireTrial`, sadece uygulama açılınca). Uygulamayı açmayan
   kullanıcıda deneme bitse bile is_premium=true KALIYOR. 17.07.2026'da canlıda 2 böyle profil
   vardı. Bu yüzden gerçek durum trial_start_date + 14 günden HESAPLANIR; DB'nin dediği ile
   hesaplanan çeliştiğinde bunu "zombi" olarak İŞARETLERİZ (aksiyon alınacak yer orası).
   Sunucu tarafı düzeltmesi: paraner-app/supabase/trial-expire-cron.sql. */

const DAY = 86400000;

export type LifecycleKind =
  | "trial" // deneme sürüyor
  | "zombie" // deneme bitti ama premium açık kalmış (düşürülmemiş)
  | "paid" // premium, denemesi yok → gerçek/manuel abonelik
  | "free"; // ücretsiz (hiç deneme yok ya da bitmiş + düzgün düşmüş)

export type ProfileLifecycle = {
  kind: LifecycleKind;
  /** trial: kalan gün · zombie: bitişin üstünden geçen gün */
  days: number;
};

export function profileLifecycle(p: AdminPersonProfile, now = Date.now()): ProfileLifecycle {
  // Deneme "başlamış" sayılmak için İKİSİ de dolu olmalı — mobil lib/trial.ts:43 ile aynı guard.
  if (p.trial_plan && p.trial_start_date) {
    const passed = Math.floor((now - new Date(p.trial_start_date).getTime()) / DAY);
    if (passed < TRIAL_DAYS) return { kind: "trial", days: TRIAL_DAYS - passed };
    // Deneme bitmiş: düzgün düşürülmüşse free, hâlâ premium ise zombi.
    return p.is_premium ? { kind: "zombie", days: passed - TRIAL_DAYS } : { kind: "free", days: 0 };
  }
  return p.is_premium ? { kind: "paid", days: 0 } : { kind: "free", days: 0 };
}

/* Kişi satırında TEK durum gösteriyoruz ama kişinin birden fazla profili olabilir
   (bireysel + işletme). Öncelik: zombi (aksiyon gerekir) > deneme (satış fırsatı) >
   ücretli > ücretsiz. Detay sayfasında profil profil gösteriliyor. */
const PRIORITY: Record<LifecycleKind, number> = { zombie: 3, trial: 2, paid: 1, free: 0 };

export function personLifecycle(person: AdminPerson, now = Date.now()): ProfileLifecycle {
  let best: ProfileLifecycle = { kind: "free", days: 0 };
  for (const p of person.profiles) {
    const cur = profileLifecycle(p, now);
    if (PRIORITY[cur.kind] > PRIORITY[best.kind]) best = cur;
    // Aynı türde birden fazla deneme varsa en yakın bitene göre (satış sırası doğru olsun)
    else if (cur.kind === best.kind && cur.kind === "trial" && cur.days < best.days) best = cur;
  }
  return best;
}

export const isBanned = (p: AdminPerson, now = Date.now()) =>
  Boolean(p.banned_until && new Date(p.banned_until).getTime() > now);

export const hasBusiness = (p: AdminPerson) => p.profiles.some((x) => x.profile_type === "business");

export const displayName = (p: AdminPerson) =>
  p.profiles.find((x) => x.profile_name)?.profile_name ??
  p.profiles.find((x) => x.name)?.name ??
  "—";

/** Kişinin denemesi bitene kaç gün kaldı (yoksa null) — sıralama için. */
export function trialDaysLeft(p: AdminPerson, now = Date.now()): number | null {
  const l = personLifecycle(p, now);
  return l.kind === "trial" ? l.days : null;
}

export const LIFECYCLE_META: Record<LifecycleKind, { label: string; badge: string }> = {
  trial: { label: "Deneme", badge: "blue" },
  zombie: { label: "Deneme bitti · premium açık", badge: "red" },
  paid: { label: "Ücretli", badge: "green" },
  free: { label: "Ücretsiz", badge: "gray" },
};

/** Rozet metni: deneme "2 gün kaldı", zombi "5 gün geçti". */
export function lifecycleLabel(l: ProfileLifecycle): string {
  if (l.kind === "trial") return `Deneme · ${l.days} gün kaldı`;
  if (l.kind === "zombie") return `⚠️ Deneme ${l.days} gün önce bitti`;
  return LIFECYCLE_META[l.kind].label;
}

/** "3 gün önce" — son giriş sütunu için. Hiç giriş yoksa null. */
export function relativeDays(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  return Math.floor((now - new Date(iso).getTime()) / DAY);
}

export function relativeLabel(iso: string | null, now = Date.now()): string {
  const d = relativeDays(iso, now);
  if (d == null) return "hiç";
  if (d === 0) return "bugün";
  if (d === 1) return "dün";
  if (d < 30) return `${d} gün önce`;
  if (d < 365) return `${Math.floor(d / 30)} ay önce`;
  return `${Math.floor(d / 365)} yıl önce`;
}

/** Kayıp sayılma eşiği: 30+ gündür giriş yok. */
export const LOST_AFTER_DAYS = 30;
/** "Yeni" sayılma eşiği: son 7 günde kayıt. */
export const NEW_WITHIN_DAYS = 7;
/** Deneme "bitmek üzere" eşiği. */
export const TRIAL_ENDING_DAYS = 3;
