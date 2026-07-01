"use client";
import { confirmDialog } from "../../components/confirm";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { TrashIcon } from "../../../components/icons";
import { X, Search, Download, Check } from "lucide-react";

export type Invoice = {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  subtotal: string | null;
  vat_rate: number | null;
  vat_amount: string | null;
  amount: string | null;
  currency: string | null;
  payment_status: string | null;
  status: string | null;
  paid_amount: string | null;
  type: string | null;
  invoice_date: string | null;
  created_at: string | null;
};

// Vade tarihi kolonu yok (mobil şema) → "vadesi geçti" fatura tarihinden türetilir.
const OVERDUE_DAYS = 30;

type StatusKey = "draft" | "sent" | "paid" | "overdue";

const STATUS_META: Record<StatusKey, { label: string; badge: string }> = {
  draft: { label: "Taslak", badge: "gray" },
  sent: { label: "Gönderildi", badge: "blue" },
  paid: { label: "Ödendi", badge: "green" },
  overdue: { label: "Vadesi geçti", badge: "red" },
};

function invStatus(inv: Invoice): StatusKey {
  if (inv.payment_status === "paid") return "paid";
  if ((inv.status ?? "sent") === "draft") return "draft";
  if (inv.invoice_date) {
    const due = new Date(inv.invoice_date);
    due.setDate(due.getDate() + OVERDUE_DAYS);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return "overdue";
  }
  return "sent";
}

export default function FaturalarClient({
  profileId,
  currency,
  invoicePrefix,
  invoiceNextNumber,
  invoices: initial,
  initialFilter,
}: {
  profileId: string;
  currency: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  invoices: Invoice[];
  initialFilter: "all" | "income" | "expense";
}) {
  const supabase = createClient();
  const [list, setList] = useState<Invoice[]>(initial);
  // Tür filtresi (Tümü / Satış / Alış) — derin-link ?type= ile başlar
  const [listFilter, setListFilter] = useState(initialFilter);
  useEffect(() => setListFilter(initialFilter), [initialFilter]);
  // Durum filtresi (Tümü / Taslak / Gönderildi / Ödendi / Vadesi geçti)
  const [statusFilter, setStatusFilter] = useState<"all" | StatusKey>("all");
  // Arama + tarih aralığı
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [nextNumber, setNextNumber] = useState(invoiceNextNumber);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Invoice | null>(null); // sağ detay paneli
  const [busyId, setBusyId] = useState<string | null>(null); // ödendi işaretleme

  // Form
  const [type, setType] = useState<"income" | "expense">("income");
  const [customer, setCustomer] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [vatRate, setVatRate] = useState("20");
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [paid, setPaid] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  function openNew() {
    setType(listFilter === "expense" ? "expense" : "income");
    setCustomer("");
    setSubtotal("");
    setVatRate("20");
    setInvoiceDate(todayStr());
    setPaid(false);
    setIsDraft(false);
    setError(null);
    setOpen(true);
  }

  // Özet (yüklü faturalar üzerinden)
  const sum = (rows: Invoice[]) =>
    rows.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalSales = sum(list.filter((i) => i.type === "income"));
  const totalPurchase = sum(list.filter((i) => i.type === "expense"));
  const totalUnpaid = sum(list.filter((i) => i.payment_status !== "paid"));

  // Filtreler: tür → durum → arama → tarih aralığı
  const q = query.trim().toLocaleLowerCase("tr");
  const filtered = list.filter((i) => {
    if (listFilter !== "all" && i.type !== listFilter) return false;
    if (statusFilter !== "all" && invStatus(i) !== statusFilter) return false;
    if (q) {
      const hay = `${i.customer_name ?? ""} ${i.invoice_number ?? ""}`.toLocaleLowerCase("tr");
      if (!hay.includes(q)) return false;
    }
    if (dateFrom && (i.invoice_date ?? "") < dateFrom) return false;
    if (dateTo && (i.invoice_date ?? "") > dateTo) return false;
    return true;
  });

  const head =
    listFilter === "income"
      ? { title: "Satış Faturaları", sub: "Kestiğin faturalar" }
      : listFilter === "expense"
      ? { title: "Alış Faturaları", sub: "Aldığın faturalar" }
      : { title: "Faturalar", sub: "Kestiğin ve aldığın faturalar" };

  // Durum çipleri (mevcut listede geçen sayıya göre)
  const scopeForStatus = list.filter(
    (i) => listFilter === "all" || i.type === listFilter
  );
  const statusCount = (k: "all" | StatusKey) =>
    k === "all" ? scopeForStatus.length : scopeForStatus.filter((i) => invStatus(i) === k).length;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sub = Number(subtotal.replace(",", ".")) || 0;
    if (!customer.trim()) {
      setError(type === "expense" ? "Tedarikçi/firma adı gerekli." : "Müşteri/firma adı gerekli.");
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
          status: isDraft ? "draft" : "sent",
          payment_status: paid ? "paid" : "unpaid",
          paid_amount: paid ? total : 0,
          invoice_date: invoiceDate,
        })
        .select(
          "id, invoice_number, customer_name, subtotal, vat_rate, vat_amount, amount, currency, payment_status, status, paid_amount, type, invoice_date, created_at"
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

  async function markPaid(inv: Invoice) {
    setBusyId(inv.id);
    const total = Number(inv.amount) || 0;
    const { error } = await supabase
      .from("invoices")
      .update({ payment_status: "paid", paid_amount: total })
      .eq("id", inv.id);
    setBusyId(null);
    if (error) return;
    const upd = { ...inv, payment_status: "paid", paid_amount: String(total) };
    setList((prev) => prev.map((x) => (x.id === inv.id ? upd : x)));
    setSelected((s) => (s && s.id === inv.id ? upd : s));
  }

  async function handleDelete(inv: Invoice) {
    if (!(await confirmDialog({ message: `${inv.invoice_number ?? "Fatura"} silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== inv.id));
    setSelected((s) => (s && s.id === inv.id ? null : s));
  }

  function exportCsv() {
    const rows = [
      ["No", "Tür", "Müşteri/Firma", "Tarih", "Durum", "KDV Hariç", "KDV", "Toplam", "Para"],
      ...filtered.map((i) => [
        i.invoice_number ?? "",
        i.type === "income" ? "Satış" : "Alış",
        i.customer_name ?? "",
        i.invoice_date ? formatDate(i.invoice_date) : "",
        STATUS_META[invStatus(i)].label,
        String(i.subtotal ?? ""),
        String(i.vat_amount ?? ""),
        String(i.amount ?? ""),
        i.currency ?? currency,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturalar-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const STATUS_CHIPS: ("all" | StatusKey)[] = ["all", "draft", "sent", "overdue", "paid"];

  return (
    <>
      <PageHead
        title={head.title}
        sub={head.sub}
        action={<AddButton onClick={openNew}>Fatura Oluştur</AddButton>}
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

          {/* Tür sekmeleri */}
          <div className="chip-seg" style={{ marginBottom: 10 }}>
            <button
              className={listFilter === "all" ? "active" : ""}
              onClick={() => setListFilter("all")}
            >
              Tümü
            </button>
            <button
              className={listFilter === "income" ? "active on-income" : ""}
              onClick={() => setListFilter("income")}
            >
              Satış
            </button>
            <button
              className={listFilter === "expense" ? "active on-expense" : ""}
              onClick={() => setListFilter("expense")}
            >
              Alış
            </button>
          </div>

          {/* Araç çubuğu: durum çipleri + arama + tarih + CSV */}
          <div className="inv-toolbar">
            <div className="chip-seg inv-status">
              {STATUS_CHIPS.map((k) => (
                <button
                  key={k}
                  className={statusFilter === k ? "active" : ""}
                  onClick={() => setStatusFilter(k)}
                >
                  {k === "all" ? "Tümü" : STATUS_META[k].label}
                  <span className="chip-count">{statusCount(k)}</span>
                </button>
              ))}
            </div>

            <div className="inv-tools">
              <label className="inv-search">
                <Search size={15} />
                <input
                  type="search"
                  placeholder="Müşteri veya no ara…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="inv-dates">
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="Başlangıç tarihi"
                />
                <span className="inv-dash">–</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="Bitiş tarihi"
                />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={filtered.length === 0}>
                <Download size={15} /> CSV
              </button>
            </div>
          </div>

          <div className={`tx-area${selected ? " shifted" : ""}`}>
            {filtered.length === 0 ? (
              <div className="panel-empty">Bu filtrede fatura yok.</div>
            ) : (
              <div className="tx-list">
                {filtered.map((inv) => {
                  const isIncome = inv.type === "income";
                  const st = invStatus(inv);
                  const meta = STATUS_META[st];
                  return (
                    <div
                      key={inv.id}
                      className={`tx-row clickable${selected?.id === inv.id ? " active" : ""}`}
                      onClick={() => setSelected(inv)}
                    >
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
                        <span className={`badge ${meta.badge}`}>{meta.label}</span>
                        <span className="tx-amount">
                          {formatCurrency(Number(inv.amount) || 0, inv.currency || currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Sağ detay çekmecesi */}
      {selected &&
        (() => {
          const inv = selected;
          const isIncome = inv.type === "income";
          const st = invStatus(inv);
          const meta = STATUS_META[st];
          const cls = isIncome ? "pos" : "neg";
          const sub = Number(inv.subtotal) || 0;
          const vat = Number(inv.vat_amount) || 0;
          return (
            <aside className="tx-drawer">
              <div className="drawer-head">
                <span className="drawer-title">Fatura Detayı</span>
                <button className="anim-act cls" onClick={() => setSelected(null)} aria-label="Kapat">
                  <X size={18} />
                </button>
              </div>

              <div className="drawer-amount">
                <span className={`tx-amount ${cls}`}>
                  {formatCurrency(Number(inv.amount) || 0, inv.currency || currency)}
                </span>
                <span className={`drawer-type ${cls}`}>{isIncome ? "Satış" : "Alış"}</span>
              </div>
              <div className="drawer-name">{inv.customer_name || "—"}</div>

              <div className="drawer-rows">
                <div className="drawer-row">
                  <span className="dr-k">Fatura No</span>
                  <span className="dr-v">{inv.invoice_number || "—"}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Durum</span>
                  <span className="dr-v">
                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  </span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Tarih</span>
                  <span className="dr-v">{inv.invoice_date ? formatDate(inv.invoice_date) : "—"}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">KDV Hariç</span>
                  <span className="dr-v">{formatCurrency(sub, inv.currency || currency)}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">KDV {inv.vat_rate != null ? `(%${inv.vat_rate})` : ""}</span>
                  <span className="dr-v">{formatCurrency(vat, inv.currency || currency)}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Toplam</span>
                  <span className="dr-v">{formatCurrency(Number(inv.amount) || 0, inv.currency || currency)}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Ödeme</span>
                  <span className="dr-v">
                    <span className={`badge ${inv.payment_status === "paid" ? "green" : "amber"}`}>
                      {inv.payment_status === "paid" ? "Ödendi" : "Ödenmedi"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="drawer-actions">
                {inv.payment_status !== "paid" && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => markPaid(inv)}
                    disabled={busyId === inv.id}
                  >
                    <Check size={15} /> {busyId === inv.id ? "İşleniyor…" : "Ödendi işaretle"}
                  </button>
                )}
                <button className="btn btn-danger" onClick={() => handleDelete(inv)}>
                  <TrashIcon /> Sil
                </button>
              </div>
            </aside>
          );
        })()}

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

            <Field label={type === "expense" ? "Tedarikçi / Firma" : "Müşteri / Firma"}>
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

            <label className="inv-draft">
              <input
                type="checkbox"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
              />
              Taslak olarak kaydet (henüz gönderilmedi)
            </label>

            <SaveButton busy={saving} disabled={saving} style={{ marginTop: 4 }}>
              {saving ? "Kaydediliyor…" : "Faturayı Kaydet"}
            </SaveButton>
          </form>
        </Modal>
      )}
    </>
  );
}
