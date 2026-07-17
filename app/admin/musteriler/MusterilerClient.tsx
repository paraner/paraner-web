"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Ban } from "lucide-react";
import type { AdminPerson } from "../../../lib/adminUsers";

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

const isBanned = (p: AdminPerson) => Boolean(p.banned_until && new Date(p.banned_until) > new Date());
const hasBusiness = (p: AdminPerson) => p.profiles.some((x) => x.profile_type === "business");
const isPremium = (p: AdminPerson) => p.profiles.some((x) => x.is_premium);
const displayName = (p: AdminPerson) =>
  p.profiles.find((x) => x.profile_name || x.name)?.profile_name ??
  p.profiles.find((x) => x.name)?.name ??
  "—";

export default function MusterilerClient({
  people,
  truncated,
}: {
  people: AdminPerson[];
  truncated: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState<TypeFilter>("all");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLocaleLowerCase("tr");
    return people.filter((p) => {
      if (type === "business" && !hasBusiness(p)) return false;
      if (type === "individual" && hasBusiness(p)) return false;
      if (plan === "premium" && !isPremium(p)) return false;
      if (plan === "free" && isPremium(p)) return false;
      if (query) {
        // E-posta ile arama ŞART: destekte müşteri kendini e-postasıyla tanıtır.
        const hay = `${p.email} ${displayName(p)}`.toLocaleLowerCase("tr");
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [people, type, plan, q]);

  const chip = <T,>(val: T, cur: T, set: (v: T) => void, label: string, count?: number) => (
    <button type="button" className={`admin-chip${cur === val ? " active" : ""}`} onClick={() => set(val)}>
      {label}
      {count != null && <span className="admin-chip-count">{count}</span>}
    </button>
  );

  const nBiz = people.filter(hasBusiness).length;
  const nPrem = people.filter(isPremium).length;
  const nProfiles = people.reduce((n, p) => n + p.profiles.length, 0);

  return (
    <div>
      <h1 className="admin-h1">Müşteriler</h1>
      <p className="admin-sub">
        {people.length.toLocaleString("tr-TR")} üye · {nProfiles.toLocaleString("tr-TR")} profil ·
        satıra tıkla, detayı aç.
      </p>

      <div className="admin-filters">
        <div className="admin-chip-row">
          {chip<TypeFilter>("all", type, setType, "Tümü", people.length)}
          {chip<TypeFilter>("business", type, setType, "İşletme", nBiz)}
          {chip<TypeFilter>("individual", type, setType, "Bireysel", people.length - nBiz)}
        </div>
        <div className="admin-chip-row">
          {chip<PlanFilter>("all", plan, setPlan, "Tüm planlar")}
          {chip<PlanFilter>("premium", plan, setPlan, "Premium", nPrem)}
          {chip<PlanFilter>("free", plan, setPlan, "Free", people.length - nPrem)}
        </div>
        <label className="admin-search">
          <Search size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="E-posta veya isimle ara…"
          />
        </label>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>E-posta</th>
              <th>Ad</th>
              <th>Profiller</th>
              <th>Abonelik</th>
              <th>Son giriş</th>
              <th>Kayıt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty-cell">Eşleşen üye yok.</td>
              </tr>
            ) : (
              filtered.slice(0, 300).map((p) => (
                <tr
                  key={p.id}
                  className="admin-row-click"
                  onClick={() => router.push(`/admin/musteriler/${p.id}`)}
                >
                  <td className="admin-td-name">
                    {p.email}
                    {isBanned(p) && (
                      <span className="badge red" style={{ marginLeft: 8 }}>
                        <Ban size={11} /> Askıda
                      </span>
                    )}
                  </td>
                  <td>{displayName(p)}</td>
                  <td>
                    {p.profiles.length === 0 ? (
                      <span className="admin-td-dim">—</span>
                    ) : (
                      <span className="admin-badge-row">
                        {p.profiles.map((pr) => (
                          <span
                            key={pr.id}
                            className={`badge ${pr.profile_type === "business" ? "blue" : "gray"}`}
                          >
                            {pr.profile_type === "business" ? "İşletme" : "Bireysel"}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td>
                    {isPremium(p) ? (
                      <span className="badge green">Premium</span>
                    ) : (
                      <span className="badge gray">Free</span>
                    )}
                  </td>
                  <td className="admin-td-dim">{fmtDate(p.last_sign_in_at)}</td>
                  <td className="admin-td-dim">{fmtDate(p.created_at)}</td>
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
      {truncated && (
        <p className="admin-sub" style={{ marginTop: 10 }}>
          ⚠️ Kullanıcı listesi 10.000&apos;de kırpıldı — bu ekran sayfalama ister.
        </p>
      )}
    </div>
  );
}
