"use client";
import { confirmDialog } from "../../components/confirm";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { useServerSynced } from "../../../lib/useServerSynced";
import { formatCurrency, formatDate } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";
import AddButton from "../../../components/AddButton";
import EmptyState from "../../../components/ui/EmptyState";
import { TrashIcon } from "../../../components/icons";
import { FileText } from "lucide-react";
import { useEkleTohumu } from "../../../lib/useEkleTohumu";
import TeklifFormu, { type Quote } from "./TeklifFormu";

/* ⚠️ Form BURADA DEĞİL: `TeklifFormu` bileşeninde — üst bardaki hızlı ekleme adası (+) da
   aynı formu açıyor (kullanıcı hangi sayfadaysa orada). İki kopya olmasın. */
export type { Quote };

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Taslak", cls: "gray" },
  sent: { label: "Gönderildi", cls: "amber" },
  accepted: { label: "Kabul edildi", cls: "green" },
  rejected: { label: "Reddedildi", cls: "red" },
  invoiced: { label: "Faturalandı", cls: "green" },
};
const STATUS_OPTS = Object.entries(STATUS).map(([id, v]) => ({ id, label: v.label }));

export default function TekliflerClient({
  profileId,
  currency,
  quotes: initial,
}: {
  profileId: string;
  currency: string;
  quotes: Quote[];
}) {
  const supabase = createClient();
  const router = useRouter();
  /* Sunucu verisi değişince liste kendini tazeler — üst bardaki hızlı ekleme adasından (+)
     başka bir sayfadayken kayıt eklenirse `router.refresh()` sonrası burada da görünsün. */
  const [list, setList] = useServerSynced<Quote[]>(initial);
  const [open, setOpen] = useState(false);


  // Üst bardaki hızlı ekleme adasından gelindiyse formu aç (?ekle=…)
  useEkleTohumu(() => openNew());

  function openNew() {
    setOpen(true);
  }

  async function changeStatus(q: Quote, status: string) {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", q.id);
    if (error) return;
    setList((prev) => prev.map((x) => (x.id === q.id ? { ...x, status } : x)));
    router.refresh();
  }

  async function handleDelete(q: Quote) {
    if (!(await confirmDialog({ message: `${q.quote_number ?? "Teklif"} silinsin mi?`, danger: true }))) return;
    const { error } = await supabase.from("quotes").delete().eq("id", q.id);
    if (error) return;
    setList((prev) => prev.filter((x) => x.id !== q.id));
    router.refresh();
  }

  const acceptedTotal = list
    .filter((q) => q.status === "accepted")
    .reduce((s, q) => s + (Number(q.grand_total) || 0), 0);

  return (
    <>
      <PageHead
        title="Teklifler"
        sub="Müşteri teklif ve proformaları"
        action={
          <AddButton onClick={openNew}>Teklif Oluştur</AddButton>
        }
      />

      {list.length > 0 && (
        <div className="total-banner">
          <div className="t-item">
            <div className="t-label">Toplam Teklif</div>
            <div className="t-value">{list.length}</div>
          </div>
          <div className="t-item">
            <div className="t-label">Kabul Edilen Tutar</div>
            <div className="t-value">{formatCurrency(acceptedTotal, currency)}</div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="Henüz teklif yok"
          hint="Müşterine fiyat teklifi hazırla; kabul edilirse aynı bilgilerle faturaya dönüşsün."
          action={<AddButton onClick={openNew}>İlk Teklifi Oluştur</AddButton>}
        />
      ) : (
        <div className="tx-list">
          {list.map((q) => {
            const st = STATUS[q.status] ?? { label: q.status, cls: "gray" };
            return (
              <div key={q.id} className="tx-row">
                <div className="tx-main">
                  <span className="tx-dot" style={{ background: "var(--teal)" }} />
                  <div className="tx-left">
                    <span className="tx-title">{q.customer_name}</span>
                    <span className="tx-meta">
                      {[
                        q.quote_number,
                        q.valid_until ? `Geçerlilik: ${formatDate(q.valid_until)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
                <div className="tx-right">
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                  <span className="tx-amount">
                    {formatCurrency(Number(q.grand_total) || 0, q.currency || currency)}
                  </span>
                  <select
                    value={q.status}
                    onChange={(e) => changeStatus(q, e.target.value)}
                    aria-label="Durum"
                    style={{ width: "auto", padding: "6px 8px", fontSize: 12 }}
                  >
                    {STATUS_OPTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button className="tx-delete" onClick={() => handleDelete(q)} aria-label="Sil">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <TeklifFormu
          profileId={profileId}
          currency={currency}
          onKapat={() => setOpen(false)}
          onKaydedildi={(kayit) => setList((prev) => [kayit, ...prev])}
        />
      )}
    </>
  );
}
