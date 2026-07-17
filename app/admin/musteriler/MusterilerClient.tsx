"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export type AdminProfile = {
  id: string;
  profile_name: string | null;
  name: string | null;
  profile_type: string | null;
  is_premium: boolean | null;
  subscription_tier: string | null;
  trial_plan: string | null;
  currency: string | null;
  created_at: string | null;
};

type TypeFilter = "all" | "business" | "individual";
type PlanFilter = "all" | "premium" | "free";

function fmtDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function MusterilerClient({ rows }: { rows: AdminProfile[] }) {
  const [type, setType] = useState<TypeFilter>("all");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLocaleLowerCase("tr");
    return rows.filter((r) => {
      if (type === "business" && r.profile_type !== "business") return false;
      if (type === "individual" && r.profile_type === "business") return false;
      if (plan === "premium" && !r.is_premium) return false;
      if (plan === "free" && r.is_premium) return false;
      if (query) {
        const hay = `${r.profile_name ?? ""} ${r.name ?? ""}`.toLocaleLowerCase("tr");
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [rows, type, plan, q]);

  const chip = <T,>(val: T, cur: T, set: (v: T) => void, label: string, count?: number) => (
    <button type="button" className={`admin-chip${cur === val ? " active" : ""}`} onClick={() => set(val)}>
      {label}
      {count != null && <span className="admin-chip-count">{count}</span>}
    </button>
  );

  const nBiz = rows.filter((r) => r.profile_type === "business").length;
  const nInd = rows.length - nBiz;
  const nPrem = rows.filter((r) => r.is_premium).length;

  return (
    <div>
      <h1 className="admin-h1">Müşteriler</h1>
      <p className="admin-sub">{rows.length.toLocaleString("tr-TR")} profil · filtrele, ara ve detaya in.</p>

      <div className="admin-filters">
        <div className="admin-chip-row">
          {chip<TypeFilter>("all", type, setType, "Tümü", rows.length)}
          {chip<TypeFilter>("business", type, setType, "İşletme", nBiz)}
          {chip<TypeFilter>("individual", type, setType, "Bireysel", nInd)}
        </div>
        <div className="admin-chip-row">
          {chip<PlanFilter>("all", plan, setPlan, "Tüm planlar")}
          {chip<PlanFilter>("premium", plan, setPlan, "Premium", nPrem)}
          {chip<PlanFilter>("free", plan, setPlan, "Free", rows.length - nPrem)}
        </div>
        <label className="admin-search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İsme göre ara…" />
        </label>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Tür</th>
              <th>Abonelik</th>
              <th>Para Birimi</th>
              <th>Kayıt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty-cell">Eşleşen profil yok.</td>
              </tr>
            ) : (
              filtered.slice(0, 300).map((r) => (
                <tr key={r.id}>
                  <td className="admin-td-name">{r.profile_name || r.name || "—"}</td>
                  <td>
                    <span className={`badge ${r.profile_type === "business" ? "blue" : "gray"}`}>
                      {r.profile_type === "business" ? "İşletme" : "Bireysel"}
                    </span>
                  </td>
                  <td>
                    {r.is_premium ? (
                      <span className="badge green">{r.subscription_tier || "Premium"}</span>
                    ) : (
                      <span className="badge gray">Free</span>
                    )}
                  </td>
                  <td>{r.currency || "TRY"}</td>
                  <td className="admin-td-dim">{fmtDate(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 300 && (
        <p className="admin-sub" style={{ marginTop: 10 }}>
          İlk 300 gösteriliyor ({filtered.length} eşleşme). Aramayı daraltabilirsin.
        </p>
      )}
    </div>
  );
}
