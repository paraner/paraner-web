import { Users, Building2, User, Star, Clock } from "lucide-react";
import { createAdminClient, hasAdminKey } from "../../lib/supabase/admin";
import AdminKeyNotice from "./AdminKeyNotice";

export default async function AdminDashboard() {
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const countOf = (q: ReturnType<typeof admin.from>) => q.select("*", { count: "exact", head: true });

  /* Üye (kişi) ≠ profil: bir kişi hem bireysel hem işletme profili açabilir. Kart/yüzdeler PROFİL
     bazlı; "Toplam Üye" gerçek kişi sayısı olmalı. PostgREST'te distinct count yok → auth_user_id
     kolonu çekilip benzersizleştiriliyor (tek uuid kolonu; büyürse RPC gerekir → DB şeması = önce sor). */
  const [totalR, businessR, premiumR, recentR, ownersR] = await Promise.all([
    countOf(admin.from("profiles")),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("profile_type", "business"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("is_premium", true),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
    admin.from("profiles").select("auth_user_id").limit(10000),
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

  const cards = [
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
              <div className="admin-kpi-label">{c.label}</div>
              <div className="admin-kpi-value">{c.value.toLocaleString("tr-TR")}</div>
              <div className="admin-kpi-sub">{c.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="admin-panel" style={{ marginTop: 20 }}>
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
