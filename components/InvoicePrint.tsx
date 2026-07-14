"use client";

import { useEffect } from "react";
import { formatCurrency, formatDate } from "../lib/format";

/* ── Yazdırılabilir A4 fatura ── (Aşama 1: şemasız çıktı)
   Ekranda önizleme + tarayıcı yazdırması (→ PDF kaydet). Tüm veri mevcut:
   satıcı = profiles (Ayarlar'da girilen şirket bilgileri), alıcı = invoices.customer_*,
   kalemler = invoice_items. Print izolasyonu globals.css @media print ile.

   ⚠️ Mevcut faturalar tek "özet kalem" tutuyor (kalem editörü henüz yok) → o kalemin
   açıklaması müşteri adıdır; çıktıda generic "Mal / Hizmet"e çevrilir ki çirkin durmasın.
   Kalem editörü gelince gerçek açıklamalar olduğu gibi görünür. */

export type PrintSeller = {
  company_name: string | null;
  tax_number: string | null;
  tax_office: string | null;
  company_address: string | null;
  company_email: string | null;
  phone: string | null;
  iban: string | null;
  website: string | null;
  mersis_no: string | null;
  company_logo_url: string | null;
  profile_name: string | null;
};

export type PrintInvoice = {
  invoice_number: string | null;
  customer_name: string | null;
  customer_tax_number: string | null;
  customer_address: string | null;
  note: string | null;
  subtotal: string | null;
  vat_rate: number | null;
  vat_amount: string | null;
  amount: string | null;
  currency: string | null;
  type: string | null;
  invoice_date: string | null;
  due_date: string | null;
};

export type PrintItem = {
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: string | null;
  vat_rate: number | null;
  total: string | null;
};

export default function InvoicePrint({
  invoice,
  items,
  seller,
  onClose,
}: {
  invoice: PrintInvoice;
  items: PrintItem[];
  seller: PrintSeller;
  onClose: () => void;
}) {
  const cur = invoice.currency || "TRY";
  const isSale = invoice.type === "income";

  // Esc ile kapat + açıkken arka planı kaydırma
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const sellerName = seller.company_name || seller.profile_name || "Firma";
  const sub = Number(invoice.subtotal) || 0;
  const vat = Number(invoice.vat_amount) || 0;
  const total = Number(invoice.amount) || 0;

  // Tek özet kalem çirkinliğini gizle (bkz. üst not)
  const displayDesc = (d: string | null) =>
    !d || d === invoice.customer_name ? "Mal / Hizmet" : d;

  const sellerLines = [
    seller.tax_office && seller.tax_number
      ? `${seller.tax_office} VD · VKN ${seller.tax_number}`
      : seller.tax_number
      ? `VKN ${seller.tax_number}`
      : null,
    seller.mersis_no ? `MERSİS ${seller.mersis_no}` : null,
    seller.company_address,
    [seller.phone, seller.company_email].filter(Boolean).join(" · ") || null,
    seller.website,
  ].filter(Boolean);

  return (
    <div className="invoice-print-root" role="dialog" aria-label="Fatura önizleme">
      <div className="ip-toolbar">
        <span className="ip-toolbar-title">Fatura Önizleme</span>
        <div className="ip-toolbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Kapat
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            Yazdır / PDF
          </button>
        </div>
      </div>

      <div className="ip-scroll">
        <div className="invoice-print-sheet">
          {/* Üst: satıcı + fatura künyesi */}
          <header className="ip-head">
            <div className="ip-seller">
              {seller.company_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={seller.company_logo_url} alt="" className="ip-logo" />
              ) : null}
              <div>
                <div className="ip-seller-name">{sellerName}</div>
                {sellerLines.map((l, i) => (
                  <div key={i} className="ip-seller-line">
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <div className="ip-meta">
              <div className="ip-doc-title">{isSale ? "FATURA" : "ALIŞ FATURASI"}</div>
              <table className="ip-meta-table">
                <tbody>
                  <tr>
                    <td>Fatura No</td>
                    <td>{invoice.invoice_number || "—"}</td>
                  </tr>
                  <tr>
                    <td>Tarih</td>
                    <td>{invoice.invoice_date ? formatDate(invoice.invoice_date) : "—"}</td>
                  </tr>
                  {invoice.due_date && (
                    <tr>
                      <td>Vade</td>
                      <td>{formatDate(invoice.due_date)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </header>

          {/* Alıcı */}
          <section className="ip-buyer">
            <div className="ip-buyer-label">SAYIN</div>
            <div className="ip-buyer-name">{invoice.customer_name || "—"}</div>
            {invoice.customer_tax_number && (
              <div className="ip-buyer-line">VKN/TCKN: {invoice.customer_tax_number}</div>
            )}
            {invoice.customer_address && (
              <div className="ip-buyer-line">{invoice.customer_address}</div>
            )}
          </section>

          {/* Kalemler */}
          <table className="ip-items">
            <thead>
              <tr>
                <th className="ip-c-no">#</th>
                <th className="ip-c-desc">Açıklama</th>
                <th className="ip-c-num">Miktar</th>
                <th className="ip-c-num">Birim Fiyat</th>
                <th className="ip-c-num">KDV</th>
                <th className="ip-c-num">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td>1</td>
                  <td>Mal / Hizmet</td>
                  <td className="ip-c-num">1</td>
                  <td className="ip-c-num">{formatCurrency(sub, cur)}</td>
                  <td className="ip-c-num">%{invoice.vat_rate ?? 0}</td>
                  <td className="ip-c-num">{formatCurrency(sub, cur)}</td>
                </tr>
              ) : (
                items.map((it, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{displayDesc(it.description)}</td>
                    <td className="ip-c-num">
                      {it.quantity ?? 1} {it.unit || ""}
                    </td>
                    <td className="ip-c-num">{formatCurrency(Number(it.unit_price) || 0, cur)}</td>
                    <td className="ip-c-num">%{it.vat_rate ?? 0}</td>
                    <td className="ip-c-num">{formatCurrency(Number(it.total) || 0, cur)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Toplamlar */}
          <div className="ip-totals">
            <table>
              <tbody>
                <tr>
                  <td>Ara Toplam</td>
                  <td>{formatCurrency(sub, cur)}</td>
                </tr>
                <tr>
                  <td>KDV {invoice.vat_rate != null ? `(%${invoice.vat_rate})` : ""}</td>
                  <td>{formatCurrency(vat, cur)}</td>
                </tr>
                <tr className="ip-grand">
                  <td>Genel Toplam</td>
                  <td>{formatCurrency(total, cur)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Ödeme / not */}
          {(seller.iban || invoice.note) && (
            <section className="ip-foot-info">
              {seller.iban && (
                <div>
                  <b>IBAN:</b> {seller.iban}
                </div>
              )}
              {invoice.note && (
                <div>
                  <b>Not:</b> {invoice.note}
                </div>
              )}
            </section>
          )}

          <footer className="ip-footer">Paraner ile oluşturuldu · paraner.com</footer>
        </div>
      </div>
    </div>
  );
}
