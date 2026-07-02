"use client";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { createClient } from "../../../lib/supabase/client";
import { showToast } from "../../components/toast";
import { formatCurrency, formatDate, parseAmount } from "../../../lib/format";
import { todayStr, advanceDate } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { EditIcon, TrashIcon } from "../../../components/icons";

export type RecurringInvoice = {
  id: string;
  customer_name: string;
  description: string;
  amount: string | null;
  vat_rate: number | null;
  period: string; // monthly / quarterly / yearly
  is_active: boolean;
  next_date: string | null;
  last_generated: string | null;
};

const PERIODS = [
  { id: "monthly", label: "Aylık" },
  { id: "quarterly", label: "3 Aylık" },
  { id: "yearly", label: "Yıllık" },
];
const periodLabel = (p: string) => PERIODS.find((x) => x.id === p)?.label ?? p;

function advance(dateStr: string, period: string) {
  return advanceDate(dateStr, period); // UTC-güvenli + ay taşması kısılır
}

export default function DuzenliFaturaClient({
  profileId,
  currency,
  invoicePrefix,
  items: initial,
}: {
  profileId: string;
  currency: string;
  invoicePrefix: string;
  items: RecurringInvoice[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<RecurringInvoice[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringInvoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [genId, setGenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [customer, setCustomer] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("20");
  const [period, setPeriod] = useState("monthly");
  const [nextDate, setNextDate] = useState(todayStr());

  function openNew() {
    setEditing(null);
    setCustomer("");
    setDescription("");
    setAmount("");
    setVatRate("20");
    setPeriod("monthly");
    setNextDate(todayStr());
    setError(null);
    setOpen(true);
  }

  function openEdit(r: RecurringInvoice) {
    setEditing(r);
    setCustomer(r.customer_name);
    setDescription(r.description);
    setAmount(r.amount != null ? String(r.amount) : "");
    setVatRate(r.vat_rate != null ? String(r.vat_rate) : "20");
    setPeriod(r.period);
    setNextDate(r.next_date ?? todayStr());
    setError(null);
    setOpen(true);
  }

  const submitLock = useSubmitLock();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customer.trim()) {
      setError("Müşteri adı gerekli.");
      return;
    }
    if (!description.trim()) {
      setError("Açıklama gerekli.");
      return;
    }
    const amt = parseAmount(amount) || 0;
    if (amt <= 0) {
      setError("Geçerli bir tutar gir.");
      return;
    }
    const payload = {
      customer_name: customer.trim(),
      description: description.trim(),
      amount: amt,
      vat_rate: Math.round(parseAmount(vatRate) || 0),
      period,
      next_date: nextDate,
    };
    const cols =
      "id, customer_name, description, amount, vat_rate, period, is_active, next_date, last_generated";

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("recurring_invoices")
          .update(payload)
          .eq("id", editing.id)
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => prev.map((x) => (x.id === editing.id ? (data as RecurringInvoice) : x)));
      } else {
        const { data, error } = await supabase
          .from("recurring_invoices")
          .insert({ ...payload, profile_id: profileId, is_active: true })
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => [data as RecurringInvoice, ...prev]);
      }
      setOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
  }

  async function toggleActive(r: RecurringInvoice) {
    const { error } = await supabase
      .from("recurring_invoices")
      .update({ is_active: !r.is_active })
      .eq("id", r.id);
    if (error) return;
    setList((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: !r.is_active } : x)));
  }

  const genLock = useSubmitLock();

  // "Şimdi Oluştur": bu dönem için GERÇEK fatura üretir (mobil generateInvoiceFromTemplate
  // ile aynı: atomik numara + invoice_items + transactions/ciro senkronu), sonra next_date'i
  // ilerletir. Eskiden yalnız tarihi atlıyordu (fatura/gelir üretmeden) → mobil dashboard
  // açılışında aynı dönemleri geri-doldurup çift kayıt/atlama yaratıyordu. Artık üretiyor.
  async function generateNow(r: RecurringInvoice) {
    if (!r.next_date) return;
    if (!genLock.acquire()) return;
    setGenId(r.id);
    try {
      const amt = Number(r.amount) || 0;
      const rate = Number(r.vat_rate) || 0;
      const vat = (amt * rate) / 100;
      const total = amt + vat;
      const invoiceDate = r.next_date;

      const { data: nextNum, error: rpcErr } = await supabase.rpc(
        "get_next_invoice_number",
        { p_profile_id: profileId }
      );
      if (rpcErr) throw rpcErr;
      const number = `${invoicePrefix}-${String(nextNum).padStart(6, "0")}`;
      const title = `${number} - ${r.customer_name}`;
      const due = new Date(invoiceDate + "T00:00:00Z");
      due.setUTCDate(due.getUTCDate() + 30);
      const dueDate = due.toISOString().slice(0, 10);

      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          user_id: profileId,
          invoice_number: number,
          title,
          customer_name: r.customer_name,
          subtotal: amt,
          vat_rate: rate,
          vat_amount: vat,
          amount: total,
          currency,
          type: "income",
          status: "sent",
          payment_status: "unpaid",
          paid_amount: 0,
          invoice_date: invoiceDate,
          due_date: dueDate,
        })
        .select("id")
        .single();
      if (invErr) throw invErr;

      await supabase.from("invoice_items").insert({
        invoice_id: (inv as { id: string }).id,
        description: r.description || r.customer_name || "Fatura",
        quantity: 1,
        unit: "adet",
        unit_price: amt,
        vat_rate: rate,
        total: amt,
      });
      await supabase.from("transactions").insert({
        user_id: profileId,
        invoice_id: (inv as { id: string }).id,
        title,
        amount: total,
        type: "income",
        category: "Fatura",
        note: r.description || null,
        date: invoiceDate,
        currency,
        source: "web",
      });

      // Üretim başarılı → ilerlet (bu dönem tekrar üretilmesin)
      const next = advance(r.next_date, r.period);
      const stamp = todayStr();
      const { error: upErr } = await supabase
        .from("recurring_invoices")
        .update({ next_date: next, last_generated: stamp })
        .eq("id", r.id);
      if (upErr) throw upErr;
      setList((prev) =>
        prev.map((x) =>
          x.id === r.id ? { ...x, next_date: next, last_generated: stamp } : x
        )
      );
      showToast({ title: "Fatura oluşturuldu", message: `${number} kesildi.`, variant: "success" });
    } catch {
      showToast({ title: "Oluşturulamadı", message: "Fatura üretilemedi, tekrar dene.", variant: "error" });
    } finally {
      setGenId(null);
      genLock.release();
    }
  }

  async function handleDelete(r: RecurringInvoice) {
    if (!(await confirmDialog({ message: `"${r.customer_name}" düzenli faturası silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("recurring_invoices").delete().eq("id", r.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== r.id));
  }

  const today = todayStr();

  return (
    <>
      <PageHead
        title="Düzenli Fatura"
        sub="Periyodik olarak tekrar eden faturalar"
        action={
          <AddButton onClick={openNew}>Düzenli Fatura</AddButton>
        }
      />

      {list.length === 0 ? (
        <div className="panel-empty">Henüz düzenli fatura yok. Sağ üstten ekle.</div>
      ) : (
        <div className="tx-list">
          {list.map((r) => {
            const amt = Number(r.amount) || 0;
            const withVat = amt * (1 + (Number(r.vat_rate) || 0) / 100);
            const due = r.is_active && r.next_date && r.next_date <= today;
            return (
              <div key={r.id} className={`tx-row${!r.is_active ? " row-muted" : ""}`}>
                <div className="tx-main">
                  <span className="tx-dot" style={{ background: "var(--teal)" }} />
                  <div className="tx-left">
                    <span className="tx-title">{r.customer_name}</span>
                    <span className="tx-meta">
                      {[
                        r.description,
                        periodLabel(r.period),
                        r.next_date ? `Sonraki: ${formatDate(r.next_date)}` : null,
                        !r.is_active ? "Pasif" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {due && <span className="badge amber low-badge">Zamanı geldi</span>}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  <span className="tx-amount">{formatCurrency(withVat, currency)}</span>
                  {r.is_active && r.next_date && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => generateNow(r)}
                      disabled={genId === r.id}
                      title="Bu dönem için faturayı şimdi oluştur ve sonraki tarihe ilerlet"
                    >
                      {genId === r.id ? "Oluşturuluyor…" : "Şimdi Oluştur"}
                    </button>
                  )}
                  <button
                    className="icon-btn"
                    onClick={() => toggleActive(r)}
                    title={r.is_active ? "Duraklat" : "Aktifleştir"}
                    aria-label="Aktif/Pasif"
                  >
                    {r.is_active ? "⏸" : "▶"}
                  </button>
                  <button className="icon-btn" onClick={() => openEdit(r)} aria-label="Düzenle">
                    <EditIcon />
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => handleDelete(r)}
                    aria-label="Sil"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <Modal
          title={editing ? "Düzenli Faturayı Düzenle" : "Düzenli Fatura Ekle"}
          onClose={() => setOpen(false)}
          busy={saving}
        >
          <form onSubmit={handleSave}>
            {error && <div className="form-error">{error}</div>}

            <Field label="Müşteri">
              <input
                type="text"
                placeholder="ör. ABC Ltd."
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Açıklama">
              <input
                type="text"
                placeholder="ör. Aylık bakım hizmeti"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <div className="form-row">
              <Field label="Tutar (KDV hariç)">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
              <Field label="Periyot">
                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {PERIODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sonraki Tarih">
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                />
              </Field>
            </div>

            <SaveButton busy={saving} disabled={saving} style={{ marginTop: 4 }}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </SaveButton>
          </form>
        </Modal>
      )}
    </>
  );
}
