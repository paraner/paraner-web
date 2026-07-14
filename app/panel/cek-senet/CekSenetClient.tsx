"use client";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { EditIcon, TrashIcon } from "../../../components/icons";

export type CheckNote = {
  id: string;
  type: string; // check / note
  direction: string; // received / given
  person_name: string;
  amount: string | null;
  currency: string;
  issue_date: string | null;
  due_date: string;
  bank_name: string | null;
  check_number: string | null;
  status: string;
  note: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Beklemede", cls: "amber" },
  collected: { label: "Tahsil edildi", cls: "green" },
  paid: { label: "Ödendi", cls: "green" },
  bounced: { label: "Karşılıksız", cls: "red" },
  endorsed: { label: "Ciro edildi", cls: "gray" },
};
const STATUS_OPTS = Object.entries(STATUS).map(([id, v]) => ({ id, label: v.label }));
const CURRENCIES = ["TRY", "USD", "EUR", "GBP"];

export default function CekSenetClient({
  profileId,
  currency,
  items: initial,
}: {
  profileId: string;
  currency: string;
  items: CheckNote[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [list, setList] = useState<CheckNote[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CheckNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState("check");
  const [direction, setDirection] = useState("received");
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [cur, setCur] = useState(currency);
  const [dueDate, setDueDate] = useState(todayStr());
  const [bankName, setBankName] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [status, setStatus] = useState("pending");
  const [note, setNote] = useState("");

  const sum = (rows: CheckNote[]) => rows.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalReceived = sum(
    list.filter((x) => x.direction === "received" && x.status === "pending")
  );
  const totalGiven = sum(list.filter((x) => x.direction === "given" && x.status === "pending"));
  const today = todayStr();
  const overdueCount = list.filter((x) => x.status === "pending" && x.due_date < today).length;

  function openNew() {
    setEditing(null);
    setType("check");
    setDirection("received");
    setPerson("");
    setAmount("");
    setCur(currency);
    setDueDate(todayStr());
    setBankName("");
    setCheckNumber("");
    setStatus("pending");
    setNote("");
    setError(null);
    setOpen(true);
  }

  function openEdit(x: CheckNote) {
    setEditing(x);
    setType(x.type);
    setDirection(x.direction);
    setPerson(x.person_name);
    setAmount(x.amount != null ? String(x.amount) : "");
    setCur(x.currency ?? currency);
    setDueDate(x.due_date);
    setBankName(x.bank_name ?? "");
    setCheckNumber(x.check_number ?? "");
    setStatus(x.status);
    setNote(x.note ?? "");
    setError(null);
    setOpen(true);
  }

  const submitLock = useSubmitLock();

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
    const payload = {
      type,
      direction,
      person_name: person.trim(),
      amount: amt,
      currency: cur,
      due_date: dueDate,
      bank_name: bankName.trim() || null,
      check_number: checkNumber.trim() || null,
      status,
      note: note.trim() || null,
    };
    const cols =
      "id, type, direction, person_name, amount, currency, issue_date, due_date, bank_name, check_number, status, note";

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("checks_notes")
          .update(payload)
          .eq("id", editing.id)
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => prev.map((x) => (x.id === editing.id ? (data as CheckNote) : x)));
      } else {
        const { data, error } = await supabase
          .from("checks_notes")
          .insert({ ...payload, user_id: profileId })
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => [data as CheckNote, ...prev]);
      }
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

  async function handleDelete(x: CheckNote) {
    if (!(await confirmDialog({ message: "Bu kayıt silinsin mi?", danger: true }))) return;
    const { error } = await supabase.from("checks_notes").delete().eq("id", x.id);
    if (error) return;
    setList((prev) => prev.filter((i) => i.id !== x.id));
    router.refresh();
  }

  return (
    <>
      <PageHead
        title="Çek / Senet Takibi"
        sub="Alınan ve verilen çek/senetler"
        action={
          <AddButton onClick={openNew}>Çek / Senet</AddButton>
        }
      />

      {list.length > 0 && (
        <div className="total-banner">
          <div className="t-item">
            <div className="t-label">Alınan (bekleyen)</div>
            <div className="t-value">{formatCurrency(totalReceived, currency)}</div>
          </div>
          <div className="t-item">
            <div className="t-label">Verilen (bekleyen)</div>
            <div className="t-value" style={{ color: "var(--danger)" }}>
              {formatCurrency(totalGiven, currency)}
            </div>
          </div>
          <div className="t-item">
            <div className="t-label">Vadesi Geçen</div>
            <div className="t-value" style={{ color: overdueCount ? "var(--warning)" : undefined }}>
              {overdueCount}
            </div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="panel-empty">Henüz çek/senet kaydı yok. Sağ üstten ekle.</div>
      ) : (
        <div className="tx-list">
          {list.map((x) => {
            const st = STATUS[x.status] ?? { label: x.status, cls: "amber" };
            const isReceived = x.direction === "received";
            const overdue = x.status === "pending" && x.due_date < today;
            return (
              <div key={x.id} className="tx-row">
                <div className="tx-main">
                  <span
                    className="tx-dot"
                    style={{ background: isReceived ? "var(--teal)" : "var(--danger)" }}
                  />
                  <div className="tx-left">
                    <span className="tx-title">{x.person_name}</span>
                    <span className="tx-meta">
                      {[
                        x.type === "note" ? "Senet" : "Çek",
                        isReceived ? "Alınan" : "Verilen",
                        `Vade: ${formatDate(x.due_date)}`,
                        x.bank_name,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {overdue && <span className="badge amber low-badge">Vadesi geçti</span>}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                  <span className="tx-amount">
                    {formatCurrency(Number(x.amount) || 0, x.currency)}
                  </span>
                  <button className="icon-btn" onClick={() => openEdit(x)} aria-label="Düzenle">
                    <EditIcon />
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

      {open && (
        <Modal
          title={editing ? "Çek / Senet Düzenle" : "Çek / Senet Ekle"}
          onClose={() => setOpen(false)}
          busy={saving}
        >
          <form onSubmit={handleSave}>
            <div className="form-row">
              <Field label="Tür">
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="check">Çek</option>
                  <option value="note">Senet</option>
                </select>
              </Field>
              <Field label="Yön">
                <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                  <option value="received">Alınan</option>
                  <option value="given">Verilen</option>
                </select>
              </Field>
            </div>

            {error && <div className="form-error">{error}</div>}

            <Field label="Kişi / Firma">
              <input
                type="text"
                placeholder="ör. ABC Ltd."
                value={person}
                onChange={(e) => setPerson(e.target.value)}
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
              <Field label="Vade Tarihi">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
              <Field label="Durum">
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="form-row">
              <Field label="Banka (ops.)">
                <input
                  type="text"
                  placeholder="ör. Ziraat"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </Field>
              <Field label="Çek/Senet No (ops.)">
                <input
                  type="text"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
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
