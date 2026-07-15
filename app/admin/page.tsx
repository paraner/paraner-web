import { Users, Building2, User, Star, Clock } from "lucide-react";
import { createAdminClient, hasAdminKey } from "../../lib/supabase/admin";
import AdminKeyNotice from "./AdminKeyNotice";

export default async function AdminDashboard() {
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const countOf = (q: ReturnType<typeof admin.from>) => q.select("*", { count: "exact", head: true });

  const [totalR, businessR, premiumR, recentR] = await Promise.all([
    countOf(admin.from("profiles")),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("profile_type", "business"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("is_premium", true),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
  ]);

  const total = totalR.count ?? 0;
  const business = businessR.count ?? 0;
  const premium = premiumR.count ?? 0;
  const recent = recentR.count ?? 0;
  const individual = Math.max(0, total - business);
  const free = Math.max(0, total - premium);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const cards = [
    { label: "Toplam Üye", value: total, sub: `Son 7 günde +${recent}`, icon: Users, tone: "" },
    { label: "İşletme", value: business, sub: `%${pct(business)}`, icon: Building2, tone: "biz" },
    { label: "Bireysel", value: individual, sub: `%${pct(individual)}`, icon: User, tone: "ind" },
    { label: "Premium", value: premium, sub: `%${pct(premium)} · Free ${free}`, icon: Star, tone: "prem" },
  ];

  return (
    <div>
      <h1 className="admin-h1">Genel Bakış</h1>
      <p className="admin-sub">Tüm üyeler ve abonelik dağılımı.</p>

      <div className="admin-kpi-grid">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`admin-kpi${c.tone ? " " + c.tone : ""}`}>
              <span className="admin-kpi-ic"><Icon size={18} /></span>
              <div className="admin-kpi-label">{c.label}</div>
              <div className="admin-kpi-value">{c.value.toLocaleString("tr-TR")}</div>
              <div className="admin-kpi-sub">{c.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="admin-panel" style={{ marginTop: 20 }}>
        <div className="admin-panel-head">
          <Clock size={16} /> Abonelik dağılımı
        </div>
        <div className="admin-bar">
          <div className="admin-bar-fill prem" style={{ width: `${pct(premium)}%` }} />
        </div>
        <div className="admin-bar-legend">
          <span><i className="dot prem" /> Premium {premium} (%{pct(premium)})</span>
          <span><i className="dot free" /> Free {free} (%{pct(free)})</span>
        </div>
      </div>
    </div>
  );
}
