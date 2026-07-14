"use client";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { TrashIcon } from "../../../components/icons";

export type EmployeeRef = { id: string; name: string };
export type Leave = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number | null;
  reason: string | null;
  status: string;
};

const LEAVE_TYPES = [
  { id: "annual", label: "Yıllık İzin" },
  { id: "sick", label: "Hastalık" },
  { id: "unpaid", label: "Ücretsiz" },
  { id: "maternity", label: "Doğum" },
  { id: "other", label: "Diğer" },
];
const typeLabel = (t: string) => LEAVE_TYPES.find((x) => x.id === t)?.label ?? t;

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Beklemede", cls: "amber" },
  approved: { label: "Onaylandı", cls: "green" },
  rejected: { label: "Reddedildi", cls: "red" },
};

function diffDays(start: string, end: string) {
  const d1 = new Date(start).getTime();
  const d2 = new Date(end).getTime();
  if (isNaN(d1) || isNaN(d2)) return 1;
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
}

export default function IzinlerClient({
  profileId,
  employees,
  leaves: initial,
}: {
  profileId: string;
  employees: EmployeeRef[];
  leaves: Leave[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [list, setList] = useState<Leave[]>(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("pending");

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";
  const pendingCount = list.filter((l) => l.status === "pending").length;

  function openNew() {
    setEmployeeId(employees[0]?.id ?? "");
    setLeaveType("annual");
    setStartDate(todayStr());
    setEndDate(todayStr());
    setReason("");
    setStatus("pending");
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
    if (endDate < startDate) {
      setError("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }
    const days = diffDays(startDate, endDate);
    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("employee_leaves")
        .insert({
          profile_id: profileId,
          employee_id: employeeId,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          days,
          reason: reason.trim() || null,
          status,
        })
        .select("id, employee_id, leave_type, start_date, end_date, days, reason, status")
        .single();
      if (error) throw error;
      setList((prev) => [data as Leave, ...prev]);
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

  async function setLeaveStatus(l: Leave, next: string) {
    const { error } = await supabase
      .from("employee_leaves")
      .update({ status: next })
      .eq("id", l.id);
    if (error) return;
    setList((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: next } : x)));
    router.refresh();
  }

  async function handleDelete(l: Leave) {
    if (!(await confirmDialog({ message: "Bu izin kaydı silinsin mi?", danger: true }))) return;
    const { error } = await supabase.from("employee_leaves").delete().eq("id", l.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== l.id));
    router.refresh();
  }

  if (employees.length === 0) {
    return (
      <>
        <PageHead title="İzin & Devamsızlık" sub="Çalışan izin kayıtları" />
        <div className="panel-empty">
          Önce <Link href="/panel/calisanlar" className="link-teal">çalışan ekle</Link>, sonra izin
          girebilirsin.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="İzin & Devamsızlık"
        sub="Çalışan izin kayıtları"
        action={
          <AddButton onClick={openNew}>İzin Ekle</AddButton>
        }
      />

      <div className="total-banner">
        <div className="t-item">
          <div className="t-label">Toplam Kayıt</div>
          <div className="t-value">{list.length}</div>
        </div>
        <div className="t-item">
          <div className="t-label">Bekleyen</div>
          <div className="t-value" style={{ color: pendingCount ? "var(--warning)" : undefined }}>
            {pendingCount}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="panel-empty">Henüz izin kaydı yok.</div>
      ) : (
        <div className="tx-list">
          {list.map((l) => {
            const st = STATUS[l.status] ?? { label: l.status, cls: "amber" };
            return (
              <div key={l.id} className="tx-row">
                <div className="tx-main">
                  <span className="tx-dot" style={{ background: "var(--text-dim)" }} />
                  <div className="tx-left">
                    <span className="tx-title">{nameOf(l.employee_id)}</span>
                    <span className="tx-meta">
                      {[
                        typeLabel(l.leave_type),
                        `${formatDate(l.start_date)} → ${formatDate(l.end_date)}`,
                        `${l.days ?? diffDays(l.start_date, l.end_date)} gün`,
                      ].join(" · ")}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  {l.status === "pending" && (
                    <>
                      <button
                        className="icon-btn"
                        title="Onayla"
                        aria-label="Onayla"
                        onClick={() => setLeaveStatus(l, "approved")}
                        style={{ color: "var(--teal)" }}
                      >
                        ✓
                      </button>
                      <button
                        className="icon-btn"
                        title="Reddet"
                        aria-label="Reddet"
                        onClick={() => setLeaveStatus(l, "rejected")}
                        style={{ color: "var(--danger)" }}
                      >
                        ✕
                      </button>
                    </>
                  )}
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                  <button className="tx-delete" onClick={() => handleDelete(l)} aria-label="Sil">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <Modal title="İzin Ekle" onClose={() => setOpen(false)} busy={saving}>
          <form onSubmit={handleSave}>
            {error && <div className="form-error">{error}</div>}

            <div className="form-row">
              <Field label="Çalışan">
                <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="İzin Türü">
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="form-row">
              <Field label="Başlangıç">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label="Bitiş">
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </div>

            <div className="form-hint">
              Süre: <strong>{diffDays(startDate, endDate)} gün</strong>
            </div>

            <div className="form-row">
              <Field label="Durum">
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="pending">Beklemede</option>
                  <option value="approved">Onaylandı</option>
                  <option value="rejected">Reddedildi</option>
                </select>
              </Field>
              <Field label="Sebep (ops.)">
                <input
                  type="text"
                  placeholder="ör. Yıllık izin"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
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
