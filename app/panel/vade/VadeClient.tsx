"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";

export type AgingInvoice = {
  id: string;
  customer_name: string | null;
  amount: string | null;
  currency: string | null;
  type: string | null; // income = satış (alacak) / expense = alış (borç)
  invoice_date: string | null;
  payment_status: string | null;
};

function daysSince(dateStr: string | null) {
  if (!dateStr) return 0;
  // Tarih-only karşılaştırma (UTC): new Date(str) + Date.now() karışımı timezone
  // kaymasıyla sınırda 1 gün sapabiliyordu → her iki tarafı da UTC gün olarak al.
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return 0;
  const then = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today - then) / 86400000);
}

function bucketOf(days: number) {
  if (days <= 0) return { key: "current", label: "Güncel", cls: "green" };
  if (days <= 30) return { key: "b30", label: "1-30 gün", cls: "amber" };
  if (days <= 60) return { key: "b60", label: "31-60 gün", cls: "amber" };
  return { key: "b60p", label: "60+ gün", cls: "red" };
}

export default function VadeClient({
  currency,
  invoices,
}: {
  currency: string;
  invoices: AgingInvoice[];
}) {
  const [tab, setTab] = useState<"income" | "expense">("income");

  const rows = invoices.filter((i) => (i.type === "expense" ? "expense" : "income") === tab);

  const totalReceivable = invoices
    .filter((i) => i.type !== "expense")
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalPayable = invoices
    .filter((i) => i.type === "expense")
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const overdueCount = invoices.filter((i) => daysSince(i.invoice_date) > 30).length;

  return (
    <>
      <PageHead title="Vade Takibi" sub="Ödenmemiş faturaların yaşlandırması" />

      {invoices.length === 0 ? (
        <div className="panel-empty">Ödenmemiş fatura yok. 🎉</div>
      ) : (
        <>
          <div className="total-banner">
            <div className="t-item">
              <div className="t-label">Alacak (ödenmemiş satış)</div>
              <div className="t-value">{formatCurrency(totalReceivable, currency)}</div>
            </div>
            <div className="t-item">
              <div className="t-label">Borç (ödenmemiş alış)</div>
              <div className="t-value" style={{ color: "var(--danger)" }}>
                {formatCurrency(totalPayable, currency)}
              </div>
            </div>
            <div className="t-item">
              <div className="t-label">30+ Gün Geçmiş</div>
              <div className="t-value" style={{ color: overdueCount ? "var(--warning)" : undefined }}>
                {overdueCount}
              </div>
            </div>
          </div>

          <div className="chip-seg" style={{ marginBottom: 14 }}>
            <button
              className={tab === "income" ? "active on-income" : ""}
              onClick={() => setTab("income")}
            >
              Alacaklar
            </button>
            <button
              className={tab === "expense" ? "active on-expense" : ""}
              onClick={() => setTab("expense")}
            >
              Borçlar
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="panel-empty">Bu grupta ödenmemiş fatura yok.</div>
          ) : (
            <div className="tx-list">
              {rows.map((i) => {
                const days = daysSince(i.invoice_date);
                const b = bucketOf(days);
                const isIncome = i.type !== "expense";
                return (
                  <div key={i.id} className="tx-row">
                    <div className="tx-main">
                      <span
                        className="tx-dot"
                        style={{ background: isIncome ? "var(--teal)" : "var(--danger)" }}
                      />
                      <div className="tx-left">
                        <span className="tx-title">{i.customer_name || "—"}</span>
                        <span className="tx-meta">
                          {[
                            i.invoice_date ? formatDate(i.invoice_date) : null,
                            days > 0 ? `${days} gün önce` : "bugün",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    </div>
                    <div className="tx-right">
                      <span className={`badge ${b.cls}`}>{b.label}</span>
                      <span className="tx-amount">
                        {formatCurrency(Number(i.amount) || 0, i.currency || currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
