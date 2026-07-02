"use client";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { TrashIcon } from "../../../components/icons";

export type CreditCustomer = {
  id: string;
  customer_name: string;
  phone: string | null;
  total_debt: string | null;
};

export default function VeresiyeClient({
  profileId,
  currency,
  customers: initial,
}: {
  profileId: string;
  currency: string;
  customers: CreditCustomer[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<CreditCustomer[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Yeni müşteri modalı
  const [custOpen, setCustOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Hareket modalı
  const [moveOpen, setMoveOpen] = useState(false);
  const [target, setTarget] = useState<CreditCustomer | null>(null);
  const [entryType, setEntryType] = useState<"debt" | "payment">("debt");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayStr());

  const totalDebt = list.reduce((s, c) => s + (Number(c.total_debt) || 0), 0);
  const num = (s: string) => Number(s.replace(",", ".")) || 0;

  function openNewCustomer() {
    setName("");
    setPhone("");
    setError(null);
    setCustOpen(true);
  }

  const submitLock = useSubmitLock();

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Müşteri adı gerekli.");
      return;
    }
    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("credit_book")
        .insert({
          user_id: profileId,
          customer_name: name.trim(),
          phone: phone.trim() || null,
          total_debt: 0,
        })
        .select("id, customer_name, phone, total_debt")
        .single();
      if (error) throw error;
      setList((prev) => [data as CreditCustomer, ...prev]);
      setCustOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
  }

  function openMove(c: CreditCustomer) {
    setTarget(c);
    setEntryType("debt");
    setAmount("");
    setDesc("");
    setDate(todayStr());
    setError(null);
    setMoveOpen(true);
  }

  async function saveMove(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setError(null);
    const amt = num(amount);
    if (amt <= 0) {
      setError("Geçerli bir tutar gir.");
      return;
    }
    const newTotal =
      (Number(target.total_debt) || 0) + (entryType === "debt" ? amt : -amt);

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      const { error: entryErr } = await supabase.from("credit_book_entries").insert({
        credit_book_id: target.id,
        type: entryType,
        amount: amt,
        description: desc.trim() || null,
        date,
      });
      if (entryErr) throw entryErr;

      const { error: updErr } = await supabase
        .from("credit_book")
        .update({ total_debt: newTotal })
        .eq("id", target.id);
      if (updErr) throw updErr;

      setList((prev) =>
        prev.map((c) => (c.id === target.id ? { ...c, total_debt: String(newTotal) } : c))
      );
      setMoveOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
  }

  async function handleDelete(c: CreditCustomer) {
    if (!(await confirmDialog({ message: `"${c.customer_name}" ve hareketleri silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("credit_book").delete().eq("id", c.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== c.id));
  }

  return (
    <>
      <PageHead
        title="Veresiye Defteri"
        sub="Müşteri veresiye ve ödemeleri"
        action={
          <AddButton onClick={openNewCustomer}>Müşteri Ekle</AddButton>
        }
      />

      {list.length > 0 && (
        <div className="total-banner">
          <div className="t-item">
            <div className="t-label">Toplam Veresiye Alacağı</div>
            <div className="t-value" style={{ color: totalDebt > 0 ? "var(--warning)" : undefined }}>
              {formatCurrency(totalDebt, currency)}
            </div>
          </div>
          <div className="t-item">
            <div className="t-label">Müşteri</div>
            <div className="t-value">{list.length}</div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="panel-empty">Henüz veresiye müşterisi yok. Sağ üstten ekle.</div>
      ) : (
        <div className="tx-list">
          {list.map((c) => {
            const debt = Number(c.total_debt) || 0;
            return (
              <div key={c.id} className="tx-row">
                <div className="tx-main">
                  <span className="avatar-chip">{c.customer_name.charAt(0).toUpperCase()}</span>
                  <div className="tx-left">
                    <span className="tx-title">{c.customer_name}</span>
                    <span className="tx-meta">{c.phone || "—"}</span>
                  </div>
                </div>
                <div className="tx-right">
                  <span
                    className="tx-amount"
                    style={{ color: debt > 0 ? "var(--warning)" : "var(--teal)" }}
                  >
                    {formatCurrency(debt, currency)}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => openMove(c)}>
                    Hareket
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => handleDelete(c)}
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

      {custOpen && (
        <Modal title="Veresiye Müşterisi" onClose={() => setCustOpen(false)} busy={saving}>
          <form onSubmit={saveCustomer}>
            {error && <div className="form-error">{error}</div>}
            <Field label="Müşteri Adı">
              <input
                type="text"
                placeholder="ör. Mahalleli Ahmet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Telefon (ops.)">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <SaveButton busy={saving} disabled={saving} style={{ marginTop: 4 }}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </SaveButton>
          </form>
        </Modal>
      )}

      {moveOpen && target && (
        <Modal
          title={`Hareket · ${target.customer_name}`}
          onClose={() => setMoveOpen(false)}
          busy={saving}
        >
          <form onSubmit={saveMove}>
            <div className="type-toggle">
              <button
                type="button"
                className={entryType === "debt" ? "on-expense" : ""}
                onClick={() => setEntryType("debt")}
              >
                Veresiye (borç +)
              </button>
              <button
                type="button"
                className={entryType === "payment" ? "on-income" : ""}
                onClick={() => setEntryType("payment")}
              >
                Ödeme (borç −)
              </button>
            </div>

            <div className="form-hint">
              Mevcut borç: <strong>{formatCurrency(Number(target.total_debt) || 0, currency)}</strong>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-row">
              <Field label="Tutar">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Tarih">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>

            <Field label="Açıklama (ops.)">
              <input
                type="text"
                placeholder="ör. 2 ekmek 1 süt"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </Field>

            <SaveButton busy={saving} disabled={saving} style={{ marginTop: 4 }}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </SaveButton>
          </form>
        </Modal>
      )}
    </>
  );
}
