"use client";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate, parseAmount } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { TrashIcon } from "../../../components/icons";

export type EmployeeRef = { id: string; name: string };
export type SalaryPayment = {
  id: string;
  employee_id: string;
  amount: string | null;
  period: string | null;
  note: string | null;
  date: string | null;
};

export default function MaaslarClient({
  currency,
  employees,
  payments: initial,
}: {
  currency: string;
  employees: EmployeeRef[];
  payments: SalaryPayment[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<SalaryPayment[]>(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";
  const total = list.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  function openNew() {
    setEmployeeId(employees[0]?.id ?? "");
    setAmount("");
    setPeriod("");
    setNote("");
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
    const amt = parseAmount(amount) || 0;
    if (amt <= 0) {
      setError("Geçerli bir tutar gir.");
      return;
    }
    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("salary_payments")
        .insert({
          employee_id: employeeId,
          amount: amt,
          period: period.trim() || null,
          note: note.trim() || null,
          date,
        })
        .select("id, employee_id, amount, period, note, date")
        .single();
      if (error) throw error;
      setList((prev) => [data as SalaryPayment, ...prev]);
      setOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
  }

  async function handleDelete(p: SalaryPayment) {
    if (!(await confirmDialog({ message: "Bu maaş ödemesi silinsin mi?", danger: true }))) return;
    const { error } = await supabase.from("salary_payments").delete().eq("id", p.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== p.id));
  }

  if (employees.length === 0) {
    return (
      <>
        <PageHead title="Maaş Ödemeleri" sub="Çalışan maaş kayıtları" />
        <div className="panel-empty">
          Önce <Link href="/panel/calisanlar" className="link-teal">çalışan ekle</Link>, sonra maaş
          ödemesi girebilirsin.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Maaş Ödemeleri"
        sub="Çalışan maaş kayıtları"
        action={
          <AddButton onClick={openNew}>Maaş Ödemesi</AddButton>
        }
      />

      <div className="total-banner">
        <div className="t-item">
          <div className="t-label">Toplam Ödenen</div>
          <div className="t-value">{formatCurrency(total, currency)}</div>
        </div>
        <div className="t-item">
          <div className="t-label">Kayıt</div>
          <div className="t-value">{list.length}</div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="panel-empty">Henüz maaş ödemesi yok.</div>
      ) : (
        <div className="tx-list">
          {list.map((p) => (
            <div key={p.id} className="tx-row">
              <div className="tx-main">
                <span className="tx-dot" style={{ background: "var(--teal)" }} />
                <div className="tx-left">
                  <span className="tx-title">{nameOf(p.employee_id)}</span>
                  <span className="tx-meta">
                    {[p.period, p.date ? formatDate(p.date) : null, p.note]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </div>
              </div>
              <div className="tx-right">
                <span className="tx-amount">
                  {formatCurrency(Number(p.amount) || 0, currency)}
                </span>
                <button
                  className="tx-delete"
                  onClick={() => handleDelete(p)}
                  aria-label="Sil"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title="Maaş Ödemesi" onClose={() => setOpen(false)} busy={saving}>
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
              <Field label="Dönem (ops.)">
                <input
                  type="text"
                  placeholder="ör. Haziran 2026"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field label="Ödeme Tarihi">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Not (ops.)">
                <input
                  type="text"
                  placeholder="ör. Avans dahil"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
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
