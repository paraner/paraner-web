"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import { EditIcon, TrashIcon } from "../../../components/icons";
import { ArrowRightLeft } from "lucide-react";

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

  // Transfer (hesaplar arası para taşıma) — mobil ile birebir
  const [tOpen, setTOpen] = useState(false);
  const [tSaving, setTSaving] = useState(false);
  const [tError, setTError] = useState<string | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [tAmount, setTAmount] = useState("");
  const [tFee, setTFee] = useState("");
  const [tNote, setTNote] = useState("");
  const [tDate, setTDate] = useState(todayStr());

  const fromAcct = list.find((a) => a.id === fromId);
  // Hedef seçenekleri: kaynaktan farklı + AYNI para birimi (farklı para birimi transferi desteklenmiyor)
  const targets = list.filter(
    (a) => a.id !== fromId && (!fromAcct || a.currency === fromAcct.currency)
  );

  // Para birimi bazında toplam bakiye
  const totals = list.reduce<Record<string, number>>((acc, a) => {
    acc[a.currency] = (acc[a.currency] || 0) + (Number(a.balance) || 0);
    return acc;
  }, {});

  function openTransfer() {
    const first = list[0]?.id ?? "";
    setFromId(first);
    setToId("");
    setTAmount("");
    setTFee("");
    setTNote("");
    setTDate(todayStr());
    setTError(null);
    setTOpen(true);
  }

  // Bakiyeyi DB'de güncelle + yeni değeri döndür (yuvarlama mobil ile aynı)
  async function dbAdjust(id: string, delta: number): Promise<number | null> {
    const { data } = await supabase
      .from("bank_accounts")
      .select("balance")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const next = Math.round(((Number(data.balance) || 0) + delta) * 100) / 100;
    await supabase.from("bank_accounts").update({ balance: next }).eq("id", id);
    return next;
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTError(null);
    const from = list.find((a) => a.id === fromId);
    const to = list.find((a) => a.id === toId);
    if (!from || !to) {
      setTError("Kaynak ve hedef hesabı seç.");
      return;
    }
    if (from.id === to.id) {
      setTError("Kaynak ve hedef aynı olamaz.");
      return;
    }
    if (from.currency !== to.currency) {
      setTError(
        `Farklı para birimleri arası transfer desteklenmiyor (${from.currency} → ${to.currency}).`
      );
      return;
    }
    const amt = Number(tAmount.replace(",", ".")) || 0;
    const fee = Number(tFee.replace(",", ".")) || 0;
    if (amt <= 0) {
      setTError("Geçerli bir tutar gir.");
      return;
    }
    const currency = from.currency;
    const groupId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // type 'transfer' → gelir/gider'e sayılmaz (raporlar hariç tutuyor).
    const rows: Record<string, unknown>[] = [
      {
        user_id: profileId,
        title: `${to.name} hesabına transfer`,
        amount: amt,
        type: "transfer",
        category: "transfer_out",
        date: tDate,
        currency,
        bank_account_id: from.id,
        transfer_group_id: groupId,
        note: tNote.trim() || null,
        source: "web",
      },
      {
        user_id: profileId,
        title: `${from.name} hesabından transfer`,
        amount: amt,
        type: "transfer",
        category: "transfer_in",
        date: tDate,
        currency,
        bank_account_id: to.id,
        transfer_group_id: groupId,
        source: "web",
      },
    ];
    if (fee > 0) {
      rows.push({
        user_id: profileId,
        title: `${to.name} transfer ücreti`,
        amount: fee,
        type: "expense",
        category: "transfer_fee",
        date: tDate,
        currency,
        bank_account_id: from.id,
        transfer_group_id: groupId,
        source: "web",
      });
    }

    setTSaving(true);
    try {
      const { error } = await supabase.from("transactions").insert(rows);
      if (error) throw error;

      // Bakiye senkronu: kaynak −(tutar+ücret), hedef +tutar
      const newFrom = await dbAdjust(from.id, -(amt + fee));
      const newTo = await dbAdjust(to.id, amt);
      setList((prev) =>
        prev.map((a) => {
          if (a.id === from.id && newFrom != null) return { ...a, balance: String(newFrom) };
          if (a.id === to.id && newTo != null) return { ...a, balance: String(newTo) };
          return a;
        })
      );
      setTOpen(false);
    } catch {
      setTError("Transfer kaydedilemedi. Tekrar dene.");
    } finally {
      setTSaving(false);
    }
  }

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
      <PageHead
        title="Hesaplar"
        sub="Banka ve nakit hesapların"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {list.length >= 2 && (
              <button className="btn btn-ghost btn-sm" onClick={openTransfer}>
                <ArrowRightLeft size={15} style={{ marginRight: 6 }} />
                Transfer
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={openNew}>
              + Hesap Ekle
            </button>
          </div>
        }
      />

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
                  <EditIcon />
                </button>
                <button
                  className="icon-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(a);
                  }}
                  aria-label="Sil"
                >
                  <TrashIcon />
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
        <Modal
          title={editing ? "Hesabı Düzenle" : "Hesap Ekle"}
          onClose={() => setOpen(false)}
          busy={saving}
        >
          <form onSubmit={handleSave}>
            {error && <div className="form-error">{error}</div>}

            <Field label="Hesap Adı">
              <input
                type="text"
                placeholder="ör. Ziraat Vadesiz"
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
              <Field label="Para Birimi">
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {type === "bank" && (
              <Field label="Banka Adı (opsiyonel)">
                <input
                  type="text"
                  placeholder="ör. Ziraat Bankası"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </Field>
            )}

            <Field label="IBAN (opsiyonel)">
              <input
                type="text"
                placeholder="TR.."
                value={iban}
                onChange={(e) => setIban(e.target.value)}
              />
            </Field>

            <Field label={editing ? "Bakiye" : "Başlangıç Bakiyesi"}>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </Field>

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

      {tOpen && (
        <Modal title="Hesaplar Arası Transfer" onClose={() => setTOpen(false)} busy={tSaving}>
          <form onSubmit={handleTransfer}>
            {tError && <div className="form-error">{tError}</div>}

            <Field label="Kaynak Hesap">
              <select
                value={fromId}
                onChange={(e) => {
                  setFromId(e.target.value);
                  setToId(""); // para birimi değişebilir → hedefi sıfırla
                }}
              >
                {list.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {formatCurrency(Number(a.balance) || 0, a.currency)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Hedef Hesap">
              <select value={toId} onChange={(e) => setToId(e.target.value)}>
                <option value="">Seç</option>
                {targets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {formatCurrency(Number(a.balance) || 0, a.currency)}
                  </option>
                ))}
              </select>
            </Field>
            {fromAcct && targets.length === 0 && (
              <div className="form-hint">
                {fromAcct.currency} cinsinden başka hesap yok — transfer için aynı
                para biriminden ikinci bir hesap gerekir.
              </div>
            )}

            <div className="form-row">
              <Field label="Tutar">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={tAmount}
                  onChange={(e) => setTAmount(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Tarih">
                <input
                  type="date"
                  value={tDate}
                  onChange={(e) => setTDate(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Gönderim Ücreti (opsiyonel)">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={tFee}
                onChange={(e) => setTFee(e.target.value)}
              />
            </Field>

            <Field label="Not (opsiyonel)">
              <input
                type="text"
                placeholder="ör. Kira için"
                value={tNote}
                onChange={(e) => setTNote(e.target.value)}
              />
            </Field>

            {fromAcct &&
              (() => {
                const amt = Number(tAmount.replace(",", ".")) || 0;
                const fee = Number(tFee.replace(",", ".")) || 0;
                if (amt <= 0) return null;
                return (
                  <div className="form-hint">
                    {fromAcct.name} hesabından toplam{" "}
                    <strong>{formatCurrency(amt + fee, fromAcct.currency)}</strong> düşülür.
                  </div>
                );
              })()}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={tSaving || targets.length === 0}
              style={{ marginTop: 4 }}
            >
              {tSaving ? "Aktarılıyor…" : "Transfer Et"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
