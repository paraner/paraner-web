"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency, formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import {
  CATEGORIES,
  INCOME_CATEGORIES,
  findCategory,
} from "../../../lib/categories";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { TrashIcon } from "../../../components/icons";
import { Search } from "lucide-react";

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

  // Filtreler — anında, client-side (yüklü son 100 işlem üzerinde)
  const [query, setQuery] = useState("");
  const [ftype, setFtype] = useState<"all" | "income" | "expense">("all");
  const [fcat, setFcat] = useState("");
  const allCats = Array.from(
    new Map([...CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.id, c])).values()
  );
  const q = query.trim().toLocaleLowerCase("tr");
  const filtered = list.filter((t) => {
    if (ftype !== "all" && t.type !== ftype) return false;
    if (fcat && t.category !== fcat) return false;
    if (q) {
      const hay = `${t.title} ${findCategory(t.category).label}`.toLocaleLowerCase("tr");
      if (!hay.includes(q)) return false;
    }
    return true;
  });

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
      <PageHead
        title="İşlemler"
        sub="Gelir ve giderlerin"
        action={
          <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
            + İşlem Ekle
          </button>
        }
      />

      {list.length === 0 ? (
        <div className="panel-empty">
          Henüz işlem yok. Sağ üstten ilk işlemini ekle.
        </div>
      ) : (
        <>
          <div className="filter-row">
            <div className="chip-search">
              <Search />
              <input
                type="text"
                placeholder="İşlem ara…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="chip-seg">
              <button
                className={ftype === "all" ? "active" : ""}
                onClick={() => setFtype("all")}
              >
                Tümü
              </button>
              <button
                className={ftype === "income" ? "active on-income" : ""}
                onClick={() => setFtype("income")}
              >
                Gelir
              </button>
              <button
                className={ftype === "expense" ? "active on-expense" : ""}
                onClick={() => setFtype("expense")}
              >
                Gider
              </button>
            </div>
            <select
              className="chip-select"
              value={fcat}
              onChange={(e) => setFcat(e.target.value)}
            >
              <option value="">Tüm kategoriler</option>
              {allCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="panel-empty">Filtreye uyan işlem yok.</div>
          ) : (
            <div className="tx-list">
              {filtered.map((t) => {
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
        <Modal title="İşlem Ekle" onClose={() => setOpen(false)} busy={saving}>
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

            <Field label="Açıklama (opsiyonel)">
              <input
                type="text"
                placeholder="ör. Market alışverişi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <div className="form-row">
              <Field label="Kategori">
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
              </Field>
              <Field label="Tarih">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
            </div>

            {accounts.length > 0 && (
              <Field label="Hesap (opsiyonel)">
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
              </Field>
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
        </Modal>
      )}
    </>
  );
}
