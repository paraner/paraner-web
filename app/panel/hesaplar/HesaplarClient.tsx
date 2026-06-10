"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency } from "../../../lib/format";

export type Account = {
  id: string;
  name: string;
  type: string;
  bank_name: string | null;
  iban: string | null;
  balance: string;
  currency: string;
  is_default: boolean;
};

const TYPES = [
  { id: "bank", label: "Banka" },
  { id: "cash", label: "Nakit" },
  { id: "pos", label: "POS" },
];
const CURRENCIES = ["TRY", "USD", "EUR", "GBP", "CHF"];

function typeLabel(t: string) {
  return TYPES.find((x) => x.id === t)?.label ?? t;
}

const EditIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
);
const TrashIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
);

export default function HesaplarClient({
  profileId,
  accounts: initial,
}: {
  profileId: string;
  accounts: Account[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Account[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("TRY");

  // Para birimi bazında toplam bakiye
  const totals = list.reduce<Record<string, number>>((acc, a) => {
    acc[a.currency] = (acc[a.currency] || 0) + (Number(a.balance) || 0);
    return acc;
  }, {});

  function openNew() {
    setEditing(null);
    setName("");
    setType("bank");
    setBankName("");
    setIban("");
    setBalance("");
    setCurrency("TRY");
    setError(null);
    setOpen(true);
  }

  function openEdit(a: Account) {
    setEditing(a);
    setName(a.name);
    setType(a.type);
    setBankName(a.bank_name ?? "");
    setIban(a.iban ?? "");
    setBalance(String(a.balance ?? ""));
    setCurrency(a.currency);
    setError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Hesap adı gerekli.");
      return;
    }
    const bal = Number(balance.replace(",", ".")) || 0;
    const payload = {
      name: name.trim(),
      type,
      bank_name: type === "bank" ? bankName.trim() || null : null,
      iban: iban.trim() || null,
      balance: bal,
      currency,
    };

    setSaving(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("bank_accounts")
          .update(payload)
          .eq("id", editing.id)
          .select("id, name, type, bank_name, iban, balance, currency, is_default")
          .single();
        if (error) throw error;
        setList((prev) => prev.map((x) => (x.id === editing.id ? (data as Account) : x)));
      } else {
        const { data, error } = await supabase
          .from("bank_accounts")
          .insert({ ...payload, user_id: profileId })
          .select("id, name, type, bank_name, iban, balance, currency, is_default")
          .single();
        if (error) throw error;
        setList((prev) => [...prev, data as Account]);
      }
      setOpen(false);
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: Account) {
    if (!confirm(`"${a.name}" hesabı silinsin mi?`)) return;
    const { error } = await supabase.from("bank_accounts").delete().eq("id", a.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== a.id));
  }

  return (
    <>
      <div className="panel-page-head">
        <div>
          <h1 className="panel-h1">Hesaplar</h1>
          <p className="panel-sub" style={{ marginBottom: 0 }}>
            Banka ve nakit hesapların
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Hesap Ekle
        </button>
      </div>

      {Object.keys(totals).length > 0 && (
        <div className="total-banner">
          {Object.entries(totals).map(([cur, total]) => (
            <div key={cur} className="t-item">
              <div className="t-label">Toplam ({cur})</div>
              <div className="t-value">{formatCurrency(total, cur)}</div>
            </div>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <div className="panel-empty">Henüz hesap yok. Sağ üstten ilk hesabını ekle.</div>
      ) : (
        <div className="card-grid">
          {list.map((a) => (
            <div key={a.id} className="acct-card" onClick={() => openEdit(a)}>
              <div className="acct-actions">
                <button
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(a);
                  }}
                  aria-label="Düzenle"
                >
                  {EditIcon}
                </button>
                <button
                  className="icon-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(a);
                  }}
                  aria-label="Sil"
                >
                  {TrashIcon}
                </button>
              </div>
              <div className="acct-top">
                <span className="acct-name">{a.name}</span>
                <span className="acct-badge">{typeLabel(a.type)}</span>
              </div>
              <div className="acct-balance">
                {formatCurrency(Number(a.balance) || 0, a.currency)}
              </div>
              <div className="acct-sub">
                {[a.bank_name, a.iban].filter(Boolean).join(" · ") || a.currency}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="modal-overlay" onClick={() => !saving && setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editing ? "Hesabı Düzenle" : "Hesap Ekle"}</h2>
              <button className="modal-close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              {error && <div className="form-error">{error}</div>}

              <div className="field">
                <label>Hesap Adı</label>
                <input
                  type="text"
                  placeholder="ör. Ziraat Vadesiz"
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
                  <label>Para Birimi</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {type === "bank" && (
                <div className="field">
                  <label>Banka Adı (opsiyonel)</label>
                  <input
                    type="text"
                    placeholder="ör. Ziraat Bankası"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
              )}

              <div className="field">
                <label>IBAN (opsiyonel)</label>
                <input
                  type="text"
                  placeholder="TR.."
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                />
              </div>

              <div className="field">
                <label>{editing ? "Bakiye" : "Başlangıç Bakiyesi"}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                />
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
