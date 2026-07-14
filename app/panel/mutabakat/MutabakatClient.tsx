"use client";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { EditIcon, TrashIcon } from "../../../components/icons";

export type AccountRef = { id: string; name: string };
export type Reconciliation = {
  id: string;
  account_id: string | null;
  account_name: string;
  period_start: string;
  period_end: string;
  our_balance: string | null;
  their_balance: string | null;
  status: string;
  note: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Taslak", cls: "gray" },
  sent: { label: "Gönderildi", cls: "amber" },
  confirmed: { label: "Mutabık", cls: "green" },
  disputed: { label: "İhtilaflı", cls: "red" },
};
const STATUS_OPTS = Object.entries(STATUS).map(([id, v]) => ({ id, label: v.label }));

export default function MutabakatClient({
  profileId,
  currency,
  items: initial,
  accounts,
}: {
  profileId: string;
  currency: string;
  items: Reconciliation[];
  accounts: AccountRef[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [list, setList] = useState<Reconciliation[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reconciliation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [periodStart, setPeriodStart] = useState(todayStr());
  const [periodEnd, setPeriodEnd] = useState(todayStr());
  const [ourBalance, setOurBalance] = useState("");
  const [theirBalance, setTheirBalance] = useState("");
  const [status, setStatus] = useState("draft");
  const [note, setNote] = useState("");

  const num = (s: string) => Number(s.replace(",", ".")) || 0;

  function openNew() {
    setEditing(null);
    setAccountId("");
    setAccountName("");
    setPeriodStart(todayStr());
    setPeriodEnd(todayStr());
    setOurBalance("");
    setTheirBalance("");
    setStatus("draft");
    setNote("");
    setError(null);
    setOpen(true);
  }

  function openEdit(r: Reconciliation) {
    setEditing(r);
    setAccountId(r.account_id ?? "");
    setAccountName(r.account_name);
    setPeriodStart(r.period_start);
    setPeriodEnd(r.period_end);
    setOurBalance(r.our_balance != null ? String(r.our_balance) : "");
    setTheirBalance(r.their_balance != null ? String(r.their_balance) : "");
    setStatus(r.status);
    setNote(r.note ?? "");
    setError(null);
    setOpen(true);
  }

  function onPickAccount(id: string) {
    setAccountId(id);
    const a = accounts.find((x) => x.id === id);
    if (a) setAccountName(a.name);
  }

  const submitLock = useSubmitLock();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accountName.trim()) {
      setError("Cari/firma adı gerekli.");
      return;
    }
    const payload = {
      account_id: accountId || null,
      account_name: accountName.trim(),
      period_start: periodStart,
      period_end: periodEnd,
      our_balance: num(ourBalance),
      their_balance: theirBalance.trim() ? num(theirBalance) : null,
      status,
      note: note.trim() || null,
    };
    const cols =
      "id, account_id, account_name, period_start, period_end, our_balance, their_balance, status, note";

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("reconciliations")
          .update(payload)
          .eq("id", editing.id)
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => prev.map((x) => (x.id === editing.id ? (data as Reconciliation) : x)));
      } else {
        const { data, error } = await supabase
          .from("reconciliations")
          .insert({ ...payload, user_id: profileId })
          .select(cols)
          .single();
        if (error) throw error;
        setList((prev) => [data as Reconciliation, ...prev]);
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

  async function handleDelete(r: Reconciliation) {
    if (!(await confirmDialog({ message: `"${r.account_name}" mutabakatı silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("reconciliations").delete().eq("id", r.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== r.id));
    router.refresh();
  }

  return (
    <>
      <PageHead
        title="Mutabakat"
        sub="Cari bakiye mutabakatları"
        action={
          <AddButton onClick={openNew}>Mutabakat</AddButton>
        }
      />

      {list.length === 0 ? (
        <div className="panel-empty">Henüz mutabakat yok. Sağ üstten oluştur.</div>
      ) : (
        <div className="tx-list">
          {list.map((r) => {
            const st = STATUS[r.status] ?? { label: r.status, cls: "gray" };
            const our = Number(r.our_balance) || 0;
            const their = r.their_balance != null ? Number(r.their_balance) : null;
            const diff = their != null ? our - their : null;
            return (
              <div key={r.id} className="tx-row">
                <div className="tx-main">
                  <span className="tx-dot" style={{ background: "var(--text-dim)" }} />
                  <div className="tx-left">
                    <span className="tx-title">{r.account_name}</span>
                    <span className="tx-meta">
                      {[
                        `${formatDate(r.period_start)} → ${formatDate(r.period_end)}`,
                        `Biz: ${formatCurrency(our, currency)}`,
                        their != null ? `Onlar: ${formatCurrency(their, currency)}` : null,
                        diff != null && diff !== 0
                          ? `Fark: ${formatCurrency(diff, currency)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  <span className={`badge ${st.cls}`}>{st.label}</span>
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
          title={editing ? "Mutabakatı Düzenle" : "Mutabakat Oluştur"}
          onClose={() => setOpen(false)}
          busy={saving}
        >
          <form onSubmit={handleSave}>
            {error && <div className="form-error">{error}</div>}

            {accounts.length > 0 && (
              <Field label="Cari Hesaptan Seç (ops.)">
                <select value={accountId} onChange={(e) => onPickAccount(e.target.value)}>
                  <option value="">Elle gir…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Cari / Firma Adı">
              <input
                type="text"
                placeholder="ör. ABC Ltd."
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </Field>

            <div className="form-row">
              <Field label="Dönem Başlangıç">
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </Field>
              <Field label="Dönem Bitiş">
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field label="Bizim Bakiye">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={ourBalance}
                  onChange={(e) => setOurBalance(e.target.value)}
                />
              </Field>
              <Field label="Karşı Bakiye (ops.)">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={theirBalance}
                  onChange={(e) => setTheirBalance(e.target.value)}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field label="Durum">
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Not (ops.)">
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
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
