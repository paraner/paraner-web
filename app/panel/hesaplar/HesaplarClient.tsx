"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { formatCurrency } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import { CARD_THEMES, getCardTheme } from "../../../lib/cardThemes";
import { CURRENCIES, getCurrencySymbol } from "../../../lib/currencies";
import PageHead from "../../../components/ui/PageHead";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import DatePicker from "../../../components/ui/DatePicker";
import AccountCard from "../../../components/ui/AccountCard";
import { EditIcon, TrashIcon } from "../../../components/icons";
import { ArrowRightLeft, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";

type AccountType = "bank" | "cash" | "pos";

export type Account = {
  id: string;
  name: string;
  type: string;
  bank_name: string | null;
  iban: string | null;
  routing_no: string | null;
  account_no: string | null;
  card_theme: string | null;
  balance: string;
  currency: string;
  is_default: boolean;
};

const ACCT_COLS =
  "id, name, type, bank_name, iban, routing_no, account_no, card_theme, balance, currency, is_default";

const ACCOUNT_TYPES: { id: AccountType; label: string; accent: string }[] = [
  { id: "bank", label: "Banka Hesabı", accent: "#378ADD" },
  { id: "cash", label: "Nakit Kasa", accent: "#00BFA6" },
  { id: "pos", label: "POS Hesabı", accent: "#EF9F27" },
];

const ACCOUNT_TYPE_INFO: Record<AccountType, { title: string; body: string }> = {
  bank: {
    title: "Banka Hesabı",
    body: "Bankadaki hesabınızı (vadesiz, maaş, vadeli vb.) temsil eder. Banka adı, IBAN ve bakiye saklanır. Bir işlemde bu hesabı seçtiğinizde gelir hesaba eklenir, gider düşülür ve bakiye otomatik güncellenir.",
  },
  cash: {
    title: "Nakit Kasa",
    body: "Elinizde veya iş yerinizdeki kasada bulunan nakit paradır. Banka veya IBAN bilgisi tutulmaz. Nakit yaptığınız gelir ve harcamaları bu hesaptan takip edersiniz.",
  },
  pos: {
    title: "POS Hesabı",
    body: "POS cihazı veya sanal POS üzerinden aldığınız kart tahsilatları için kullanılır. Kartla yapılan satış ödemeleri bu hesaba işlenir; tutar bankaya geçene kadar buradaki bakiyede görünür.",
  },
};

const BALANCE_INFO = {
  title: "Açılış Bakiyesi Nedir?",
  body: "Bu hesaba Paraner'a başlarken mevcut olan tutardır. Örneğin Mercury hesabında şu an $11.111 varsa buraya onu yaz. Sonraki gelir/giderler bu tutarın üzerine işlenir. Bilmiyorsan boş (0) bırakabilirsin.",
};

// Para birimine göre banka alanı düzeni (IBAN tek alan / routing+hesap no çifti)
function acctFormat(currency: string) {
  switch (currency) {
    case "TRY":
      return { kind: "iban" as const, bank: "ör. Ziraat Bankası", label: "IBAN", ph: "TR00 0000 0000 0000 0000 0000 00" };
    case "EUR":
      return { kind: "iban" as const, bank: "ör. N26, Revolut", label: "IBAN", ph: "DE00 0000 0000 0000 0000 00" };
    case "USD":
      return { kind: "pair" as const, bank: "ör. Mercury, Chase", label1: "Routing Numarası", ph1: "000000000", label2: "Hesap Numarası", ph2: "0000000000" };
    case "GBP":
      return { kind: "pair" as const, bank: "ör. Wise, Monzo", label1: "Sort Code", ph1: "00-00-00", label2: "Hesap Numarası", ph2: "00000000" };
    default:
      return { kind: "iban" as const, bank: "ör. Banka adı", label: "IBAN / Hesap No", ph: "IBAN veya hesap numarası" };
  }
}

function typeLabel(t: string) {
  return ACCOUNT_TYPES.find((x) => x.id === t)?.label ?? t;
}

export default function HesaplarClient({
  profileId,
  profileType,
  defaultCurrency,
  accounts: initial,
}: {
  profileId: string;
  profileType: string;
  defaultCurrency: string;
  accounts: Account[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<Account[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ title: string; body: string } | null>(null);

  // Form
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [routing, setRouting] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [cardTheme, setCardTheme] = useState("obsidian");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);

  const fmt = acctFormat(currency);
  const isBusiness = profileType === "business";
  const nameLabel = isBusiness ? "Hesap / Şirket Adı *" : "Hesap / Ad Soyad *";

  // Kart tema şeridi: kaydırınca seçili tema güncellenir (mobil ile aynı his)
  const themeScrollRef = useRef<HTMLDivElement>(null);
  const themeIdx = Math.max(0, CARD_THEMES.findIndex((t) => t.id === cardTheme));

  // Modal açıldığında kayıtlı temaya kaydır
  useEffect(() => {
    if (!open) return;
    const el = themeScrollRef.current;
    if (!el) return;
    const idx = Math.max(0, CARD_THEMES.findIndex((t) => t.id === cardTheme));
    requestAnimationFrame(() => {
      el.scrollTo({ left: idx * el.clientWidth, behavior: "auto" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onThemeScroll() {
    const el = themeScrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    const id = CARD_THEMES[Math.max(0, Math.min(i, CARD_THEMES.length - 1))]?.id;
    if (id && id !== cardTheme) setCardTheme(id);
  }

  function scrollToTheme(i: number) {
    const el = themeScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

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
  const targets = list.filter(
    (a) => a.id !== fromId && (!fromAcct || a.currency === fromAcct.currency)
  );

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
    const cur = from.currency;
    const groupId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const rows: Record<string, unknown>[] = [
      {
        user_id: profileId,
        title: `${to.name} hesabına transfer`,
        amount: amt,
        type: "transfer",
        category: "transfer_out",
        date: tDate,
        currency: cur,
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
        currency: cur,
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
        currency: cur,
        bank_account_id: from.id,
        transfer_group_id: groupId,
        source: "web",
      });
    }

    setTSaving(true);
    try {
      const { error } = await supabase.from("transactions").insert(rows);
      if (error) throw error;

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
    setRouting("");
    setAccountNo("");
    setCardTheme("obsidian");
    setBalance("");
    setCurrency(defaultCurrency);
    setError(null);
    setOpen(true);
  }

  function openEdit(a: Account) {
    setEditing(a);
    setName(a.name);
    setType((a.type as AccountType) || "bank");
    setBankName(a.bank_name ?? "");
    setIban(a.iban ?? "");
    setRouting(a.routing_no ?? "");
    setAccountNo(a.account_no ?? "");
    setCardTheme(a.card_theme ?? "obsidian");
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
    const isPair = currency === "USD" || currency === "GBP";
    const isBank = type === "bank";
    const bal = Number(balance.replace(",", ".")) || 0;
    const payload = {
      name: name.trim(),
      type,
      bank_name: isBank ? bankName.trim() || null : null,
      iban: isBank && !isPair ? iban.trim() || null : null,
      routing_no: isBank && isPair ? routing.trim() || null : null,
      account_no: isBank && isPair ? accountNo.trim() || null : null,
      card_theme: cardTheme,
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
          .select(ACCT_COLS)
          .single();
        if (error) throw error;
        setList((prev) => prev.map((x) => (x.id === editing.id ? (data as Account) : x)));
      } else {
        const { data, error } = await supabase
          .from("bank_accounts")
          .insert({ ...payload, user_id: profileId, is_default: list.length === 0 })
          .select(ACCT_COLS)
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

  const balPreview = Number(balance.replace(",", ".")) || 0;

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
        <div className="acc-grid">
          {list.map((a) => (
            <div key={a.id} className="acc-card-wrap" onClick={() => openEdit(a)}>
              <div className="acc-actions">
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
              <AccountCard
                name={a.name}
                bankName={a.bank_name}
                iban={a.iban}
                accountNo={a.account_no}
                balance={Number(a.balance) || 0}
                currency={a.currency}
                type={(a.type as AccountType) || "bank"}
                theme={a.card_theme}
              />
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title={editing ? "Hesabı Düzenle" : "Yeni Hesap Ekle"}
          onClose={() => setOpen(false)}
          busy={saving}
        >
          <form onSubmit={handleSave}>
            {/* Kart tasarımı seçici — kaydırarak tema seç (canlı önizleme) */}
            <div className="acc-theme">
              <div
                className="acc-theme-scroll"
                ref={themeScrollRef}
                onScroll={onThemeScroll}
              >
                {CARD_THEMES.map((t) => (
                  <div key={t.id} className="acc-theme-item">
                    <AccountCard
                      name={name || "Hesap / Şirket Adı"}
                      bankName={bankName}
                      iban={fmt.kind === "iban" ? iban : undefined}
                      accountNo={fmt.kind === "pair" ? accountNo : undefined}
                      balance={balPreview}
                      currency={currency}
                      type={type}
                      theme={t.id}
                    />
                  </div>
                ))}
              </div>
              <div className="acc-theme-nav">
                <button
                  type="button"
                  className="acc-theme-arrow"
                  onClick={() => scrollToTheme(Math.max(0, themeIdx - 1))}
                  disabled={themeIdx === 0}
                  aria-label="Önceki tasarım"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="acc-dots">
                  {CARD_THEMES.map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`acc-dot${t.id === cardTheme ? " on" : ""}`}
                      onClick={() => scrollToTheme(i)}
                      aria-label={t.name}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="acc-theme-arrow"
                  onClick={() => scrollToTheme(Math.min(CARD_THEMES.length - 1, themeIdx + 1))}
                  disabled={themeIdx === CARD_THEMES.length - 1}
                  aria-label="Sonraki tasarım"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="acc-theme-cap">
                {getCardTheme(cardTheme).name} · kaydırarak kart tasarımını seç
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            {/* Hesap türü */}
            <div className="field">
              <div className="acc-label-row">
                <label>Hesap Türü</label>
                <button
                  type="button"
                  className="help-btn"
                  onClick={() => setInfo(ACCOUNT_TYPE_INFO[type])}
                  aria-label="Hesap türü bilgisi"
                >
                  <HelpCircle size={16} />
                </button>
              </div>
              <div className="acc-type-seg">
                {ACCOUNT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`acc-type-btn${type === t.id ? " on" : ""}`}
                    style={type === t.id ? { borderColor: t.accent, color: t.accent, background: `${t.accent}1f` } : undefined}
                    onClick={() => setType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label={nameLabel}>
              <input
                type="text"
                placeholder=""
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>

            {type === "bank" && (
              <>
                <Field label="Banka Adı">
                  <input
                    type="text"
                    placeholder={fmt.bank}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </Field>

                {fmt.kind === "iban" ? (
                  <Field label={fmt.label}>
                    <input
                      type="text"
                      placeholder={fmt.ph}
                      value={iban}
                      onChange={(e) => setIban(e.target.value.toLocaleUpperCase("tr"))}
                    />
                  </Field>
                ) : (
                  <div className="form-row">
                    <Field label={fmt.label1}>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={fmt.ph1}
                        value={routing}
                        onChange={(e) => setRouting(e.target.value)}
                      />
                    </Field>
                    <Field label={fmt.label2}>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={fmt.ph2}
                        value={accountNo}
                        onChange={(e) => setAccountNo(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </>
            )}

            {/* Para birimi çipleri */}
            <div className="field">
              <label>Para Birimi</label>
              <div className="cur-chip-row">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    className={`cur-chip${currency === c.code ? " on" : ""}`}
                    onClick={() => setCurrency(c.code)}
                  >
                    <span className="cur-flag">{c.flag}</span>
                    {c.code}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="acc-label-row">
                <label>
                  {editing ? "Bakiye" : "Açılış Bakiyesi"} ({getCurrencySymbol(currency)})
                </label>
                {!editing && (
                  <button
                    type="button"
                    className="help-btn"
                    onClick={() => setInfo(BALANCE_INFO)}
                    aria-label="Açılış bakiyesi bilgisi"
                  >
                    <HelpCircle size={16} />
                  </button>
                )}
              </div>
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
        </Modal>
      )}

      {info && (
        <Modal title={info.title} onClose={() => setInfo(null)}>
          <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            {info.body}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: 18 }}
            onClick={() => setInfo(null)}
          >
            Anladım
          </button>
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
                  setToId("");
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
                <DatePicker value={tDate} onChange={setTDate} />
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
