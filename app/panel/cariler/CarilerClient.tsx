"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency } from "../../../lib/format";

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

const TrashIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
);

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
    if (!confirm(`"${c.name}" carisi silinsin mi?`)) return;
    const { error } = await supabase.from("current_accounts").delete().eq("id", c.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== c.id));
  }

  return (
    <>
      <div className="panel-page-head">
        <div>
          <h1 className="panel-h1">Cariler</h1>
          <p className="panel-sub" style={{ marginBottom: 0 }}>
            Müşteri ve tedarikçi hesapların
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Cari Ekle
        </button>
      </div>

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
                    {TrashIcon}
                  </button>
                </div>
                <div className="acct-top">
                  <span className="acct-name">{c.name}</span>
                  <span className="acct-badge">{typeLabel(c.type)}</span>
                </div>
                <div
                  className="acct-balance"
                  style={{ color: bal < 0 ? "#E24B4A" : bal > 0 ? "var(--teal)" : undefined }}
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
        <div className="modal-overlay" onClick={() => !saving && setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Cari Ekle</h2>
              <button className="modal-close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSave}>
              {error && <div className="form-error">{error}</div>}
              <div className="field">
                <label>Cari Adı</label>
                <input
                  type="text"
                  placeholder="ör. ABC Ltd. Şti."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Tür</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Bakiye (opsiyonel)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                  />
                </div>
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
          </div>
        </div>
      )}
    </>
  );
}
