"use client";

/* GELİR / GİDER (İŞLEM) FORMU — TEK KOPYA
 * Aynı bileşeni iki yer açar: İşlemler sayfası (ekle/düzenle) ve üst bardaki hızlı
 * ekleme adası (+). Ada açtığında kullanıcı bulunduğu sayfada KALIR.
 * Ayrıntılı gerekçe: `app/panel/HizliEkle.tsx` dosya başı notu.
 *
 * ⚠️ Formun İKİ dış verisi var: HESAP kartları ve ÖZEL KATEGORİLER. İşlemler sayfası
 * ikisini de zaten elinde tutar → prop olarak verir, ikinci sorgu açılmaz. Üst bardan
 * açılınca sayfa yok → form ikisini de KENDİSİ çeker. Bu yüzden ikisi de opsiyonel.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { todayStr } from "../../../lib/date";
import { uploadReceipt, isPdfUrl, MAX_RECEIPTS, RECEIPT_ACCEPT } from "../../../lib/receipts";
import {
  CATEGORIES,
  INCOME_CATEGORIES,
  findCategory,
  type Category,
} from "../../../lib/categories";
import {
  fetchCustomCategories,
  createCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  uniqueCustomId,
  type CustomCategory,
} from "../../../lib/customCategories";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import DatePicker from "../../../components/ui/DatePicker";
import CategoryPicker from "../../../components/ui/CategoryPicker";
import AccountCard from "../../../components/ui/AccountCard";
import SaveButton from "../../../components/SaveButton";
import { Wallet, Plus, Upload, Paperclip, FileText, X } from "lucide-react";

export type Tx = {
  id: string;
  title: string;
  amount: string;
  type: string;
  category: string | null;
  date: string;
  currency: string | null;
  bank_account_id: string | null;
  transfer_group_id: string | null;
  created_at: string | null;
  note: string | null;
  source: string | null;
  receipt_url: string | null;
  receipt_urls: string[] | null;
  receipt_thumbnails: (string | null)[] | null;
};

export type Account = {
  id: string;
  name: string;
  type: string | null;
  bank_name: string | null;
  iban: string | null;
  account_no: string | null;
  card_theme: string | null;
  currency: string;
  balance: string;
};

export const TX_COLS =
  "id, title, amount, type, category, date, currency, bank_account_id, transfer_group_id, created_at, note, source, receipt_url, receipt_urls, receipt_thumbnails";

const ACCT_COLS_FORM =
  "id, name, type, bank_name, iban, account_no, card_theme, currency, balance";

export default function IslemFormu({
  profileId,
  currency,
  accounts: accountsProp,
  customCats: customCatsProp,
  duzenlenen = null,
  varsayilanTur = "income",
  onKapat,
  onKaydedildi,
  onKategoriDegisti,
}: {
  profileId: string;
  currency: string;
  /** İşlemler sayfası kendi listesini verir; verilmezse form kendisi çeker. */
  accounts?: Account[];
  /** Aynı mantık: sayfa elindekini verir, ada açtığında form kendisi çeker. */
  customCats?: CustomCategory[];
  duzenlenen?: Tx | null;
  varsayilanTur?: "income" | "expense";
  onKapat: () => void;
  onKaydedildi?: (kayit: Tx, yeniMi: boolean) => void;
  /** Sayfa kendi kategori listesini güncel tutabilsin diye (liste etiketleri için). */
  onKategoriDegisti?: (liste: CustomCategory[]) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const submitLock = useSubmitLock();

  const [type, setType] = useState<"income" | "expense">(
    duzenlenen ? (duzenlenen.type === "income" ? "income" : "expense") : varsayilanTur
  );
  const [amount, setAmount] = useState(
    duzenlenen ? String(duzenlenen.amount).replace(".", ",") : ""
  );
  const [title, setTitle] = useState(duzenlenen?.title ?? "");
  const [category, setCategory] = useState(duzenlenen?.category ?? "");
  const [date, setDate] = useState(duzenlenen?.date ?? todayStr());
  const [accountId, setAccountId] = useState(duzenlenen?.bank_account_id ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fiş/belge — yalnız YENİ işlemde (düzenlemede ekler detay çekmecesinden yönetiliyor)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Hesaplar: sayfa verdiyse onu kullan, vermediyse (üst bardan açıldıysa) kendin çek.
     ⚠️ `migrateLocalCategories` burada ÇAĞRILMAZ: o tek seferlik taşıma işi İşlemler
     sayfasının işi; formun her açılışında tekrarlanacak bir şey değil. */
  const [accounts, setAccounts] = useState<Account[]>(accountsProp ?? []);
  const [customCats, setCustomCats] = useState<CustomCategory[]>(customCatsProp ?? []);

  useEffect(() => {
    if (accountsProp) return;
    let alive = true;
    supabase
      .from("bank_accounts")
      .select(ACCT_COLS_FORM)
      .eq("user_id", profileId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (alive && data) setAccounts(data as Account[]);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    if (customCatsProp) return;
    let alive = true;
    fetchCustomCategories(profileId)
      .then((liste) => {
        if (alive) setCustomCats(liste);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // Prop'la gelen liste sonradan değişirse (sayfa tazeledi) forma da yansısın
  useEffect(() => {
    if (customCatsProp) setCustomCats(customCatsProp);
  }, [customCatsProp]);

  const customById = new Map(customCats.map((c) => [c.id, c as Category]));
  const catOf = (id: string | null | undefined): Category =>
    (id && customById.get(id)) || findCategory(id);

  // Seçili türe ait kategoriler (sabit + özel)
  const pickerCats: Category[] = [
    ...(type === "income" ? INCOME_CATEGORIES : CATEGORIES),
    ...customCats.filter((c) => c.type === type),
  ];

  function yayinla(liste: CustomCategory[]) {
    setCustomCats(liste);
    onKategoriDegisti?.(liste);
  }

  /* CategoryPicker id'yi ANINDA bekliyor (senkron) → iyimser ekle, kaydı arkadan yap.
     Kayıt tutmazsa geri al + söyle (sessiz "oldu" gösterme kuralı). */
  function handleCreateCustom(label: string, color: string, icon: string): string {
    const id = uniqueCustomId(label, customCats);
    const yeni: CustomCategory = { id, label, color, icon, type };
    yayinla([...customCats, yeni]);
    createCustomCategory(profileId, yeni).then((ok) => {
      if (!ok) {
        yayinla(customCats.filter((c) => c.id !== id));
        setError("Kategori kaydedilemedi. Tekrar dener misin?");
      }
    });
    return id;
  }

  function handleUpdateCustom(id: string, label: string, color: string, icon: string) {
    const oncesi = customCats;
    yayinla(customCats.map((c) => (c.id === id ? { ...c, label, color, icon } : c)));
    updateCustomCategory(profileId, id, { label, color, icon }).then((ok) => {
      if (!ok) {
        yayinla(oncesi);
        setError("Kategori güncellenemedi.");
      }
    });
  }

  function handleDeleteCustom(id: string) {
    const oncesi = customCats;
    yayinla(customCats.filter((c) => c.id !== id));
    if (category === id) setCategory(""); // seçili silindiyse temizle
    deleteCustomCategory(profileId, id).then((ok) => {
      if (!ok) {
        yayinla(oncesi);
        setError("Kategori silinemedi.");
      }
    });
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
    const { error } = await supabase.from("bank_accounts").update({ balance: next }).eq("id", id);
    // Finansal veri: bakiye yazımı sessizce başarısız olmasın — kullanıcı görüp doğrulasın.
    if (error) setError("Hesap bakiyesi güncellenemedi. Hesabı kontrol et.");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount.replace(",", "."));
    if (!amt || amt <= 0) {
      setError("Geçerli bir tutar gir.");
      return;
    }

    const account = accounts.find((a) => a.id === accountId);
    const txCurrency = account?.currency || (duzenlenen?.currency ?? currency);
    const catLabel = catOf(category).label;
    const payload = {
      title: title.trim() || catLabel,
      amount: amt,
      type,
      category: category || null,
      date,
      currency: txCurrency,
      bank_account_id: accountId || null,
    };

    if (!submitLock.acquire()) return;
    setSaving(true);
    try {
      if (duzenlenen) {
        const { data, error } = await supabase
          .from("transactions")
          .update(payload)
          .eq("id", duzenlenen.id)
          .select(TX_COLS)
          .single();
        if (error) throw error;

        // Bakiye mutabakatı: eski etkisini geri al, yenisini uygula
        if (duzenlenen.bank_account_id) {
          const oldAmt = Number(duzenlenen.amount) || 0;
          await adjustBalance(
            duzenlenen.bank_account_id,
            duzenlenen.type === "expense" ? oldAmt : -oldAmt
          );
        }
        if (accountId) {
          await adjustBalance(accountId, type === "expense" ? -amt : amt);
        }

        onKaydedildi?.(data as Tx, false);
      } else {
        const { data, error } = await supabase
          .from("transactions")
          .insert({ user_id: profileId, source: "web", ...payload })
          .select(TX_COLS)
          .single();
        if (error) throw error;

        if (accountId) {
          await adjustBalance(accountId, type === "expense" ? -amt : amt);
        }

        let row = data as Tx;
        // Eklenmek üzere seçilmiş dosyalar varsa, yeni işleme yükle
        if (pendingFiles.length > 0) {
          try {
            const urls: string[] = [];
            const thumbs: (string | null)[] = [];
            for (const file of pendingFiles.slice(0, MAX_RECEIPTS)) {
              urls.push(await uploadReceipt(profileId, row.id, file));
              thumbs.push(null);
            }
            await supabase
              .from("transactions")
              .update({
                receipt_urls: urls,
                receipt_thumbnails: thumbs,
                receipt_url: urls[0] ?? null,
              })
              .eq("id", row.id);
            row = {
              ...row,
              receipt_urls: urls,
              receipt_thumbnails: thumbs,
              receipt_url: urls[0] ?? null,
            };
          } catch {
            // İşlem kaydedildi; sadece ek yüklenemedi — sessiz geç, detaydan tekrar denenebilir
          }
        }
        setPendingFiles([]);
        onKaydedildi?.(row, true);
      }
      onKapat();
      router.refresh();
    } catch {
      setError("İşlem kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
      submitLock.release();
    }
  }

  return (
    <Modal
      title={duzenlenen ? "İşlemi Düzenle" : "İşlem Ekle"}
      onClose={onKapat}
      busy={saving}
      wide
    >
      <form onSubmit={handleSave}>
        <div className="type-toggle">
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

        <Field label="Hesap (opsiyonel)">
          {accounts.length > 0 ? (
            <div className="acct-card-row">
              <button
                type="button"
                className={`acct-pick none${accountId === "" ? " on" : ""}`}
                onClick={() => setAccountId("")}
              >
                <Wallet size={22} />
                <span className="acct-pick-none-t">Hesapsız</span>
                <span className="acct-pick-none-s">Hesaba bağlama</span>
              </button>
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`acct-pick${accountId === a.id ? " on" : ""}`}
                  onClick={() => setAccountId(a.id)}
                >
                  <AccountCard
                    name={a.name}
                    bankName={a.bank_name}
                    iban={a.iban}
                    accountNo={a.account_no}
                    balance={Number(a.balance) || 0}
                    currency={a.currency}
                    type={(a.type as "bank" | "cash" | "pos") || "bank"}
                    theme={a.card_theme}
                  />
                </button>
              ))}
            </div>
          ) : (
            <a href="/panel/hesaplar" className="field-empty-link">
              <Plus size={15} />
              Hesaplarını ekle, hangi hesaptan gittiğini takip et
            </a>
          )}
        </Field>

        <div className="form-row">
          <Field label="Kategori">
            <CategoryPicker
              value={category}
              onChange={setCategory}
              categories={pickerCats}
              onCreate={handleCreateCustom}
              customIds={customCats.filter((c) => c.type === type).map((c) => c.id)}
              onUpdate={handleUpdateCustom}
              onDelete={handleDeleteCustom}
            />
          </Field>
          <Field label="Tarih">
            <DatePicker value={date} onChange={setDate} />
          </Field>
        </div>

        {!duzenlenen && (
          <Field label={`Fiş / Belge (opsiyonel · max ${MAX_RECEIPTS})`}>
            <div
              className={`dropzone sm ${dragOver ? "over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const files = Array.from(e.dataTransfer.files || []);
                setPendingFiles((p) => [...p, ...files].slice(0, MAX_RECEIPTS));
              }}
            >
              <Upload size={18} />
              <div className="dz-title">Dosya sürükle ya da tıkla</div>
              <div className="dz-sub">PNG, JPG, PDF</div>
              <input
                ref={fileInputRef}
                type="file"
                accept={RECEIPT_ACCEPT}
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setPendingFiles((p) => [...p, ...files].slice(0, MAX_RECEIPTS));
                  e.target.value = "";
                }}
              />
            </div>
            {pendingFiles.length > 0 && (
              <div className="pending-files">
                {pendingFiles.map((f, i) => (
                  <span key={i} className="pending-chip">
                    {isPdfUrl(f.name) ? <FileText size={13} /> : <Paperclip size={13} />}
                    <span className="pf-name">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                      aria-label="Kaldır"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        )}

        <SaveButton busy={saving} disabled={saving} style={{ marginTop: 4 }}>
          {saving ? "Kaydediliyor…" : duzenlenen ? "Güncelle" : "Kaydet"}
        </SaveButton>
      </form>
    </Modal>
  );
}
