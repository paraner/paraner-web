"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "../../../lib/format";
import { findCategory } from "../../../lib/categories";
import PageHead from "../../../components/ui/PageHead";

export type Tx = {
  amount: string | number;
  type: string;
  category: string | null;
  currency: string | null;
  date: string | null;
};

type Period = "month" | "q" | "year";
const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "Bu Ay" },
  { id: "q", label: "Son 3 Ay" },
  { id: "year", label: "Bu Yıl" },
];

function startOf(period: Period) {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "q") return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return new Date(now.getFullYear(), 0, 1);
}

export default function KarZararClient({
  currency,
  transactions,
}: {
  currency: string;
  transactions: Tx[];
}) {
  const [period, setPeriod] = useState<Period>("month");

  const { revenue, expense, topExpenses } = useMemo(() => {
    const start = startOf(period).getTime();
    let revenue = 0;
    let expense = 0;
    const exp: Record<string, number> = {};
    for (const t of transactions) {
      if ((t.currency || currency) !== currency) continue;
      if (!t.date || new Date(t.date).getTime() < start) continue;
      const amt = Number(t.amount) || 0;
      if (t.type === "income") revenue += amt;
      else if (t.type === "expense") {
        expense += amt;
        const k = t.category ?? "";
        exp[k] = (exp[k] || 0) + amt;
      }
    }
    const topExpenses = Object.entries(exp)
      .map(([cat, total]) => ({ cat, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    return { revenue, expense, topExpenses };
  }, [transactions, period, currency]);

  const net = revenue - expense;
  const margin = revenue > 0 ? (net / revenue) * 100 : 0;

  return (
    <>
      <PageHead title="Kâr / Zarar Tablosu" sub="Dönem kâr/zarar durumu" />

      <div className="chip-seg" style={{ marginBottom: 16 }}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            className={period === p.id ? "active" : ""}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="pl-card">
        <div className="pl-line">
          <span>Gelir (Ciro)</span>
          <strong style={{ color: "var(--teal)" }}>{formatCurrency(revenue, currency)}</strong>
        </div>
        <div className="pl-line">
          <span>Gider</span>
          <strong style={{ color: "var(--danger)" }}>− {formatCurrency(expense, currency)}</strong>
        </div>
        <div className="pl-line pl-net">
          <span>{net >= 0 ? "Net Kâr" : "Net Zarar"}</span>
          <strong style={{ color: net >= 0 ? "var(--teal)" : "var(--danger)" }}>
            {formatCurrency(net, currency)}
          </strong>
        </div>
        <div className="pl-margin">Kâr Marjı: %{margin.toFixed(1)}</div>
      </div>

      {topExpenses.length > 0 && (
        <>
          <div className="section-title">En Yüksek Gider Kalemleri</div>
          <div className="tx-list">
            {topExpenses.map((x) => {
              const cat = findCategory(x.cat);
              return (
                <div key={x.cat} className="tx-row">
                  <div className="tx-main">
                    <span className="tx-dot" style={{ background: cat.color }} />
                    <div className="tx-left">
                      <span className="tx-title">{cat.label}</span>
                      <span className="tx-meta">
                        Giderin %{expense > 0 ? ((x.total / expense) * 100).toFixed(0) : 0}&apos;ı
                      </span>
                    </div>
                  </div>
                  <div className="tx-right">
                    <span className="tx-amount" style={{ color: "var(--danger)" }}>
                      {formatCurrency(x.total, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
