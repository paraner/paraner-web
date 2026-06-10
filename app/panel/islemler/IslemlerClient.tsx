"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";
import {
  CATEGORIES,
  INCOME_CATEGORIES,
  findCategory,
} from "../../../lib/categories";

export type Tx = {
  id: string;
  title: string;
  amount: string;
  type: string;
  category: string | null;
  date: string;
  currency: string | null;
  bank_account_id: string | null;
};

export type Account = {
  id: string;
  name: string;
  currency: string;
  balance: string;
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function IslemlerClient({
  profileId,
  currency,
  accounts,
  initialTransactions,
}: {
  profileId: string;
  currency: string;
  accounts: Account[];
  initialTransactions: Tx[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Tx[]>(initialTransactions);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayStr());
  const [accountId, setAccountId] = useState("");

  const cats = type === "income" ? INCOME_CATEGORIES : CATEGORIES;

  function resetForm() {
    setType("expense");
    setAmount("");
    setTitle("");
    setCategory("");
    setDate(todayStr());
    setAccountId("");
    setError(null);
  }

  // Hesap bakiyesini güncelle (gider → düş, gelir → ekle). delta yönü çağırana ait.
  async function adjustBalance(id: string, delta: number) {
    const { data } = await supabase
      .from("bank_accounts")
      .select("balance")
      .eq("id", id)
      .maybeSingle();
    if (!data) return;
    const next = (Number(data.balance) || 0) + delta;
    await supabase.from("bank_accounts").update({ balance: next }).eq("id", id);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount.replace(",", "."));
    if (!amt || amt <= 0) {
      setError("Geçerli bir tutar gir.");
      return;
    }

    const account = accounts.find((a) => a.id === accountId);
    const txCurrency = account?.currency || currency;
    const catLabel = findCategory(category).label;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: profileId,
          title: title.trim() || catLabel,
          amount: amt,
          type,
          category: category || null,
          date,
          currency: txCurrency,
          bank_account_id: accountId || null,
        })
        .select("id, title, amount, type, category, date, currency, bank_account_id")
        .single();

      if (error) throw error;

      // Hesap seçildiyse bakiyeyi güncelle (gider −, gelir +)
      if (accountId) {
        await adjustBalance(accountId, type === "expense" ? -amt : amt);
      }

      setList((prev) => [data as Tx, ...prev]);
      resetForm();
      setOpen(false);
    } catch {
      setError("İşlem kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: Tx) {
    if (!confirm("Bu işlem silinsin mi?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", t.id);
    if (error) return;

    // Bakiyeyi geri al (silinen gider → +, gelir → −)
    if (t.bank_account_id) {
      const amt = Number(t.amount) || 0;
      await adjustBalance(t.bank_account_id, t.type === "expense" ? amt : -amt);
    }
    setList((prev) => prev.filter((x) => x.id !== t.id));
  }

  return (
    <>
      <div className="panel-page-head">
        <div>
          <h1 className="panel-h1">İşlemler</h1>
          <p className="panel-sub" style={{ marginBottom: 0 }}>
            Gelir ve giderlerin
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
          + İşlem Ekle
        </button>
      </div>

      {list.length === 0 ? (
        <div className="panel-empty">
          Henüz işlem yok. Sağ üstten ilk işlemini ekle.
        </div>
      ) : (
        <div className="tx-list">
          {list.map((t) => {
            const isIncome = t.type === "income";
            const isExpense = t.type === "expense";
            const sign = isIncome ? "+" : isExpense ? "−" : "";
            const cls = isIncome ? "pos" : isExpense ? "neg" : "";
            const cat = findCategory(t.category);
            return (
              <div key={t.id} className="tx-row">
                <div className="tx-main">
                  <span className="tx-dot" style={{ background: cat.color }} />
                  <div className="tx-left">
                    <span className="tx-title">{t.title}</span>
                    <span className="tx-meta">
                      {[cat.label, formatDate(t.date)].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  <span className={`tx-amount ${cls}`}>
                    {sign}
                    {formatCurrency(Number(t.amount) || 0, t.currency || currency)}
                  </span>
                  <button
                    className="tx-delete"
                    onClick={() => handleDelete(t)}
                    aria-label="Sil"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                    </svg>
                  </button>
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
              <h2>İşlem Ekle</h2>
              <button className="modal-close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleAdd}>
              <div className="type-toggle">
                <button
                  type="button"
                  className={type === "expense" ? "on-expense" : ""}
                  onClick={() => {
                    setType("expense");
                    setCategory("");
                  }}
                >
                  Gider
                </button>
                <button
                  type="button"
                  className={type === "income" ? "on-income" : ""}
                  onClick={() => {
                    setType("income");
                    setCategory("");
                  }}
                >
                  Gelir
                </button>
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="field">
                <label>Tutar</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="field">
                <label>Açıklama (opsiyonel)</label>
                <input
                  type="text"
                  placeholder="ör. Market alışverişi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Seç</option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Tarih</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {accounts.length > 0 && (
                <div className="field">
                  <label>Hesap (opsiyonel)</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    <option value="">Hesapsız</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
