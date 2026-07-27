"use client";
import AddButton from "../../../components/AddButton";
import SaveButton from "../../../components/SaveButton";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { createClient } from "../../../lib/supabase/client";
import { useServerSynced } from "../../../lib/useServerSynced";
import { formatCurrency } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import PageHead from "../../../components/ui/PageHead";
import EmptyState from "../../../components/ui/EmptyState";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import DatePicker from "../../../components/ui/DatePicker";
import AccountCard from "../../../components/ui/AccountCard";
import { EditIcon, TrashIcon } from "../../../components/icons";
import { ArrowRightLeft, CreditCard } from "lucide-react";
import { useEkleTohumu } from "../../../lib/useEkleTohumu";
import HesapFormu, {
  type Account,
  type AccountType,
  ACCOUNT_TYPES,
} from "./HesapFormu";

/* ⚠️ Hesap ekleme/düzenleme formu BURADA DEĞİL: `HesapFormu` bileşeninde — üst bardaki
   hızlı ekleme adası (+) da aynı formu açıyor (kullanıcı hangi sayfadaysa orada).
   Bu dosyada kalan modal: hesaplar arası TRANSFER (adada karşılığı yok). */
export type { Account };

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
  const router = useRouter();
  /* Sunucu verisi değişince liste kendini tazeler — üst bardaki hızlı ekleme adasından (+)
     başka bir sayfadayken kayıt eklenirse `router.refresh()` sonrası burada da görünsün. */
  const [list, setList] = useServerSynced<Account[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);


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
    const { error } = await supabase.from("bank_accounts").update({ balance: next }).eq("id", id);
    if (error) {
      // Bakiye yazımı başarısız → null dön (çağıran null'ı zaten ele alıyor), sessiz başarı olmasın.
      setTError("Bakiye güncellenemedi. Tekrar dene.");
      return null;
    }
    return next;
  }

  const submitLock = useSubmitLock();

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

    if (!submitLock.acquire()) return;
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
      // Sunucu verisini + istemci önbelleğini tazele → başka sayfaya gidip dönünce bayat liste/bakiye görünmez.
      router.refresh();
    } catch {
      setTError("Transfer kaydedilemedi. Tekrar dene.");
    } finally {
      setTSaving(false);
      submitLock.release();
    }
  }

  // Üst bardaki hızlı ekleme adasından gelindiyse formu aç (?ekle=…)
  useEkleTohumu(() => openNew());

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(a: Account) {
    setEditing(a);
    setOpen(true);
  }

  async function handleDelete(a: Account) {
    if (!(await confirmDialog({ message: `"${a.name}" hesabı silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("bank_accounts").delete().eq("id", a.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== a.id));
    router.refresh();
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
            <AddButton onClick={openNew}>Hesap Ekle</AddButton>
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
        <EmptyState
          icon={<CreditCard />}
          title="Henüz hesap yok"
          hint="Banka ya da nakit hesabını ekle; işlemlerini hesaba bağladığında bakiyen kendiliğinden güncellenir."
          action={<AddButton onClick={openNew}>İlk Hesabını Ekle</AddButton>}
        />
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
        <HesapFormu
          profileId={profileId}
          profileType={profileType}
          defaultCurrency={defaultCurrency}
          duzenlenen={editing}
          onKapat={() => setOpen(false)}
          onKaydedildi={(kayit, yeniMi) =>
            setList((prev) =>
              yeniMi ? [...prev, kayit] : prev.map((x) => (x.id === kayit.id ? kayit : x))
            )
          }
        />
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

            <SaveButton busy={tSaving} disabled={tSaving || targets.length === 0} style={{ marginTop: 4 }}>
              {tSaving ? "Aktarılıyor…" : "Transfer Et"}
            </SaveButton>
          </form>
        </Modal>
      )}
    </>
  );
}
