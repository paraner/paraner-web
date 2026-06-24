"use client";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import { CATEGORIES, INCOME_CATEGORIES } from "../../../lib/categories";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { EditIcon, TrashIcon } from "../../../components/icons";

export type Recurring = {
  id: string;
  title: string;
  amount: string | null;
  type: string; // expense / income
  category: string | null;
  currency: string;
  period: string; // weekly / monthly / yearly
  next_due_date: string;
  last_confirmed_date: string | null;
  is_active: boolean;
  note: string | null;
};

const PERIODS = [
  { id: "weekly", label: "Haftalık" },
  { id: "monthly", label: "Aylık" },
  { id: "yearly", label: "Yıllık" },
];
const periodLabel = (p: string) => PERIODS.find((x) => x.id === p)?.label ?? p;
const CURRENCIES = ["TRY", "USD", "EUR", "GBP"];

function advance(dateStr: string, period: string) {
  const d = new Date(dateStr);
  if (period === "weekly") d.setDate(d.getDate() + 7);
  else if (period === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function monthlyEq(r: Recurring) {
  const a = Number(r.amount) || 0;
  if (r.period === "weekly") return a * 4.33;
  if (r.period === "yearly") return a / 12;
  return a;
}

export default function DuzenliClient({
  profileId,
  currency,
  items: initial,
}: {
  profileId: string;
  currency: string;
  items: Recurring[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Recurring[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [cur, setCur] = useState(currency);
  const [period, setPeriod] = useState("monthly");
  const [nextDue, setNextDue] = useState(todayStr());
  const [note, setNote] = useState("");

  const cats = type === "income" ? INCOME_CATEGORIES : CATEGORIES;
  const activeMonthlyExpense = list
    .filter((r) => r.is_active && r.type === "expense")
    .reduce((s, r) => s + monthlyEq(r), 0);

  function openNew() {
    setEditing(null);
    setTitle("");
    setType("expense");
    setAmount("");
    setCategory("");
    setCur(currency);
    setPeriod("monthly");
    setNextDue(todayStr());
    setNote("");
    setError(null);
    setOpen(true);
  }

  function openEdit(r: Recurring) {
    setEditing(r);
    setTitle(r.title);
    setType(r.type === "income" ? "income" : "expense");
    setAmount(r.amount != null ? String(r.amount) : "");
    setCategory(r.category ?? "");
    setCur(r.currency ?? currency);
    setPeriod(r.period);
    setNextDue(r.next_due_date);
    setNote(r.note ?? "");
    setError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Başlık gerekli.");
      return;
    }
    const amt = Number(amount.replace(",", ".")) || 0;
    if (amt <= 0) {
      setError("Geçerli bir tutar gir.");
      return;
    }
    const payload = {
      title: title.trim(),
      amount: amt,
      type,
      category: category || null,
      currency: cur,
      period,
      next_due_date: nextDue,
      note: note.trim() || null,
    };
    const cols =
      "id, title, amount, type, category, currency, period, next_due_date, last_confirmed_date, is_active, note";

    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("recurring_payments")
          .update(payload)
          .eq("id", editing.id)
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => prev.map((x) => (x.id === editing.id ? (data as Recurring) : x)));
      } else {
        const { data, error } = await supabase
          .from("recurring_payments")
          .insert({ ...payload, user_id: profileId, is_active: true })
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => [data as Recurring, ...prev]);
      }
      setOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmPaid(r: Recurring) {
    const next = advance(r.next_due_date, r.period);
    const { error } = await supabase
      .from("recurring_payments")
      .update({ next_due_date: next, last_confirmed_date: todayStr() })
      .eq("id", r.id);
    if (error) return;
    setList((prev) =>
      prev.map((x) =>
        x.id === r.id ? { ...x, next_due_date: next, last_confirmed_date: todayStr() } : x
      )
    );
  }

  async function toggleActive(r: Recurring) {
    const { error } = await supabase
      .from("recurring_payments")
      .update({ is_active: !r.is_active })
      .eq("id", r.id);
    if (error) return;
    setList((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: !r.is_active } : x)));
  }

  async function handleDelete(r: Recurring) {
    if (!(await confirmDialog({ message: `"${r.title}" silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("recurring_payments").delete().eq("id", r.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== r.id));
  }

  const today = todayStr();

  return (
    <>
      <PageHead
        title="Düzenli Ödemeler"
        sub="Abonelik, kira, fatura gibi tekrar eden ödemeler"
        action={
          <button className="btn btn-primary btn-sm" onClick={openNew}>
            + Düzenli Ödeme
          </button>
        }
      />

      {list.length > 0 && (
        <div className="total-banner">
          <div className="t-item">
            <div className="t-label">Aylık Gider (tahmini)</div>
            <div className="t-value" style={{ color: "var(--danger)" }}>
              {formatCurrency(activeMonthlyExpense, currency)}
            </div>
          </div>
          <div className="t-item">
            <div className="t-label">Aktif Kayıt</div>
            <div className="t-value">{list.filter((r) => r.is_active).length}</div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="panel-empty">Henüz düzenli ödeme yok. Sağ üstten ekle.</div>
      ) : (
        <div className="tx-list">
          {list.map((r) => {
            const isIncome = r.type === "income";
            const overdue = r.is_active && r.next_due_date <= today;
            return (
              <div key={r.id} className={`tx-row${!r.is_active ? " row-muted" : ""}`}>
                <div className="tx-main">
                  <span
                    className="tx-dot"
                    style={{ background: isIncome ? "var(--teal)" : "var(--danger)" }}
                  />
                  <div className="tx-left">
                    <span className="tx-title">{r.title}</span>
                    <span className="tx-meta">
                      {[
                        periodLabel(r.period),
                        `Sonraki: ${formatDate(r.next_due_date)}`,
                        !r.is_active ? "Pasif" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {overdue && <span className="badge amber low-badge">Vadesi geldi</span>}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  <span
                    className="tx-amount"
                    style={{ color: isIncome ? "var(--teal)" : "var(--danger)" }}
                  >
                    {isIncome ? "+" : "−"}
                    {formatCurrency(Number(r.amount) || 0, r.currency)}
                  </span>
                  {r.is_active && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => confirmPaid(r)}
                      title="Ödendi olarak işaretle ve sonraki tarihe ilerlet"
                    >
                      Onayla
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
          title={editing ? "Düzenli Ödeme Düzenle" : "Düzenli Ödeme Ekle"}
          onClose={() => setOpen(false)}
          busy={saving}
        >
          <form onSubmit={handleSave}>
            <div className="type-toggle">
              <button
                type="button"
                className={type === "expense" ? "on-expense" : ""}
                onClick={() => {
                  setType("expense");
                  setCategory("");
                }}
              >
                Gider
              </button>
              <button
                type="button"
                className={type === "income" ? "on-income" : ""}
                onClick={() => {
                  setType("income");
                  setCategory("");
                }}
              >
                Gelir
              </button>
            </div>

            {error && <div className="form-error">{error}</div>}

            <Field label="Başlık">
              <input
                type="text"
                placeholder="ör. Netflix / Kira"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </Field>

            <div className="form-row">
              <Field label="Tutar">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field label="Para Birimi">
                <select value={cur} onChange={(e) => setCur(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="form-row">
              <Field label="Kategori">
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Seç…</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Periyot">
                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {PERIODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="form-row">
              <Field label="Sonraki Ödeme Tarihi">
                <input
                  type="date"
                  value={nextDue}
                  onChange={(e) => setNextDue(e.target.value)}
                />
              </Field>
              <Field label="Not (ops.)">
                <input
                  type="text"
                  placeholder="ör. otomatik ödeme"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={saving}
              style={{ marginTop: 4 }}
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
