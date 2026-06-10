"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { TrashIcon } from "../../../components/icons";

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

  // Özet (yüklü faturalar üzerinden)
  const sum = (rows: Invoice[]) =>
    rows.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalSales = sum(list.filter((i) => i.type === "income"));
  const totalPurchase = sum(list.filter((i) => i.type === "expense"));
  const totalUnpaid = sum(list.filter((i) => i.payment_status !== "paid"));

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
      <PageHead
        title="Faturalar"
        sub="Kestiğin ve aldığın faturalar"
        action={
          <button className="btn btn-primary btn-sm" onClick={openNew}>
            + Fatura Oluştur
          </button>
        }
      />

      {list.length === 0 ? (
        <div className="panel-empty">Henüz fatura yok. Sağ üstten ilk faturanı oluştur.</div>
      ) : (
        <>
          <div className="total-banner">
            <div className="t-item">
              <div className="t-label">Toplam Satış</div>
              <div className="t-value">{formatCurrency(totalSales, currency)}</div>
            </div>
            <div className="t-item">
              <div className="t-label">Toplam Alış</div>
              <div className="t-value" style={{ color: "var(--danger)" }}>
                {formatCurrency(totalPurchase, currency)}
              </div>
            </div>
            <div className="t-item">
              <div className="t-label">Ödenmemiş</div>
              <div className="t-value" style={{ color: "var(--warning)" }}>
                {formatCurrency(totalUnpaid, currency)}
              </div>
            </div>
          </div>

          <div className="tx-list">
            {list.map((inv) => {
            const isIncome = inv.type === "income";
            const isPaid = inv.payment_status === "paid";
            return (
              <div key={inv.id} className="tx-row">
                <div className="tx-main">
                  <span
                    className="tx-dot"
                    style={{ background: isIncome ? "var(--teal)" : "var(--danger)" }}
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
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </>
      )}

      {open && (
        <Modal title="Fatura Oluştur" onClose={() => setOpen(false)} busy={saving}>
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

            <Field label="Müşteri / Firma">
              <input
                type="text"
                placeholder="ör. ABC Ltd. Şti."
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                autoFocus
              />
            </Field>

            <div className="form-row">
              <Field label="Tutar (KDV hariç)">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                />
              </Field>
              <Field label="KDV %">
                <input
                  type="text"
                  inputMode="decimal"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field label="Fatura Tarihi">
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </Field>
              <Field label="Ödeme Durumu">
                <select
                  value={paid ? "paid" : "unpaid"}
                  onChange={(e) => setPaid(e.target.value === "paid")}
                >
                  <option value="unpaid">Ödenmedi</option>
                  <option value="paid">Ödendi</option>
                </select>
              </Field>
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
        </Modal>
      )}
    </>
  );
}
