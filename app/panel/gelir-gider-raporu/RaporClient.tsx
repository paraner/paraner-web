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

export default function RaporClient({
  currency,
  transactions,
}: {
  currency: string;
  transactions: Tx[];
}) {
  const [period, setPeriod] = useState<Period>("month");

  const { income, expense, incTotal, expTotal } = useMemo(() => {
    const start = startOf(period).getTime();
    const inc: Record<string, number> = {};
    const exp: Record<string, number> = {};
    for (const t of transactions) {
      if ((t.currency || currency) !== currency) continue;
      if (!t.date || new Date(t.date).getTime() < start) continue;
      const key = t.category ?? "";
      const amt = Number(t.amount) || 0;
      if (t.type === "income") inc[key] = (inc[key] || 0) + amt;
      else if (t.type === "expense") exp[key] = (exp[key] || 0) + amt;
    }
    const toSorted = (rec: Record<string, number>) =>
      Object.entries(rec)
        .map(([cat, total]) => ({ cat, total }))
        .sort((a, b) => b.total - a.total);
    const income = toSorted(inc);
    const expense = toSorted(exp);
    return {
      income,
      expense,
      incTotal: income.reduce((s, x) => s + x.total, 0),
      expTotal: expense.reduce((s, x) => s + x.total, 0),
    };
  }, [transactions, period, currency]);

  function exportCsv() {
    const rows = [
      ["Tür", "Kategori", "Tutar"],
      ...income.map((x) => ["Gelir", findCategory(x.cat).label, String(x.total)]),
      ...expense.map((x) => ["Gider", findCategory(x.cat).label, String(x.total)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gelir-gider-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function Block({
    title,
    rows,
    total,
    pos,
  }: {
    title: string;
    rows: { cat: string; total: number }[];
    total: number;
    pos: boolean;
  }) {
    return (
      <div className="rapor-block">
        <div className="rapor-block-head">
          <span>{title}</span>
          <strong style={{ color: pos ? "var(--teal)" : "var(--danger)" }}>
            {formatCurrency(total, currency)}
          </strong>
        </div>
        {rows.length === 0 ? (
          <div className="rapor-empty">Kayıt yok</div>
        ) : (
          rows.map((x) => {
            const cat = findCategory(x.cat);
            const pct = total > 0 ? (x.total / total) * 100 : 0;
            return (
              <div key={x.cat} className="rapor-row">
                <span className="rapor-cat">
                  <span className="budget-dot" style={{ background: cat.color }} />
                  {cat.label}
                </span>
                <span className="rapor-bar">
                  <span
                    className="rapor-bar-fill"
                    style={{ width: `${pct}%`, background: cat.color }}
                  />
                </span>
                <span className="rapor-amt">{formatCurrency(x.total, currency)}</span>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <>
      <PageHead
        title="Gelir / Gider Raporu"
        sub="Kategori bazında gelir ve gider dağılımı"
        action={
          <button className="btn btn-ghost btn-sm" onClick={exportCsv}>
            CSV İndir
          </button>
        }
      />

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

      <div className="total-banner">
        <div className="t-item">
          <div className="t-label">Toplam Gelir</div>
          <div className="t-value">{formatCurrency(incTotal, currency)}</div>
        </div>
        <div className="t-item">
          <div className="t-label">Toplam Gider</div>
          <div className="t-value" style={{ color: "var(--danger)" }}>
            {formatCurrency(expTotal, currency)}
          </div>
        </div>
        <div className="t-item">
          <div className="t-label">Net</div>
          <div
            className="t-value"
            style={{ color: incTotal - expTotal >= 0 ? "var(--teal)" : "var(--danger)" }}
          >
            {formatCurrency(incTotal - expTotal, currency)}
          </div>
        </div>
      </div>

      <div className="rapor-grid">
        <Block title="Gelirler" rows={income} total={incTotal} pos />
        <Block title="Giderler" rows={expense} total={expTotal} pos={false} />
      </div>
    </>
  );
}
