"use client";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { TrashIcon } from "../../../components/icons";

export type EmployeeRef = { id: string; name: string };
export type Expense = {
  id: string;
  employee_id: string;
  title: string | null;
  amount: string | null;
  date: string | null;
};

export default function HarcamalarClient({
  currency,
  employees,
  expenses: initial,
}: {
  currency: string;
  employees: EmployeeRef[];
  expenses: Expense[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [list, setList] = useState<Expense[]>(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";
  const total = list.reduce((s, x) => s + (Number(x.amount) || 0), 0);

  function openNew() {
    setEmployeeId(employees[0]?.id ?? "");
    setTitle("");
    setAmount("");
    setDate(todayStr());
    setError(null);
    setOpen(true);
  }

  const submitLock = useSubmitLock();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!employeeId) {
      setError("Çalışan seç.");
      return;
    }
    if (!title.trim()) {
      setError("Harcama başlığı gerekli.");
      return;
    }
    const amt = Number(amount.replace(",", ".")) || 0;
    if (amt <= 0) {
      setError("Geçerli bir tutar gir.");
      return;
    }
    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("employee_expenses")
        .insert({
          employee_id: employeeId,
          title: title.trim(),
          amount: amt,
          date,
        })
        .select("id, employee_id, title, amount, date")
        .single();
      if (error) throw error;
      setList((prev) => [data as Expense, ...prev]);
      setOpen(false);
      // Sunucu verisini + istemci önbelleğini tazele → başka sayfaya gidip dönünce bayat veri görünmez.
      router.refresh();
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
  }

  async function handleDelete(x: Expense) {
    if (!(await confirmDialog({ message: "Bu harcama kaydı silinsin mi?", danger: true }))) return;
    const { error } = await supabase.from("employee_expenses").delete().eq("id", x.id);
    if (error) return;
    setList((prev) => prev.filter((e) => e.id !== x.id));
    router.refresh();
  }

  if (employees.length === 0) {
    return (
      <>
        <PageHead title="Harcama Kayıtları" sub="Çalışan harcamaları" />
        <div className="panel-empty">
          Önce <Link href="/panel/calisanlar" className="link-teal">çalışan ekle</Link>, sonra
          harcama girebilirsin.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Harcama Kayıtları"
        sub="Çalışan harcamaları"
        action={
          <AddButton onClick={openNew}>Harcama Ekle</AddButton>
        }
      />

      <div className="total-banner">
        <div className="t-item">
          <div className="t-label">Toplam Harcama</div>
          <div className="t-value" style={{ color: "var(--danger)" }}>
            {formatCurrency(total, currency)}
          </div>
        </div>
        <div className="t-item">
          <div className="t-label">Kayıt</div>
          <div className="t-value">{list.length}</div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="panel-empty">Henüz harcama kaydı yok.</div>
      ) : (
        <div className="tx-list">
          {list.map((x) => (
            <div key={x.id} className="tx-row">
              <div className="tx-main">
                <span className="tx-dot" style={{ background: "var(--danger)" }} />
                <div className="tx-left">
                  <span className="tx-title">{x.title || "—"}</span>
                  <span className="tx-meta">
                    {[nameOf(x.employee_id), x.date ? formatDate(x.date) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              </div>
              <div className="tx-right">
                <span className="tx-amount" style={{ color: "var(--danger)" }}>
                  −{formatCurrency(Number(x.amount) || 0, currency)}
                </span>
                <button className="tx-delete" onClick={() => handleDelete(x)} aria-label="Sil">
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title="Harcama Ekle" onClose={() => setOpen(false)} busy={saving}>
          <form onSubmit={handleSave}>
            {error && <div className="form-error">{error}</div>}

            <Field label="Çalışan">
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Harcama Başlığı">
              <input
                type="text"
                placeholder="ör. Yol / yemek"
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
              <Field label="Tarih">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
