"use client";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { TrashIcon } from "../../../components/icons";

export type Debt = {
  id: string;
  person_name: string;
  amount: string | null;
  type: string; // debt = borcum / credit = alacağım
  note: string | null;
  is_paid: boolean;
};

export default function BorcAlacakClient({
  profileId,
  currency,
  items: initial,
}: {
  profileId: string;
  currency: string;
  items: Debt[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Debt[]>(initial);
  const [filter, setFilter] = useState<"all" | "debt" | "credit">("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"debt" | "credit">("debt");
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const sum = (rows: Debt[]) => rows.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalDebt = sum(list.filter((x) => x.type === "debt" && !x.is_paid));
  const totalCredit = sum(list.filter((x) => x.type === "credit" && !x.is_paid));
  const filtered = filter === "all" ? list : list.filter((x) => x.type === filter);

  function openNew() {
    setType(filter === "credit" ? "credit" : "debt");
    setPerson("");
    setAmount("");
    setNote("");
    setError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!person.trim()) {
      setError("Kişi/firma adı gerekli.");
      return;
    }
    const amt = Number(amount.replace(",", ".")) || 0;
    if (amt <= 0) {
      setError("Geçerli bir tutar gir.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("debts")
        .insert({
          user_id: profileId,
          person_name: person.trim(),
          amount: amt,
          type,
          note: note.trim() || null,
          is_paid: false,
        })
        .select("id, person_name, amount, type, note, is_paid")
        .single();
      if (error) throw error;
      setList((prev) => [data as Debt, ...prev]);
      setOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePaid(x: Debt) {
    const { error } = await supabase
      .from("debts")
      .update({ is_paid: !x.is_paid })
      .eq("id", x.id);
    if (error) return;
    setList((prev) => prev.map((d) => (d.id === x.id ? { ...d, is_paid: !x.is_paid } : d)));
  }

  async function handleDelete(x: Debt) {
    if (!(await confirmDialog({ message: "Bu kayıt silinsin mi?", danger: true }))) return;
    const { error } = await supabase.from("debts").delete().eq("id", x.id);
    if (error) return;
    setList((prev) => prev.filter((d) => d.id !== x.id));
  }

  return (
    <>
      <PageHead
        title="Borç / Alacak"
        sub="Kime borçlusun, kim sana borçlu"
        action={
          <button className="btn btn-primary btn-sm" onClick={openNew}>
            + Kayıt Ekle
          </button>
        }
      />

      <div className="total-banner">
        <div className="t-item">
          <div className="t-label">Toplam Borç</div>
          <div className="t-value" style={{ color: "var(--danger)" }}>
            {formatCurrency(totalDebt, currency)}
          </div>
        </div>
        <div className="t-item">
          <div className="t-label">Toplam Alacak</div>
          <div className="t-value">{formatCurrency(totalCredit, currency)}</div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="panel-empty">Henüz kayıt yok. Sağ üstten borç/alacak ekle.</div>
      ) : (
        <>
          <div className="chip-seg" style={{ marginBottom: 14 }}>
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
              Tümü
            </button>
            <button
              className={filter === "debt" ? "active on-expense" : ""}
              onClick={() => setFilter("debt")}
            >
              Borçlarım
            </button>
            <button
              className={filter === "credit" ? "active on-income" : ""}
              onClick={() => setFilter("credit")}
            >
              Alacaklarım
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="panel-empty">Bu filtrede kayıt yok.</div>
          ) : (
            <div className="tx-list">
              {filtered.map((x) => {
                const isDebt = x.type === "debt";
                return (
                  <div key={x.id} className={`tx-row${x.is_paid ? " row-muted" : ""}`}>
                    <div className="tx-main">
                      <span
                        className="tx-dot"
                        style={{ background: isDebt ? "var(--danger)" : "var(--teal)" }}
                      />
                      <div className="tx-left">
                        <span className="tx-title">{x.person_name}</span>
                        <span className="tx-meta">
                          {[isDebt ? "Borcum" : "Alacağım", x.is_paid ? "Kapandı" : null, x.note]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="tx-right">
                      <span
                        className="tx-amount"
                        style={{ color: isDebt ? "var(--danger)" : "var(--teal)" }}
                      >
                        {formatCurrency(Number(x.amount) || 0, currency)}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => togglePaid(x)}
                        title={x.is_paid ? "Açık olarak işaretle" : "Kapandı olarak işaretle"}
                      >
                        {x.is_paid ? "Geri Al" : "Kapat"}
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => handleDelete(x)}
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
        </>
      )}

      {open && (
        <Modal title="Borç / Alacak Ekle" onClose={() => setOpen(false)} busy={saving}>
          <form onSubmit={handleSave}>
            <div className="type-toggle">
              <button
                type="button"
                className={type === "debt" ? "on-expense" : ""}
                onClick={() => setType("debt")}
              >
                Borcum (vereceğim)
              </button>
              <button
                type="button"
                className={type === "credit" ? "on-income" : ""}
                onClick={() => setType("credit")}
              >
                Alacağım (alacağım)
              </button>
            </div>

            {error && <div className="form-error">{error}</div>}

            <Field label="Kişi / Firma">
              <input
                type="text"
                placeholder="ör. Ali Veli"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Tutar">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>

            <Field label="Not (ops.)">
              <input
                type="text"
                placeholder="ör. nakit verildi"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>

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
