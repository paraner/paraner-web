"use client";
import { confirmDialog } from "../../components/confirm";
import { showToast } from "../../components/toast";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { useServerSynced } from "../../../lib/useServerSynced";
import { announceRightPanel, useCloseOnOtherRightPanel } from "../../../lib/rightPanel";
import { formatCurrency, formatDate } from "../../../lib/format";
import { todayStr } from "../../../lib/date";
import { toCsv, downloadCsv } from "../../../lib/csv";
import PageHead from "../../../components/ui/PageHead";
import EmptyState from "../../../components/ui/EmptyState";
import AddButton from "../../../components/AddButton";
import { TrashIcon } from "../../../components/icons";
import { X, Search, Download, Check, Printer, FileText } from "lucide-react";
import { useAramaTohumu } from "../../../lib/useAramaTohumu";
import { useEkleTohumu } from "../../../lib/useEkleTohumu";
import InvoicePrint, {
  type PrintSeller,
  type PrintItem,
} from "../../../components/InvoicePrint";
import FaturaFormu, { type Invoice } from "./FaturaFormu";

/* ⚠️ Fatura oluşturma formu BURADA DEĞİL: `FaturaFormu` bileşeninde — üst bardaki hızlı
   ekleme adası (+) da aynı formu açıyor (kullanıcı hangi sayfadaysa orada). */
export type { Invoice };

// Gerçek due_date kolonu VAR (mobil yazıyor). Yoksa fatura tarihinden türetilir.
const OVERDUE_DAYS = 30;

type StatusKey = "draft" | "sent" | "partial" | "paid" | "overdue" | "cancelled";

const STATUS_META: Record<StatusKey, { label: string; badge: string }> = {
  draft: { label: "Taslak", badge: "gray" },
  sent: { label: "Gönderildi", badge: "blue" },
  partial: { label: "Kısmi ödendi", badge: "amber" },
  paid: { label: "Ödendi", badge: "green" },
  overdue: { label: "Vadesi geçti", badge: "red" },
  cancelled: { label: "İptal", badge: "gray" },
};

function invStatus(inv: Invoice): StatusKey {
  if (inv.payment_status === "paid") return "paid";
  if (inv.status === "cancelled") return "cancelled";
  if ((inv.status ?? "sent") === "draft") return "draft";
  if (inv.payment_status === "partial") return "partial";
  // Vade: gerçek due_date, yoksa invoice_date + 30g (mobil ile aynı türetme)
  const dueBase = inv.due_date ?? inv.invoice_date;
  if (dueBase) {
    const due = new Date(dueBase);
    if (!inv.due_date) due.setDate(due.getDate() + OVERDUE_DAYS);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return "overdue";
  }
  return "sent";
}

export default function FaturalarClient({
  profileId,
  currency,
  invoicePrefix,
  invoices: initial,
  seller,
  initialFilter,
}: {
  profileId: string;
  currency: string;
  invoicePrefix: string;
  invoices: Invoice[];
  seller: PrintSeller | null;
  initialFilter: "all" | "income" | "expense";
}) {
  const supabase = createClient();
  const router = useRouter();
  /* Sunucu verisi değişince liste kendini tazeler — üst bardaki hızlı ekleme adasından (+)
     başka bir sayfadayken kayıt eklenirse `router.refresh()` sonrası burada da görünsün. */
  const [list, setList] = useServerSynced<Invoice[]>(initial);
  // Tür filtresi (Tümü / Satış / Alış) — derin-link ?type= ile başlar
  const [listFilter, setListFilter] = useState(initialFilter);
  useEffect(() => setListFilter(initialFilter), [initialFilter]);
  // Durum filtresi (Tümü / Taslak / Gönderildi / Ödendi / Vadesi geçti)
  const [statusFilter, setStatusFilter] = useState<"all" | StatusKey>("all");
  // Arama + tarih aralığı
  const [query, setQuery] = useState("");
  // Panel geneli aramadan gelindiyse (?q=) kutuyu doldur
  useAramaTohumu(setQuery);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [open, setOpen] = useState(false);

  const [selected, setSelected] = useState<Invoice | null>(null); // sağ detay paneli
  // Parla sohbeti açılırsa detay çekmecesi kapansın (ikisi aynı sağ kenarı paylaşıyor)
  useCloseOnOtherRightPanel("fatura-detay", () => setSelected(null));
  const [busyId, setBusyId] = useState<string | null>(null); // ödendi işaretleme

  // Yazdırılabilir fatura önizlemesi (Aşama 1)
  const [printInv, setPrintInv] = useState<Invoice | null>(null);
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const [printLoading, setPrintLoading] = useState(false);

  async function openPrint(inv: Invoice) {
    if (printLoading) return;
    // Satıcı bilgisi yoksa çıktı yasal olmaz → kullanıcıyı Ayarlar'a yönlendir
    if (!seller || !(seller.company_name || seller.profile_name)) {
      showToast({
        title: "Şirket bilgileri eksik",
        message: "Yazdırmadan önce Ayarlar → Hesap Bilgileri'nden şirket bilgilerini gir.",
        variant: "error",
      });
      return;
    }
    setPrintLoading(true);
    // Kalemleri çek (web bunları hiç okumuyordu — çıktı için ilk kez lazım).
    const { data } = await supabase
      .from("invoice_items")
      .select("description, quantity, unit, unit_price, vat_rate, total")
      .eq("invoice_id", inv.id);
    setPrintItems((data as PrintItem[]) ?? []);
    setPrintInv(inv);
    setPrintLoading(false);
  }

  function openNew() {
    setOpen(true);
  }

  // Üst bardaki hızlı ekleme adasından gelindiyse formu aç (?ekle=…)
  useEkleTohumu(() => openNew());

  // Özet (yüklü faturalar üzerinden)
  const sum = (rows: Invoice[]) =>
    rows.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalSales = sum(list.filter((i) => i.type === "income"));
  const totalPurchase = sum(list.filter((i) => i.type === "expense"));
  const totalUnpaid = sum(list.filter((i) => i.payment_status !== "paid"));

  // Filtreler: tür → durum → arama → tarih aralığı
  const q = query.trim().toLocaleLowerCase("tr");
  const filtered = list.filter((i) => {
    if (listFilter !== "all" && i.type !== listFilter) return false;
    if (statusFilter !== "all" && invStatus(i) !== statusFilter) return false;
    if (q) {
      const hay = `${i.customer_name ?? ""} ${i.invoice_number ?? ""}`.toLocaleLowerCase("tr");
      if (!hay.includes(q)) return false;
    }
    if (dateFrom && (i.invoice_date ?? "") < dateFrom) return false;
    if (dateTo && (i.invoice_date ?? "") > dateTo) return false;
    return true;
  });

  const head =
    listFilter === "income"
      ? { title: "Satış Faturaları", sub: "Kestiğin faturalar" }
      : listFilter === "expense"
      ? { title: "Alış Faturaları", sub: "Aldığın faturalar" }
      : { title: "Faturalar", sub: "Kestiğin ve aldığın faturalar" };

  // Durum çipleri (mevcut listede geçen sayıya göre)
  const scopeForStatus = list.filter(
    (i) => listFilter === "all" || i.type === listFilter
  );
  const statusCount = (k: "all" | StatusKey) =>
    k === "all" ? scopeForStatus.length : scopeForStatus.filter((i) => invStatus(i) === k).length;


  async function markPaid(inv: Invoice) {
    setBusyId(inv.id);
    const total = Number(inv.amount) || 0;
    // status='paid' de set et (mobil paritesi — mobil ikisini birden yazıyor).
    const { error } = await supabase
      .from("invoices")
      .update({ payment_status: "paid", status: "paid", paid_amount: total })
      .eq("id", inv.id);
    if (error) {
      setBusyId(null);
      return;
    }
    // Taslak faturada oluşturmada transaction yazılmamıştı → paid'e geçince ciroya gir.
    if (inv.status === "draft") {
      await supabase.from("transactions").insert({
        user_id: profileId,
        invoice_id: inv.id,
        title: inv.invoice_number ? `${inv.invoice_number} - ${inv.customer_name ?? ""}`.trim() : (inv.customer_name ?? "Fatura"),
        amount: total,
        type: inv.type ?? "income",
        category: "Fatura",
        date: inv.invoice_date ?? todayStr(),
        currency: inv.currency ?? currency,
        source: "web",
      });
    }
    setBusyId(null);
    const upd = { ...inv, payment_status: "paid", status: "paid", paid_amount: String(total) };
    setList((prev) => prev.map((x) => (x.id === inv.id ? upd : x)));
    setSelected((s) => (s && s.id === inv.id ? upd : s));
    router.refresh();
  }

  async function handleDelete(inv: Invoice) {
    if (!(await confirmDialog({ message: `${inv.invoice_number ?? "Fatura"} silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== inv.id));
    setSelected((s) => (s && s.id === inv.id ? null : s));
    router.refresh();
  }

  function exportCsv() {
    const rows = [
      ["No", "Tür", "Müşteri/Firma", "Tarih", "Durum", "KDV Hariç", "KDV", "Toplam", "Para"],
      ...filtered.map((i) => [
        i.invoice_number ?? "",
        i.type === "income" ? "Satış" : "Alış",
        i.customer_name ?? "",
        i.invoice_date ? formatDate(i.invoice_date) : "",
        STATUS_META[invStatus(i)].label,
        String(i.subtotal ?? ""),
        String(i.vat_amount ?? ""),
        String(i.amount ?? ""),
        i.currency ?? currency,
      ]),
    ];
    downloadCsv(`faturalar-${todayStr()}.csv`, toCsv(rows));
  }

  const STATUS_CHIPS: ("all" | StatusKey)[] = ["all", "draft", "sent", "overdue", "paid"];

  return (
    <>
      {/* Çekmece açıkken içerik sola daralır (padding-right) → liste drawer'ın ALTINA girmez.
          İşlemler ile aynı desen (.tx-area / .shifted). */}
      <div className={`tx-area${selected ? " shifted" : ""}`}>
      <PageHead
        title={head.title}
        sub={head.sub}
        action={<AddButton onClick={openNew}>Fatura Oluştur</AddButton>}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="Henüz fatura yok"
          hint="Faturanı oluştur; tahsilat durumu, KDV toplamın ve vadesi geçenler bu ekranda takip edilir."
          action={<AddButton onClick={openNew}>İlk Faturanı Oluştur</AddButton>}
        />
      ) : (
        <>
          <div className="total-banner">
            <div className="t-item">
              <div className="t-label">Toplam Satış</div>
              <div className="t-value">{formatCurrency(totalSales, currency)}</div>
            </div>
            <div className="t-item">
              <div className="t-label">Toplam Alış</div>
              <div className="t-value" style={{ color: "var(--danger)" }}>
                {formatCurrency(totalPurchase, currency)}
              </div>
            </div>
            <div className="t-item">
              <div className="t-label">Ödenmemiş</div>
              <div className="t-value" style={{ color: "var(--warning)" }}>
                {formatCurrency(totalUnpaid, currency)}
              </div>
            </div>
          </div>

          {/* Tür sekmeleri */}
          <div className="chip-seg" style={{ marginBottom: 10 }}>
            <button
              className={listFilter === "all" ? "active" : ""}
              onClick={() => setListFilter("all")}
            >
              Tümü
            </button>
            <button
              className={listFilter === "income" ? "active on-income" : ""}
              onClick={() => setListFilter("income")}
            >
              Satış
            </button>
            <button
              className={listFilter === "expense" ? "active on-expense" : ""}
              onClick={() => setListFilter("expense")}
            >
              Alış
            </button>
          </div>

          {/* Araç çubuğu: durum çipleri + arama + tarih + CSV */}
          <div className="inv-toolbar">
            <div className="chip-seg inv-status">
              {STATUS_CHIPS.map((k) => (
                <button
                  key={k}
                  className={statusFilter === k ? "active" : ""}
                  onClick={() => setStatusFilter(k)}
                >
                  {k === "all" ? "Tümü" : STATUS_META[k].label}
                  <span className="chip-count">{statusCount(k)}</span>
                </button>
              ))}
            </div>

            <div className="inv-tools">
              <label className="inv-search">
                <Search size={15} />
                <input
                  type="search"
                  placeholder="Müşteri veya no ara…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="inv-dates">
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="Başlangıç tarihi"
                />
                <span className="inv-dash">–</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="Bitiş tarihi"
                />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={filtered.length === 0}>
                <Download size={15} /> CSV
              </button>
            </div>
          </div>

          <div>
            {filtered.length === 0 ? (
              <div className="panel-empty">Bu filtrede fatura yok.</div>
            ) : (
              <div className="tx-list">
                {filtered.map((inv) => {
                  const isIncome = inv.type === "income";
                  const st = invStatus(inv);
                  const meta = STATUS_META[st];
                  return (
                    <div
                      key={inv.id}
                      className={`tx-row clickable${selected?.id === inv.id ? " active" : ""}`}
                      onClick={() => {
                        setSelected(inv);
                        announceRightPanel("fatura-detay"); // Parla açıksa kapansın
                      }}
                    >
                      <div className="tx-main">
                        <span
                          className="tx-dot"
                          style={{ background: isIncome ? "var(--teal)" : "var(--danger)" }}
                        />
                        <div className="tx-left">
                          <span className="tx-title">{inv.customer_name || "—"}</span>
                          <span className="tx-meta">
                            {[
                              inv.invoice_number,
                              isIncome ? "Satış" : "Alış",
                              inv.invoice_date ? formatDate(inv.invoice_date) : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      </div>
                      <div className="tx-right">
                        <span className={`badge ${meta.badge}`}>{meta.label}</span>
                        <span className="tx-amount">
                          {formatCurrency(Number(inv.amount) || 0, inv.currency || currency)}
                        </span>
                        {/* Hover'da açılan eylemler — İşlemler satırıyla aynı desen (.anim-act) */}
                        <div className="tx-actions">
                          <button
                            className="anim-act print"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPrint(inv);
                            }}
                            aria-label="Yazdır"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            className="anim-act del"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(inv);
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
          </div>
        </>
      )}
      </div>

      {/* Sağ detay çekmecesi */}
      {selected &&
        (() => {
          const inv = selected;
          const isIncome = inv.type === "income";
          const st = invStatus(inv);
          const meta = STATUS_META[st];
          const cls = isIncome ? "pos" : "neg";
          const sub = Number(inv.subtotal) || 0;
          const vat = Number(inv.vat_amount) || 0;
          return (
            <aside className="tx-drawer">
              <div className="drawer-head">
                <span className="drawer-title">Fatura Detayı</span>
                <button className="anim-act cls" onClick={() => setSelected(null)} aria-label="Kapat">
                  <X size={18} />
                </button>
              </div>

              <div className="drawer-amount">
                <span className={`tx-amount ${cls}`}>
                  {formatCurrency(Number(inv.amount) || 0, inv.currency || currency)}
                </span>
                <span className={`drawer-type ${cls}`}>{isIncome ? "Satış" : "Alış"}</span>
              </div>
              <div className="drawer-name">{inv.customer_name || "—"}</div>

              <div className="drawer-rows">
                <div className="drawer-row">
                  <span className="dr-k">Fatura No</span>
                  <span className="dr-v">{inv.invoice_number || "—"}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Durum</span>
                  <span className="dr-v">
                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  </span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Tarih</span>
                  <span className="dr-v">{inv.invoice_date ? formatDate(inv.invoice_date) : "—"}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">KDV Hariç</span>
                  <span className="dr-v">{formatCurrency(sub, inv.currency || currency)}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">KDV {inv.vat_rate != null ? `(%${inv.vat_rate})` : ""}</span>
                  <span className="dr-v">{formatCurrency(vat, inv.currency || currency)}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Toplam</span>
                  <span className="dr-v">{formatCurrency(Number(inv.amount) || 0, inv.currency || currency)}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Ödeme</span>
                  <span className="dr-v">
                    <span className={`badge ${inv.payment_status === "paid" ? "green" : "amber"}`}>
                      {inv.payment_status === "paid" ? "Ödendi" : "Ödenmedi"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Çekmece eylemleri — İşlemler çekmecesiyle aynı desen (hover'da açılan .anim-act) */}
              <div className="drawer-actions">
                <button
                  className="anim-act print"
                  aria-label="Yazdır"
                  onClick={() => openPrint(inv)}
                  disabled={printLoading}
                >
                  <Printer size={16} />
                </button>
                {inv.payment_status !== "paid" && (
                  <button
                    className="anim-act paid"
                    aria-label="Ödendi işaretle"
                    onClick={() => markPaid(inv)}
                    disabled={busyId === inv.id}
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  className="anim-act del"
                  aria-label="Sil"
                  onClick={async () => {
                    await handleDelete(inv);
                    setSelected(null);
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
            </aside>
          );
        })()}

      {printInv && seller && (
        <InvoicePrint
          invoice={printInv}
          items={printItems}
          seller={seller}
          onClose={() => setPrintInv(null)}
        />
      )}

      {open && (
        <FaturaFormu
          profileId={profileId}
          currency={currency}
          invoicePrefix={invoicePrefix}
          varsayilanTur={listFilter === "expense" ? "expense" : "income"}
          onKapat={() => setOpen(false)}
          onKaydedildi={(kayit) => setList((prev) => [kayit, ...prev])}
        />
      )}
    </>
  );
}
