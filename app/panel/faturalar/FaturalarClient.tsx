"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";

export type Invoice = {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  amount: string | null;
  currency: string | null;
  payment_status: string | null;
  type: string | null;
  invoice_date: string | null;
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const TrashIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
);

export default function FaturalarClient({
  profileId,
  currency,
  invoicePrefix,
  invoiceNextNumber,
  invoices: initial,
}: {
  profileId: string;
  currency: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  invoices: Invoice[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Invoice[]>(initial);
  const [nextNumber, setNextNumber] = useState(invoiceNextNumber);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [type, setType] = useState<"income" | "expense">("income");
  const [customer, setCustomer] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [vatRate, setVatRate] = useState("20");
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [paid, setPaid] = useState(false);

  function openNew() {
    setType("income");
    setCustomer("");
    setSubtotal("");
    setVatRate("20");
    setInvoiceDate(todayStr());
    setPaid(false);
    setError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sub = Number(subtotal.replace(",", ".")) || 0;
    if (!customer.trim()) {
      setError("Müşteri/firma adı gerekli.");
      return;
    }
    if (sub <= 0) {
      setError("Geçerli bir tutar gir.");
      return;
    }
    const rate = Number(vatRate.replace(",", ".")) || 0;
    const vat = (sub * rate) / 100;
    const total = sub + vat;
    const number = `${invoicePrefix}${String(nextNumber).padStart(4, "0")}`;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          user_id: profileId,
          invoice_number: number,
          customer_name: customer.trim(),
          subtotal: sub,
          vat_rate: rate,
          vat_amount: vat,
          amount: total,
          currency,
          type,
          status: "sent",
          payment_status: paid ? "paid" : "unpaid",
          paid_amount: paid ? total : 0,
          invoice_date: invoiceDate,
        })
        .select(
          "id, invoice_number, customer_name, amount, currency, payment_status, type, invoice_date"
        )
        .single();
      if (error) throw error;

      // Fatura numarasını ilerlet (mobil ile aynı sayaç)
      await supabase
        .from("profiles")
        .update({ invoice_next_number: nextNumber + 1 })
        .eq("id", profileId);

      setNextNumber((n) => n + 1);
      setList((prev) => [data as Invoice, ...prev]);
      setOpen(false);
    } catch {
      setError("Fatura kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(inv: Invoice) {
    if (!confirm(`${inv.invoice_number ?? "Fatura"} silinsin mi?`)) return;
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== inv.id));
  }

  return (
    <>
      <div className="panel-page-head">
        <div>
          <h1 className="panel-h1">Faturalar</h1>
          <p className="panel-sub" style={{ marginBottom: 0 }}>
            Kestiğin ve aldığın faturalar
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Fatura Oluştur
        </button>
      </div>

      {list.length === 0 ? (
        <div className="panel-empty">Henüz fatura yok. Sağ üstten ilk faturanı oluştur.</div>
      ) : (
        <div className="tx-list">
          {list.map((inv) => {
            const isIncome = inv.type === "income";
            const isPaid = inv.payment_status === "paid";
            return (
              <div key={inv.id} className="tx-row">
                <div className="tx-main">
                  <span
                    className="tx-dot"
                    style={{ background: isIncome ? "var(--teal)" : "#E24B4A" }}
                  />
                  <div className="tx-left">
                    <span className="tx-title">{inv.customer_name || "—"}</span>
                    <span className="tx-meta">
                      {[
                        inv.invoice_number,
                        isIncome ? "Satış" : "Alış",
                        inv.invoice_date ? formatDate(inv.invoice_date) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  <span className={`badge ${isPaid ? "green" : "amber"}`}>
                    {isPaid ? "Ödendi" : "Ödenmedi"}
                  </span>
                  <span className="tx-amount">
                    {formatCurrency(Number(inv.amount) || 0, inv.currency || currency)}
                  </span>
                  <button
                    className="tx-delete"
                    onClick={() => handleDelete(inv)}
                    aria-label="Sil"
                  >
                    {TrashIcon}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="modal-overlay" onClick={() => !saving && setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Fatura Oluştur</h2>
              <button className="modal-close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="type-toggle">
                <button
                  type="button"
                  className={type === "income" ? "on-income" : ""}
                  onClick={() => setType("income")}
                >
                  Satış (Kesilen)
                </button>
                <button
                  type="button"
                  className={type === "expense" ? "on-expense" : ""}
                  onClick={() => setType("expense")}
                >
                  Alış (Gelen)
                </button>
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="field">
                <label>Müşteri / Firma</label>
                <input
                  type="text"
                  placeholder="ör. ABC Ltd. Şti."
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Tutar (KDV hariç)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={subtotal}
                    onChange={(e) => setSubtotal(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>KDV %</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Fatura Tarihi</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Ödeme Durumu</label>
                  <select
                    value={paid ? "paid" : "unpaid"}
                    onChange={(e) => setPaid(e.target.value === "paid")}
                  >
                    <option value="unpaid">Ödenmedi</option>
                    <option value="paid">Ödendi</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={saving}
                style={{ marginTop: 4 }}
              >
                {saving ? "Kaydediliyor…" : "Faturayı Kaydet"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
