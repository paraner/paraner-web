"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";

export type InvoiceVat = {
  type: string | null; // income = satış / expense = alış
  subtotal: string | null;
  vat_amount: string | null;
  amount: string | null;
  currency: string | null;
  invoice_date: string | null;
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

export default function KdvRaporClient({
  currency,
  invoices,
}: {
  currency: string;
  invoices: InvoiceVat[];
}) {
  const [period, setPeriod] = useState<Period>("month");

  const r = useMemo(() => {
    const start = startOf(period).getTime();
    let salesBase = 0,
      salesVat = 0,
      purchaseBase = 0,
      purchaseVat = 0;
    for (const i of invoices) {
      if ((i.currency || currency) !== currency) continue;
      if (!i.invoice_date || new Date(i.invoice_date).getTime() < start) continue;
      const base = Number(i.subtotal) || 0;
      const vat = Number(i.vat_amount) || 0;
      if (i.type === "expense") {
        purchaseBase += base;
        purchaseVat += vat;
      } else {
        salesBase += base;
        salesVat += vat;
      }
    }
    return { salesBase, salesVat, purchaseBase, purchaseVat };
  }, [invoices, period, currency]);

  const payable = r.salesVat - r.purchaseVat;

  return (
    <>
      <PageHead title="KDV Raporu" sub="Hesaplanan ve indirilecek KDV özeti" />

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
          <span>Hesaplanan KDV (satış)</span>
          <strong style={{ color: "var(--teal)" }}>{formatCurrency(r.salesVat, currency)}</strong>
        </div>
        <div className="pl-line">
          <span>İndirilecek KDV (alış)</span>
          <strong style={{ color: "var(--danger)" }}>
            − {formatCurrency(r.purchaseVat, currency)}
          </strong>
        </div>
        <div className="pl-line pl-net">
          <span>{payable >= 0 ? "Ödenecek KDV" : "Devreden KDV"}</span>
          <strong style={{ color: payable >= 0 ? "var(--text)" : "var(--teal)" }}>
            {formatCurrency(Math.abs(payable), currency)}
          </strong>
        </div>
        <div className="pl-margin">
          Satış matrahı: {formatCurrency(r.salesBase, currency)} · Alış matrahı:{" "}
          {formatCurrency(r.purchaseBase, currency)}
        </div>
      </div>

      <p className="kdv-note">
        Bu özet faturalardaki KDV tutarlarından hesaplanır; resmi beyanname yerine geçmez.
      </p>
    </>
  );
}
