"use client";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { TrashIcon } from "../../../components/icons";

export type Cari = {
  id: string;
  name: string;
  type: string;
  balance: string;
};

const TYPES = [
  { id: "customer", label: "Müşteri" },
  { id: "supplier", label: "Tedarikçi" },
];

function typeLabel(t: string) {
  return TYPES.find((x) => x.id === t)?.label ?? t;
}

export default function CarilerClient({
  profileId,
  currency,
  cariler: initial,
}: {
  profileId: string;
  currency: string;
  cariler: Cari[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Cari[]>(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("customer");
  const [balance, setBalance] = useState("");

  function openNew() {
    setName("");
    setType("customer");
    setBalance("");
    setError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Cari adı gerekli.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("current_accounts")
        .insert({
          user_id: profileId,
          name: name.trim(),
          type,
          balance: Number(balance.replace(",", ".")) || 0,
        })
        .select("id, name, type, balance")
        .single();
      if (error) throw error;
      setList((prev) => [...prev, data as Cari]);
      setOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Cari) {
    if (!(await confirmDialog({ message: `"${c.name}" carisi silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("current_accounts").delete().eq("id", c.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== c.id));
  }

  return (
    <>
      <PageHead
        title="Cariler"
        sub="Müşteri ve tedarikçi hesapların"
        action={
          <button className="btn btn-primary btn-sm" onClick={openNew}>
            + Cari Ekle
          </button>
        }
      />

      {list.length === 0 ? (
        <div className="panel-empty">Henüz cari yok. Sağ üstten ilk carini ekle.</div>
      ) : (
        <div className="card-grid">
          {list.map((c) => {
            const bal = Number(c.balance) || 0;
            return (
              <div key={c.id} className="acct-card" style={{ cursor: "default" }}>
                <div className="acct-actions">
                  <button
                    className="icon-btn danger"
                    onClick={() => handleDelete(c)}
                    aria-label="Sil"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="acct-top">
                  <span className="acct-name">{c.name}</span>
                  <span className="acct-badge">{typeLabel(c.type)}</span>
                </div>
                <div
                  className="acct-balance"
                  style={{ color: bal < 0 ? "var(--danger)" : bal > 0 ? "var(--teal)" : undefined }}
                >
                  {formatCurrency(bal, currency)}
                </div>
                <div className="acct-sub">
                  {bal > 0 ? "Alacak" : bal < 0 ? "Borç" : "Bakiye yok"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <Modal title="Cari Ekle" onClose={() => setOpen(false)} busy={saving}>
          <form onSubmit={handleSave}>
            {error && <div className="form-error">{error}</div>}
            <Field label="Cari Adı">
              <input
                type="text"
                placeholder="ör. ABC Ltd. Şti."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>
            <div className="form-row">
              <Field label="Tür">
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bakiye (opsiyonel)">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
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
