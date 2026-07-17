import { Users, Building2, User, Star, Clock, Radio } from "lucide-react";
import { createAdminClient, hasAdminKey } from "../../lib/supabase/admin";
import { ONLINE_WITHIN_MS, relativeLabel } from "../../lib/lifecycle";
import AdminKeyNotice from "./AdminKeyNotice";
import LiveRefresh from "./LiveRefresh";

type OnlineUser = { id: string; email: string; device: string; platform: string; lastSeen: string };

/* ŞU AN AKTİF: user_devices.last_seen'i son 12 dk içinde tazelenmiş kişiler.
   Kalp atışı 5 dk'da bir vuruyor (web app/panel/Heartbeat.tsx + mobil lib/heartbeat.ts).
   ⚠️ Ölçek notu: aktif kişi başına 1 getUserById → aktif sayısıyla orantılı (tüm kullanıcıyı
   listelemekten ucuz). Binlerce eşzamanlı aktif olursa e-postaları tek sorguda veren bir
   RPC gerekir → DB şeması = önce sor. */
async function fetchOnline(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<{ users: OnlineUser[]; count: number }> {
  const since = new Date(Date.now() - ONLINE_WITHIN_MS).toISOString();
  const { data, error } = await admin
    .from("user_devices")
    .select("user_id, last_seen, device_name, platform")
    .gte("last_seen", since)
    .order("last_seen", { ascending: false });
  if (error || !data) return { users: [], count: 0 };

  // Bir kişinin birden fazla aktif cihazı olabilir (telefon + tarayıcı) → kişi başına tek satır.
  const byUser = new Map<string, { last_seen: string; device_name: string | null; platform: string | null }>();
  for (const d of data as { user_id: string; last_seen: string; device_name: string | null; platform: string | null }[]) {
    if (!byUser.has(d.user_id)) byUser.set(d.user_id, d);
  }

  const ids = [...byUser.keys()];
  const users = await Promise.all(
    ids.slice(0, 12).map(async (id) => {
      const { data: u } = await admin.auth.admin.getUserById(id);
      const d = byUser.get(id)!;
      return {
        id,
        email: u?.user?.email ?? "—",
        device: d.device_name ?? "—",
        platform: d.platform ?? "—",
        lastSeen: d.last_seen,
      };
    }),
  );
  return { users, count: ids.length };
}

export default async function AdminDashboard() {
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const countOf = (q: ReturnType<typeof admin.from>) => q.select("*", { count: "exact", head: true });

  /* Üye (kişi) ≠ profil: bir kişi hem bireysel hem işletme profili açabilir. Kart/yüzdeler PROFİL
     bazlı; "Toplam Üye" gerçek kişi sayısı olmalı. PostgREST'te distinct count yok → auth_user_id
     kolonu çekilip benzersizleştiriliyor (tek uuid kolonu; büyürse RPC gerekir → DB şeması = önce sor). */
  const [totalR, businessR, premiumR, recentR, ownersR, online] = await Promise.all([
    countOf(admin.from("profiles")),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("profile_type", "business"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("is_premium", true),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
    admin.from("profiles").select("auth_user_id").limit(10000),
    fetchOnline(admin),
  ]);

  /* ⚠️ Hataları GÖSTER, yutma: `count ?? 0` sessizce 0'a düşüyordu → kolon/izin hatasında
     panelin ilk ekranı "Toplam Üye 0 · %0" der ve kimse sebebini bilmez. */
  const err = [totalR, businessR, premiumR, recentR, ownersR].find((r) => r.error)?.error;
  if (err) {
    return (
      <div>
        <h1 className="admin-h1">Genel Bakış</h1>
        <p className="admin-sub">Metrikler yüklenemedi: {err.message}</p>
      </div>
    );
  }

  const total = totalR.count ?? 0;
  const business = businessR.count ?? 0;
  const premium = premiumR.count ?? 0;
  const recent = recentR.count ?? 0;
  const members = new Set((ownersR.data ?? []).map((r) => r.auth_user_id).filter(Boolean)).size;
  const individual = Math.max(0, total - business);
  const free = Math.max(0, total - premium);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const plural = (n: number) => n.toLocaleString("tr-TR");
  const now = Date.now();

  const cards = [
    {
      label: "Şu an aktif",
      value: online.count,
      sub: members ? `${Math.round((online.count / members) * 100)}% üye · son 12 dk` : "son 12 dk",
      icon: Radio,
      tone: "live",
    },
    {
      label: "Toplam Üye",
      value: members,
      sub: `${plural(total)} profil · son 7 günde +${recent}`,
      icon: Users,
      tone: "",
    },
    { label: "İşletme profili", value: business, sub: `%${pct(business)}`, icon: Building2, tone: "biz" },
    { label: "Bireysel profili", value: individual, sub: `%${pct(individual)}`, icon: User, tone: "ind" },
    { label: "Premium profil", value: premium, sub: `%${pct(premium)} · Free ${free}`, icon: Star, tone: "prem" },
  ];

  return (
    <div>
      {/* "Şu an aktif" canlı kalsın — sunucu bileşeni kendi kendine yenilenmez */}
      <LiveRefresh />

      <h1 className="admin-h1">Genel Bakış</h1>
      <p className="admin-sub">
        Tüm üyeler ve abonelik dağılımı. Bir üye birden fazla profil açabilir — dağılımlar profil bazlıdır.
      </p>

      <div className="admin-kpi-grid">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`admin-kpi${c.tone ? " " + c.tone : ""}`}>
              <span className="admin-kpi-ic">
                <Icon size={18} />
              </span>
              <div className="admin-kpi-label">
                {c.tone === "live" && c.value > 0 && <i className="admin-live-dot" />}
                {c.label}
              </div>
              <div className="admin-kpi-value">{c.value.toLocaleString("tr-TR")}</div>
              <div className="admin-kpi-sub">{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* --- Şu an uygulamada kimler var --- */}
      <div className="admin-panel" style={{ marginTop: 20 }}>
        <div className="admin-panel-head">
          <Radio size={16} /> Şu an uygulamada
          {online.count > 0 && <span className="admin-live-pill">{online.count}</span>}
        </div>
        {online.count === 0 ? (
          <p className="admin-td-dim" style={{ fontSize: 13, margin: 0 }}>
            Şu anda kimse aktif değil. (Kullanıcı uygulamayı/paneli açtığında 5 dakikada bir sinyal
            gönderir; burada son 12 dakika içinde sinyal verenler listelenir.)
          </p>
        ) : (
          <div className="admin-staff-list">
            {online.users.map((u) => (
              <div key={u.id} className="admin-staff-row">
                <span className="admin-online">
                  <i /> {u.email}
                </span>
                <span className="admin-td-dim" style={{ fontSize: 12 }}>
                  {u.device} · {u.platform === "ios" ? "iPhone" : u.platform === "web" ? "Web" : u.platform} ·{" "}
                  {relativeLabel(u.lastSeen, now) === "bugün" ? "az önce" : relativeLabel(u.lastSeen, now)}
                </span>
              </div>
            ))}
            {online.count > online.users.length && (
              <p className="admin-td-dim" style={{ fontSize: 12, margin: "4px 0 0" }}>
                +{online.count - online.users.length} kişi daha
              </p>
            )}
          </div>
        )}
      </div>

      <div className="admin-panel" style={{ marginTop: 16 }}>
        <div className="admin-panel-head">
          <Clock size={16} /> Abonelik dağılımı (profil bazlı)
        </div>
        <div className="admin-bar">
          <div className="admin-bar-fill prem" style={{ width: `${pct(premium)}%` }} />
        </div>
        <div className="admin-bar-legend">
          <span>
            <i className="dot prem" /> Premium {premium} (%{pct(premium)})
          </span>
          <span>
            <i className="dot free" /> Free {free} (%{pct(free)})
          </span>
        </div>
      </div>
    </div>
  );
}
