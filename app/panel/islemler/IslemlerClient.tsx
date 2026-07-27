"use client";
import AddButton from "../../../components/AddButton";
import { confirmDialog } from "../../components/confirm";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { announceRightPanel, useCloseOnOtherRightPanel, useOnDataChanged } from "../../../lib/rightPanel";
import { useServerSynced } from "../../../lib/useServerSynced";
import { useRealtimeRefresh } from "../../../lib/useRealtimeRefresh";
import { formatCurrency, formatDate, TZ } from "../../../lib/format";
import { todayStr, ymd } from "../../../lib/date";
import {
  uploadReceipt,
  removeReceiptFiles,
  isPdfUrl,
  MAX_RECEIPTS,
  RECEIPT_ACCEPT,
} from "../../../lib/receipts";
import {
  CATEGORIES,
  INCOME_CATEGORIES,
  findCategory,
  type Category,
} from "../../../lib/categories";
import {
  fetchCustomCategories,
  migrateLocalCategories,
  type CustomCategory,
} from "../../../lib/customCategories";
import PageHead from "../../../components/ui/PageHead";
import EmptyState from "../../../components/ui/EmptyState";
import { CategoryIcon } from "../../../lib/categoryIcons";
import { TrashIcon, EditIcon } from "../../../components/icons";
import { useAramaTohumu } from "../../../lib/useAramaTohumu";
import { useEkleTohumu } from "../../../lib/useEkleTohumu";
import IslemFormu, { type Tx, type Account, TX_COLS } from "./IslemFormu";
import {
  Search,
  X,
  Smartphone,
  Monitor,
  UserCog,
  Paperclip,
  Upload,
  FileText,
  ArrowRightLeft,
} from "lucide-react";

/* ⚠️ Gelir/gider formu BURADA DEĞİL: `IslemFormu` bileşeninde — üst bardaki hızlı ekleme
   adası (+) da aynı formu açıyor (kullanıcı hangi sayfadaysa orada). Tipler ve kolon
   listesi de orada; iki ayrı tanım olmasın diye buradan yeniden dışa aktarılıyor. */
export type { Tx, Account };

// Bir işlemin bakiyeye uyguladığı etki (mobil transactionStore.txBalanceDelta ile aynı):
// gelir +, transfer yönü kategoriden (transfer_in/adjust_in/collection_in +), diğer her şey −.
// collection_in EKSİK olması mobil tahsilat transferini web'den silmede bakiyeyi ters bozuyordu.
const INFLOW_CATEGORIES = new Set(["transfer_in", "adjust_in", "collection_in"]);
function appliedDelta(type: string, amount: number, category: string | null): number {
  if (type === "income") return amount;
  if (type === "transfer")
    return category && INFLOW_CATEGORIES.has(category) ? amount : -amount;
  return -amount;
}

// Tarihe göre yeniden eski (Supabase'in dönüşüyle aynı sıra)
const byDateDesc = (a: Tx, b: Tx) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0;

// İşlemin nereden eklendiği — serbest metin, genişletilebilir.
// boş/eski/mobil → Mobil uygulama; 'web' → Web paneli; 'accountant' → Muhasebeci.
function sourceMeta(source: string | null) {
  switch (source) {
    case "web":
      return { label: "Web paneli", Icon: Monitor };
    case "accountant":
      return { label: "Muhasebeci", Icon: UserCog };
    default:
      return { label: "Mobil uygulama", Icon: Smartphone };
  }
}

// created_at → "14:32"
function timeStr(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

// Eski tek-url + yeni dizi alanlarını birleştir
function receiptList(t: Tx): { url: string; thumb: string }[] {
  const urls = t.receipt_urls ?? (t.receipt_url ? [t.receipt_url] : []);
  const thumbs = t.receipt_thumbnails ?? [];
  return urls
    .filter(Boolean)
    .map((url, i) => ({ url, thumb: thumbs[i] || url }));
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
  const router = useRouter();
  /* ⚠️ useState DEĞİL: Parla (ya da başka bir sekme/telefon) işlem eklediğinde
     `router.refresh()` sunucuyu yeniden çalıştırıyor ama düz `useState` yeni prop'u
     görmezden geldiği için liste eski kalıyordu (24.07 canlı). Bkz. lib/useServerSynced. */
  const [list, setList] = useServerSynced<Tx[]>(initialTransactions);
  // Telefondan/başka sekmeden eklenen işlem CANLI düşsün (parla/sql/islemler-realtime.sql)
  useRealtimeRefresh("transactions", profileId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [selected, setSelected] = useState<Tx | null>(null); // sağ detay paneli
  // Parla sohbeti açılırsa detay çekmecesi kapansın (ikisi aynı sağ kenarı paylaşıyor)
  useCloseOnOtherRightPanel("tx-detay", () => setSelected(null));
  const [error, setError] = useState<string | null>(null);

  // Dosya ekleme (detay çekmecesi — formdaki fiş alanı `IslemFormu` içinde)
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const drawerInputRef = useRef<HTMLInputElement>(null);

  const accountName = (id: string | null) =>
    accounts.find((a) => a.id === id)?.name ?? null;

  /** Form açılırken hangi tür seçili gelsin (üst bardaki "Gelir ekle"/"Gider ekle"). */
  const [formTuru, setFormTuru] = useState<"income" | "expense">("income");

  /* Özel kategoriler — ORTAK TABLODAN (telefon + web + Parla aynı listeyi görür).
     İlk açılışta bu tarayıcıda kalmış eski yerel kategoriler bir kez tabloya taşınır. */
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      await migrateLocalCategories(profileId);
      const liste = await fetchCustomCategories(profileId);
      if (alive) setCustomCats(liste);
    })();
    return () => { alive = false; };
  }, [profileId]);

  /* Parla yeni bir kategori oluşturup işlemi onunla kaydedebilir → listeyi tazele,
     yoksa etiket çözülemez ve satırda ham kimlik görünür. */
  useOnDataChanged(() => {
    fetchCustomCategories(profileId).then(setCustomCats).catch(() => {});
  });

  // Kategori id → etiket+renk; önce özel kategoriler, sonra sabit katalog.
  const customById = new Map(customCats.map((c) => [c.id, c as Category]));
  const catOf = (id: string | null | undefined): Category =>
    (id && customById.get(id)) || findCategory(id);

  // Filtreler — anında, client-side
  const [query, setQuery] = useState("");
  // Panel geneli aramadan gelindiyse (?q=) kutuyu doldur
  useAramaTohumu(setQuery);
  const [ftype, setFtype] = useState<"all" | "income" | "expense">("all");
  const [fcat, setFcat] = useState("");
  // Para birimi filtresi ("" = tümü). Çip yalnızca >1 para birimi varsa gösterilir.
  const [fcur, setFcur] = useState("");
  // Ay filtresi (YYYY-MM); boş = son 100 işlem. Doluysa DB'den o ay çekilir.
  const [month, setMonth] = useState("");
  const [loadingMonth, setLoadingMonth] = useState(false);

  const allCats = Array.from(
    new Map(
      [...CATEGORIES, ...INCOME_CATEGORIES, ...customCats].map((c) => [c.id, c])
    ).values()
  );
  // Kullanıcının kullandığı para birimleri (hesaplar + işlemler). >1 ise çip çıkar.
  const currencies = Array.from(
    new Set([
      ...accounts.map((a) => a.currency),
      ...list.map((t) => t.currency || currency),
    ])
  ).filter(Boolean);
  const multiCurrency = currencies.length > 1;

  const q = query.trim().toLocaleLowerCase("tr");
  const filtered = list.filter((t) => {
    if (ftype !== "all" && t.type !== ftype) return false;
    if (fcat && t.category !== fcat) return false;
    if (fcur && (t.currency || currency) !== fcur) return false;
    if (q) {
      const hay = `${t.title} ${catOf(t.category).label}`.toLocaleLowerCase("tr");
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Ay seçimi değişince ilgili dönemi DB'den getir (boş → başlangıç listesi)
  useEffect(() => {
    if (!month) {
      setList(initialTransactions);
      return;
    }
    let active = true;
    setLoadingMonth(true);
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const end = ymd(new Date(y, m, 1)); // sonraki ayın 1'i (m 1-tabanlı → Date 0-tabanlı)
    supabase
      .from("transactions")
      .select(TX_COLS)
      .eq("user_id", profileId)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          // Hata yutulmasın: yoksa spinner sonsuza dek takılı kalırdı.
          setError("İşlemler yüklenemedi. Tekrar dene.");
          setLoadingMonth(false);
          return;
        }
        setList((data as Tx[]) ?? []);
        setLoadingMonth(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // Esc → detay panelini kapat (overlay yok; üst bar/sayfa tıklanabilir kalsın diye)
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // tur: üst bardaki hızlı ekleme "Gelir ekle" / "Gider ekle" derken önceden seçsin diye.
  // Üst bardaki hızlı ekleme adasından gelindiyse formu aç (?ekle=…)
  useEkleTohumu((v) => openAdd(v === "gider" ? "expense" : "income"));

  function openAdd(tur: "income" | "expense" = "income") {
    setEditing(null);
    setFormTuru(tur);
    setOpen(true);
  }

  function openEdit(t: Tx) {
    setEditing(t);
    setOpen(true);
  }

  // Eki aç. PDF'ler bazen yanlış content-type (image/jpeg) ile saklanıyor
  // (mobil yüklemeleri) → tarayıcı bozuk gösterir. Doğru MIME'li blob ile açarız.
  async function openReceipt(url: string) {
    if (isPdfUrl(url)) {
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const objUrl = URL.createObjectURL(
          new Blob([buf], { type: "application/pdf" })
        );
        window.open(objUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
        return;
      } catch {
        // çekilemezse düz aç
      }
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // transactions satırının ek kolonlarını güncelle + state'i tazele
  function applyReceipts(txId: string, urls: string[], thumbs: (string | null)[]) {
    const patch = {
      receipt_urls: urls,
      receipt_thumbnails: thumbs,
      receipt_url: urls[0] ?? null,
    };
    setList((prev) =>
      prev.map((x) => (x.id === txId ? { ...x, ...patch } : x))
    );
    setSelected((prev) => (prev && prev.id === txId ? { ...prev, ...patch } : prev));
  }

  // Var olan bir işleme dosya(lar) ekle (detay paneli)
  async function attachToTx(t: Tx, files: File[]) {
    const current = t.receipt_urls ?? (t.receipt_url ? [t.receipt_url] : []);
    const slots = MAX_RECEIPTS - current.length;
    if (slots <= 0 || files.length === 0) return;
    setUploading(true);
    try {
      const urls = [...current];
      const thumbs = [...(t.receipt_thumbnails ?? [])];
      while (thumbs.length < current.length) thumbs.push(null);
      for (const file of files.slice(0, slots)) {
        const url = await uploadReceipt(profileId, t.id, file);
        urls.push(url);
        thumbs.push(null); // PDF küçük resmi mobilde üretiliyor; web düz URL/ikon gösterir
      }
      const { error } = await supabase
        .from("transactions")
        .update({
          receipt_urls: urls,
          receipt_thumbnails: thumbs,
          receipt_url: urls[0] ?? null,
        })
        .eq("id", t.id);
      if (error) throw error;
      applyReceipts(t.id, urls, thumbs);
      // Sunucu verisini + istemci önbelleğini tazele → başka sayfaya gidip dönünce bayat liste/bakiye görünmez.
      router.refresh();
    } catch {
      setError("Dosya yüklenemedi. Tekrar dene.");
    } finally {
      setUploading(false);
    }
  }

  // Detay panelinde bir eki kaldır
  async function removeAttachment(t: Tx, idx: number) {
    const urls = [...(t.receipt_urls ?? (t.receipt_url ? [t.receipt_url] : []))];
    const thumbs = [...(t.receipt_thumbnails ?? [])];
    const removed = urls[idx];
    if (!removed) return;
    if (!(await confirmDialog({ message: "Bu ek kaldırılsın mı?", danger: true }))) return;
    urls.splice(idx, 1);
    const removedThumb = thumbs.splice(idx, 1)[0] ?? null;
    setUploading(true);
    try {
      await removeReceiptFiles([removed, removedThumb]);
      const { error } = await supabase
        .from("transactions")
        .update({
          receipt_urls: urls,
          receipt_thumbnails: thumbs,
          receipt_url: urls[0] ?? null,
        })
        .eq("id", t.id);
      if (error) throw error;
      applyReceipts(t.id, urls, thumbs);
      router.refresh();
    } catch {
      setError("Ek kaldırılamadı. Tekrar dene.");
    } finally {
      setUploading(false);
    }
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

  async function handleDelete(t: Tx) {
    // Transfer → iki bacak (+ varsa ücret) tek grupta; hepsi birlikte silinmeli
    if (t.type === "transfer" && t.transfer_group_id) {
      if (!(await confirmDialog({ message: "Bu bir transfer. Karşı bacağıyla birlikte silinsin mi?", danger: true }))) return;
      const { data: legs } = await supabase
        .from("transactions")
        .select("id, amount, type, category, bank_account_id")
        .eq("transfer_group_id", t.transfer_group_id);
      if (!legs) return;

      // ÖNCE grubu sil (hata varsa bakiyelere dokunmadan çık — yoksa silme başarısız olup
      // bakiyeler geri alınmış kalır, tutarsızlık olurdu). Sonra her bacağın bakiye etkisini geri al.
      const { error: delErr } = await supabase
        .from("transactions")
        .delete()
        .eq("transfer_group_id", t.transfer_group_id);
      if (delErr) {
        setError("Transfer silinemedi. Tekrar dene.");
        return;
      }
      for (const leg of legs) {
        if (leg.bank_account_id) {
          const delta = appliedDelta(leg.type, Number(leg.amount) || 0, leg.category);
          await adjustBalance(leg.bank_account_id, -delta);
        }
      }
      const ids = new Set(legs.map((l) => l.id));
      setList((prev) => prev.filter((x) => !ids.has(x.id)));
      router.refresh();
      return;
    }

    if (!(await confirmDialog({ message: "Bu işlem silinsin mi?", danger: true }))) return;
    const { error } = await supabase.from("transactions").delete().eq("id", t.id);
    if (error) return;

    // Bakiyeyi geri al (silinen gider → +, gelir → −)
    if (t.bank_account_id) {
      const amt = Number(t.amount) || 0;
      await adjustBalance(t.bank_account_id, t.type === "expense" ? amt : -amt);
    }
    setList((prev) => prev.filter((x) => x.id !== t.id));
    router.refresh();
  }

  const hasAny = list.length > 0 || month !== "";

  return (
    <>
      <div className={`tx-area${selected ? " shifted" : ""}`}>
      <PageHead
        title="İşlemler"
        sub="Gelir ve giderlerin"
        action={
          <AddButton onClick={openAdd}>İşlem Ekle</AddButton>
        }
      />

      {!hasAny ? (
        <EmptyState
          icon={<ArrowRightLeft />}
          title="Henüz işlem yok"
          hint="Gelir ve giderlerini buraya kaydettikçe kategori dağılımın, aylık özetin ve raporların kendiliğinden oluşur."
          action={<AddButton onClick={openAdd}>İlk İşlemini Ekle</AddButton>}
        />
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
            {multiCurrency && (
              <div className="chip-seg">
                <button
                  className={fcur === "" ? "active" : ""}
                  onClick={() => setFcur("")}
                >
                  Tüm dövizler
                </button>
                {currencies.map((c) => (
                  <button
                    key={c}
                    className={fcur === c ? "active" : ""}
                    onClick={() => setFcur(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
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
            <input
              type="month"
              className="chip-month"
              value={month}
              max={todayStr().slice(0, 7)}
              onChange={(e) => setMonth(e.target.value)}
              title="Aya göre filtrele"
            />
            {month && (
              <button className="chip-seg" onClick={() => setMonth("")}>
                <span style={{ padding: "4px 10px" }}>Son 100 işlem</span>
              </button>
            )}
          </div>

          {loadingMonth ? (
            <div className="panel-empty">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <div className="panel-empty">
              {month ? "Bu ayda işlem yok." : "Filtreye uyan işlem yok."}
            </div>
          ) : (
            <div className="tx-list">
              {filtered.map((t) => {
                const isIncome = t.type === "income";
                const isExpense = t.type === "expense";
                const sign = isIncome ? "+" : isExpense ? "−" : "";
                const cls = isIncome ? "pos" : isExpense ? "neg" : "";
                const cat = catOf(t.category);
                return (
                  <div
                    key={t.id}
                    className="tx-row tx-row-click"
                    onClick={() => {
                      setError(null);
                      setSelected(t);
                      announceRightPanel("tx-detay"); // Parla açıksa kapansın (sağ kenar tek panel)
                    }}
                  >
                    <div className="tx-main">
                      <span className="tx-cat-ic" style={{ background: `${cat.color}22` }}>
                        <CategoryIcon name={cat.icon} color={cat.color} size={17} />
                      </span>
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
                      <div className="tx-actions">
                        {t.type !== "transfer" && (
                          <button
                            className="anim-act edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(t);
                            }}
                            aria-label="Düzenle"
                          >
                            <EditIcon />
                          </button>
                        )}
                        <button
                          className="anim-act del"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(t);
                          }}
                          aria-label="Sil"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </div>

      {open && (
        <IslemFormu
          profileId={profileId}
          currency={currency}
          accounts={accounts}
          customCats={customCats}
          duzenlenen={editing}
          varsayilanTur={formTuru}
          onKapat={() => {
            setOpen(false);
            setEditing(null);
          }}
          onKategoriDegisti={setCustomCats}
          onKaydedildi={(kayit, yeniMi) =>
            setList((prev) =>
              (yeniMi
                ? [kayit, ...prev]
                : prev.map((x) => (x.id === kayit.id ? kayit : x))
              ).sort(byDateDesc)
            )
          }
        />
      )}

      {selected &&
        (() => {
          const t = selected;
          const isIncome = t.type === "income";
          const isExpense = t.type === "expense";
          const isTransfer = t.type === "transfer";
          const sign = isIncome ? "+" : isExpense ? "−" : "";
          const cls = isIncome ? "pos" : isExpense ? "neg" : "";
          const cat = catOf(t.category);
          const src = sourceMeta(t.source);
          const receipts = receiptList(t);
          const typeLabel = isIncome
            ? "Gelir"
            : isExpense
            ? "Gider"
            : "Transfer";
          return (
            <>
              <aside className="tx-drawer">
                <div className="drawer-head">
                  <span className="drawer-title">İşlem Detayı</span>
                  <button
                    className="anim-act cls"
                    onClick={() => setSelected(null)}
                    aria-label="Kapat"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="drawer-amount">
                  <span className={`tx-amount ${cls}`}>
                    {sign}
                    {formatCurrency(Number(t.amount) || 0, t.currency || currency)}
                  </span>
                  <span className={`drawer-type ${cls}`}>{typeLabel}</span>
                </div>
                <div className="drawer-name">{t.title}</div>

                <div className="drawer-rows">
                  <div className="drawer-row">
                    <span className="dr-k">Kategori</span>
                    <span className="dr-v">
                      <span className="tx-cat-ic" style={{ background: `${cat.color}22` }}>
                        <CategoryIcon name={cat.icon} color={cat.color} size={15} />
                      </span>
                      {cat.label}
                    </span>
                  </div>
                  <div className="drawer-row">
                    <span className="dr-k">Tarih</span>
                    <span className="dr-v">{formatDate(t.date)}</span>
                  </div>
                  {timeStr(t.created_at) && (
                    <div className="drawer-row">
                      <span className="dr-k">Saat</span>
                      <span className="dr-v">{timeStr(t.created_at)}</span>
                    </div>
                  )}
                  {accountName(t.bank_account_id) && (
                    <div className="drawer-row">
                      <span className="dr-k">Hesap</span>
                      <span className="dr-v">{accountName(t.bank_account_id)}</span>
                    </div>
                  )}
                  <div className="drawer-row">
                    <span className="dr-k">Eklendiği yer</span>
                    <span className="dr-v">
                      <src.Icon size={14} style={{ opacity: 0.8 }} />
                      {src.label}
                    </span>
                  </div>
                  {t.note && (
                    <div className="drawer-row col">
                      <span className="dr-k">Not</span>
                      <span className="dr-v note">{t.note}</span>
                    </div>
                  )}
                </div>

                <div className="drawer-receipts">
                  <div className="dr-k" style={{ marginBottom: 10 }}>
                    <Paperclip size={13} style={{ marginRight: 5, verticalAlign: "-2px" }} />
                    Ekli dosya / görsel ({receipts.length}/{MAX_RECEIPTS})
                  </div>

                  {error && (
                    <div className="form-error" style={{ marginBottom: 10 }}>
                      {error}
                    </div>
                  )}

                  {receipts.length > 0 && (
                    <div className="dr-thumbs">
                      {receipts.map((r, i) => {
                        const pdf = isPdfUrl(r.url);
                        return (
                          <div key={i} className="dr-thumb-wrap">
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dr-thumb"
                              title="Aç"
                              onClick={(e) => {
                                e.preventDefault();
                                openReceipt(r.url);
                              }}
                            >
                              {pdf ? (
                                <span className="dr-pdf">
                                  <FileText size={22} />
                                  PDF
                                </span>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.thumb} alt={`Ek ${i + 1}`} />
                              )}
                            </a>
                            <button
                              className="dr-thumb-x"
                              onClick={() => removeAttachment(t, i)}
                              disabled={uploading}
                              aria-label="Kaldır"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {receipts.length < MAX_RECEIPTS && (
                    <div
                      className={`dropzone ${dragOver ? "over" : ""} ${uploading ? "busy" : ""}`}
                      onClick={() => !uploading && drawerInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const files = Array.from(e.dataTransfer.files || []);
                        if (files.length) attachToTx(t, files);
                      }}
                    >
                      <Upload size={20} />
                      <div className="dz-title">
                        {uploading ? "Yükleniyor…" : "Dosyayı buraya sürükle ya da tıkla"}
                      </div>
                      <div className="dz-sub">Fiş, fatura veya belge · PNG, JPG, PDF</div>
                      <input
                        ref={drawerInputRef}
                        type="file"
                        accept={RECEIPT_ACCEPT}
                        multiple
                        hidden
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) attachToTx(t, files);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="drawer-actions">
                  {!isTransfer && (
                    <button
                      className="anim-act edit"
                      aria-label="Düzenle"
                      onClick={() => {
                        setSelected(null);
                        openEdit(t);
                      }}
                    >
                      <EditIcon />
                    </button>
                  )}
                  <button
                    className="anim-act del"
                    aria-label="Sil"
                    onClick={async () => {
                      await handleDelete(t);
                      setSelected(null);
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </aside>
            </>
          );
        })()}
    </>
  );
}
