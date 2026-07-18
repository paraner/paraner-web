import "server-only";
import { createAdminClient } from "./supabase/admin";
import { ONLINE_WITHIN_MS } from "./lifecycle";

/* Canlı Görünüm veri katmanı (/admin/canli + kabuktaki canlı sayaç).

   ⚠️ NEYİ BİLMİYORUZ: sistem yalnız "en son ne zaman aktifti"yi (user_devices.last_seen)
   tutuyor — GEÇMİŞ YOK. Bu yüzden "saat 14:00'te kaç kişi aktifti" gibi zaman eğrisi
   (Shopify'daki oturum grafiği) ÜRETİLEMEZ; uydurmak yerine göstermiyoruz. Gerekirse
   olay geçmişi tablosu şart → DB şeması = önce sor.

   Aktiflik sinyali: kalp atışı 5 dk'da bir (web app/panel/Heartbeat.tsx + mobil
   lib/heartbeat.ts → touch_device RPC). "Şu an aktif" eşiği 12 dk (lifecycle.ONLINE_WITHIN_MS). */

const DAY_MS = 86400000;
const HOUR_MS = 3600000;

export type OnlinePerson = {
  userId: string;
  email: string;
  name: string | null;
  device: string | null;
  platform: string | null;
  city: string | null;
  lastSeen: string;
};

export type FeedEvent = {
  id: string;
  kind: "transaction" | "invoice" | "ticket" | "signup";
  title: string;
  detail: string | null;
  at: string;
};

export type LiveSnapshot = {
  counts: { online: number; today: number; lastHour: number; newToday: number };
  people: OnlinePerson[];
  cities: { city: string; n: number }[];
  platforms: { platform: string; n: number }[];
  feed: FeedEvent[];
  /** Gösterilen kişi sayısı sınırlandıysa kaç kişi gizlendi (sessiz kırpma YOK). */
  hiddenPeople: number;
  /** ⚠️ Sorgu hatası (denetim 2026-07-18 / Y6): eskiden 5 sorgunun hiçbirinin .error'ına
      bakılmıyordu, hepsi `?? []` ile boşa düşüyordu → RLS/kolon bozulunca ekran "Şu anda
      kimse uygulamada değil" diyordu ve ekip sistemin SESSİZ olduğunu sanıyordu. */
  error?: string;
};

type DeviceRow = {
  user_id: string;
  last_seen: string;
  device_name: string | null;
  platform: string | null;
  last_city: string | null;
};

/** Kabuktaki rozet için: yalnız SAYI (ucuz — e-posta çözümlemesi yok). */
export async function getOnlineCount(): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const since = new Date(Date.now() - ONLINE_WITHIN_MS).toISOString();
  const { data, error } = await admin.from("user_devices").select("user_id").gte("last_seen", since);
  if (error || !data) return 0;
  // Bir kişinin birden fazla aktif cihazı olabilir (telefon + tarayıcı) → benzersizleştir.
  return new Set((data as { user_id: string }[]).map((d) => d.user_id)).size;
}

const PEOPLE_LIMIT = 50; // ekranda gösterilecek azami kişi (gerisi "+N kişi daha")

export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  const admin = createAdminClient();
  const empty: LiveSnapshot = {
    counts: { online: 0, today: 0, lastHour: 0, newToday: 0 },
    people: [],
    cities: [],
    platforms: [],
    feed: [],
    hiddenPeople: 0,
  };
  if (!admin) return empty;

  const now = Date.now();
  const sinceOnline = new Date(now - ONLINE_WITHIN_MS).toISOString();
  const sinceHour = new Date(now - HOUR_MS).toISOString();
  const sinceDay = new Date(now - DAY_MS).toISOString();

  const [devicesR, profilesR, txR, invR, ticketR] = await Promise.all([
    // Son 24 saatte sinyal veren cihazlar — "bugün/son 1 saat/şu an" hepsi bundan çıkar (tek sorgu).
    admin
      .from("user_devices")
      .select("user_id, last_seen, device_name, platform, last_city")
      .gte("last_seen", sinceDay)
      .order("last_seen", { ascending: false }),
    // Profil adları (feed + liste için) — transactions/invoices.user_id = PROFİL id'si.
    admin.from("profiles").select("id, auth_user_id, profile_name, name, created_at").limit(10000),
    admin.from("transactions").select("id, user_id, title, amount, type, currency, created_at").gte("created_at", sinceDay).order("created_at", { ascending: false }).limit(30),
    admin.from("invoices").select("id, user_id, title, amount, currency, created_at").gte("created_at", sinceDay).order("created_at", { ascending: false }).limit(30),
    admin.from("support_tickets").select("id, user_id, subject, created_at").gte("created_at", sinceDay).order("created_at", { ascending: false }).limit(30),
  ]);

  /* Hata varsa GÖSTER, yutma. devices/profiles kritik (sayaç + isimler oradan);
     feed sorguları (tx/inv/ticket) düşerse akış eksilir — o da söylenmeli. */
  const liveErr = [devicesR, profilesR, txR, invR, ticketR].find((r) => r.error)?.error;

  const devices = (devicesR.data ?? []) as DeviceRow[];
  const profiles = (profilesR.data ?? []) as {
    id: string;
    auth_user_id: string | null;
    profile_name: string | null;
    name: string | null;
    created_at: string | null;
  }[];

  // --- Kişi başına EN YENİ cihaz (aynı kişi telefon + tarayıcıdan aynı anda olabilir) ---
  const latestByUser = new Map<string, DeviceRow>();
  for (const d of devices) if (!latestByUser.has(d.user_id)) latestByUser.set(d.user_id, d);

  const onlineIds = [...latestByUser.values()]
    .filter((d) => d.last_seen >= sinceOnline)
    .map((d) => d.user_id);
  const todayIds = new Set([...latestByUser.keys()]);
  const hourIds = [...latestByUser.values()].filter((d) => d.last_seen >= sinceHour).length;

  // --- Profil adları: kişi → görünen ad ---
  const nameByUser = new Map<string, string>();
  for (const p of profiles) {
    if (!p.auth_user_id) continue;
    const n = p.profile_name || p.name;
    if (n && !nameByUser.has(p.auth_user_id)) nameByUser.set(p.auth_user_id, n);
  }
  const nameByProfile = new Map(profiles.map((p) => [p.id, p.profile_name || p.name || "—"]));

  /* E-posta auth.users'ta → aktif kişi başına 1 getUserById.
     ⚠️ Maliyet aktif sayısıyla orantılı (tüm kullanıcıyı listelemekten ucuz), ama binlerce
     eşzamanlı aktifte e-postaları tek sorguda veren bir RPC gerekir → DB şeması = önce sor.
     PEOPLE_LIMIT ile sınırlı; kırpılan sayı `hiddenPeople` ile GÖRÜNÜR (sessiz kırpma yok). */
  const shown = onlineIds.slice(0, PEOPLE_LIMIT);
  const people: OnlinePerson[] = await Promise.all(
    shown.map(async (id) => {
      const d = latestByUser.get(id)!;
      const { data: u } = await admin.auth.admin.getUserById(id);
      return {
        userId: id,
        email: u?.user?.email ?? "—",
        name: nameByUser.get(id) ?? null,
        device: d.device_name,
        platform: d.platform,
        city: d.last_city,
        lastSeen: d.last_seen,
      };
    }),
  );

  // --- Konum + platform dağılımı (ŞU AN aktif olanlar üzerinden) ---
  const onlineDevices = [...latestByUser.values()].filter((d) => d.last_seen >= sinceOnline);
  const tally = (rows: (string | null)[], bos: string) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = r?.trim() || bos;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
  };
  const cities = tally(onlineDevices.map((d) => d.last_city), "Bilinmiyor").map((x) => ({ city: x.k, n: x.n }));
  const platforms = tally(onlineDevices.map((d) => d.platform), "diğer").map((x) => ({ platform: x.k, n: x.n }));

  // --- Canlı akış: son 24 saatteki olaylar, tek listede ---
  const money = (a: number | null, c: string | null) =>
    a == null ? null : `${a.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c || "TRY"}`;

  const feed: FeedEvent[] = [
    ...((txR.data ?? []) as { id: string; user_id: string; title: string | null; amount: number | null; type: string | null; currency: string | null; created_at: string }[]).map((t) => ({
      id: `tx-${t.id}`,
      kind: "transaction" as const,
      title: t.type === "income" ? "Gelir kaydedildi" : "Gider kaydedildi",
      detail: [nameByProfile.get(t.user_id), t.title, money(t.amount, t.currency)].filter(Boolean).join(" · "),
      at: t.created_at,
    })),
    ...((invR.data ?? []) as { id: string; user_id: string; title: string | null; amount: number | null; currency: string | null; created_at: string }[]).map((i) => ({
      id: `inv-${i.id}`,
      kind: "invoice" as const,
      title: "Fatura oluşturuldu",
      detail: [nameByProfile.get(i.user_id), i.title, money(i.amount, i.currency)].filter(Boolean).join(" · "),
      at: i.created_at,
    })),
    ...((ticketR.data ?? []) as { id: string; user_id: string; subject: string; created_at: string }[]).map((t) => ({
      id: `tk-${t.id}`,
      kind: "ticket" as const,
      title: "Destek talebi açıldı",
      detail: [nameByUser.get(t.user_id), t.subject].filter(Boolean).join(" · "),
      at: t.created_at,
    })),
    ...profiles
      .filter((p) => p.created_at && p.created_at >= sinceDay)
      .map((p) => ({
        id: `pr-${p.id}`,
        kind: "signup" as const,
        title: "Yeni profil açıldı",
        detail: p.profile_name || p.name || null,
        at: p.created_at!,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 50);

  const newToday = profiles.filter((p) => p.created_at && p.created_at >= sinceDay).length;

  return {
    counts: { online: onlineIds.length, today: todayIds.size, lastHour: hourIds, newToday },
    people,
    cities,
    platforms,
    feed,
    hiddenPeople: Math.max(0, onlineIds.length - people.length),
    error: liveErr?.message,
  };
}
