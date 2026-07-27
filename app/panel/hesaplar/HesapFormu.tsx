"use client";

/* HESAP (banka / nakit / POS) FORMU — TEK KOPYA
 * Aynı bileşeni iki yer açar: Hesaplar sayfası (ekle/düzenle) ve üst bardaki hızlı
 * ekleme adası (+). Ada açtığında kullanıcı bulunduğu sayfada KALIR.
 * Ayrıntılı gerekçe: `app/panel/HizliEkle.tsx` dosya başı notu.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { CARD_THEMES, getCardTheme } from "../../../lib/cardThemes";
import { CURRENCIES, getCurrencySymbol } from "../../../lib/currencies";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import AccountCard from "../../../components/ui/AccountCard";
import SaveButton from "../../../components/SaveButton";
import { HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";

export type AccountType = "bank" | "cash" | "pos";

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

export const ACCT_COLS =
  "id, name, type, bank_name, iban, routing_no, account_no, card_theme, balance, currency, is_default";

export const ACCOUNT_TYPES: { id: AccountType; label: string; accent: string }[] = [
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
export function acctFormat(currency: string) {
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

export default function HesapFormu({
  profileId,
  profileType,
  defaultCurrency,
  duzenlenen = null,
  onKapat,
  onKaydedildi,
}: {
  profileId: string;
  profileType: string;
  defaultCurrency: string;
  duzenlenen?: Account | null;
  onKapat: () => void;
  onKaydedildi?: (kayit: Account, yeniMi: boolean) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const submitLock = useSubmitLock();

  const [name, setName] = useState(duzenlenen?.name ?? "");
  const [type, setType] = useState<AccountType>(
    (duzenlenen?.type as AccountType) || "bank"
  );
  const [bankName, setBankName] = useState(duzenlenen?.bank_name ?? "");
  const [iban, setIban] = useState(duzenlenen?.iban ?? "");
  const [routing, setRouting] = useState(duzenlenen?.routing_no ?? "");
  const [accountNo, setAccountNo] = useState(duzenlenen?.account_no ?? "");
  const [cardTheme, setCardTheme] = useState(duzenlenen?.card_theme ?? "obsidian");
  const [balance, setBalance] = useState(
    duzenlenen ? String(duzenlenen.balance ?? "") : ""
  );
  const [currency, setCurrency] = useState(duzenlenen?.currency ?? defaultCurrency);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ title: string; body: string } | null>(null);

  const fmt = acctFormat(currency);
  const nameLabel =
    profileType === "business" ? "Hesap / Şirket Adı *" : "Hesap / Ad Soyad *";
  const balPreview = Number(balance.replace(",", ".")) || 0;

  // Kart tema şeridi: kaydırınca seçili tema güncellenir (mobil ile aynı his)
  const themeScrollRef = useRef<HTMLDivElement>(null);
  const themeIdx = Math.max(0, CARD_THEMES.findIndex((t) => t.id === cardTheme));

  // Açılışta kayıtlı temaya kaydır (bileşen her açılışta yeniden mount olur)
  useEffect(() => {
    const el = themeScrollRef.current;
    if (!el) return;
    const idx = Math.max(0, CARD_THEMES.findIndex((t) => t.id === cardTheme));
    requestAnimationFrame(() => {
      el.scrollTo({ left: idx * el.clientWidth, behavior: "auto" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (duzenlenen) {
        const { data, error } = await supabase
          .from("bank_accounts")
          .update(payload)
          .eq("id", duzenlenen.id)
          .select(ACCT_COLS)
          .single();
        if (error) throw error;
        onKaydedildi?.(data as Account, false);
      } else {
        /* İlk hesap varsayılan olur. ⚠️ Sayı DB'den sorulur, ekrandaki listeden DEĞİL:
           form üst bardaki hızlı ekleme adasından da açılabiliyor, orada liste yok. */
        const { count } = await supabase
          .from("bank_accounts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profileId);
        const { data, error } = await supabase
          .from("bank_accounts")
          .insert({ ...payload, user_id: profileId, is_default: (count ?? 0) === 0 })
          .select(ACCT_COLS)
          .single();
        if (error) throw error;
        onKaydedildi?.(data as Account, true);
      }
      onKapat();
      router.refresh();
    } catch {
      setError("Kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
  }

  return (
    <>
      <Modal
        title={duzenlenen ? "Hesabı Düzenle" : "Yeni Hesap Ekle"}
        onClose={onKapat}
        busy={saving}
      >
        <form onSubmit={handleSave}>
          {/* Kart tasarımı seçici — kaydırarak tema seç (canlı önizleme) */}
          <div className="acc-theme">
            <div className="acc-theme-scroll" ref={themeScrollRef} onScroll={onThemeScroll}>
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
                  style={
                    type === t.id
                      ? { borderColor: t.accent, color: t.accent, background: `${t.accent}1f` }
                      : undefined
                  }
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
                {duzenlenen ? "Bakiye" : "Açılış Bakiyesi"} ({getCurrencySymbol(currency)})
              </label>
              {!duzenlenen && (
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

          <SaveButton busy={saving} disabled={saving} style={{ marginTop: 4 }}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </SaveButton>
        </form>
      </Modal>

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
    </>
  );
}
