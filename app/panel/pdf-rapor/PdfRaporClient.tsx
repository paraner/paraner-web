"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import { findCategory } from "../../../lib/categories";
import type { CustomCategory } from "../../../lib/customCategoriesShared";
import PageHead from "../../../components/ui/PageHead";

export type RaporTx = {
  title: string | null;
  amount: string | number;
  type: string;
  category: string | null;
  currency: string | null;
  date: string | null;
};

export type RaporFatura = {
  type: string | null;
  amount: string | number | null;
  vat_amount: string | number | null;
  currency: string | null;
  invoice_date: string | null;
  customer_name: string | null;
  invoice_number: string | null;
};

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export default function PdfRaporClient({
  currency,
  firmaAdi,
  transactions,
  invoices,
  customCategories = [],
  bugun,
}: {
  currency: string;
  firmaAdi: string;
  transactions: RaporTx[];
  invoices: RaporFatura[];
  customCategories?: CustomCategory[];
  /* Sunucudaki "bugün" (YYYY-MM-DD, Europe/Istanbul). Client'ta `new Date()` yok →
     sunucu/istemci metni birebir aynı (hydration uyuşmazlığı olmaz). */
  bugun: string;
}) {
  const [by, bm, bd] = bugun.split("-").map(Number);
  const [ay, setAy] = useState(bm - 1);
  const yil = by;

  // Ayda geçen para birimleri — para birimleri AYRI yaşar, çevirme YOK (mobil ile aynı kural).
  const [gosterilenPB, setGosterilenPB] = useState(currency);

  const bas = new Date(yil, ay, 1).getTime();
  const bit = new Date(yil, ay + 1, 1).getTime(); // hariç

  const paraBirimleri = useMemo(() => {
    const s = new Set<string>();
    for (const t of transactions) {
      if (!t.date) continue;
      const x = new Date(t.date).getTime();
      if (x >= bas && x < bit) s.add(t.currency || currency);
    }
    for (const f of invoices) {
      if (!f.invoice_date) continue;
      const x = new Date(f.invoice_date).getTime();
      if (x >= bas && x < bit) s.add(f.currency || currency);
    }
    return [...s].sort((a, b) => (a === currency ? -1 : b === currency ? 1 : a.localeCompare(b)));
  }, [transactions, invoices, bas, bit, currency]);

  const pb = paraBirimleri.includes(gosterilenPB)
    ? gosterilenPB
    : (paraBirimleri[0] ?? currency);

  const r = useMemo(() => {
    const txs = transactions.filter((t) => {
      if (!t.date) return false;
      const x = new Date(t.date).getTime();
      return x >= bas && x < bit && (t.currency || currency) === pb;
    });

    let gelir = 0;
    let gider = 0;
    const katMap: Record<string, number> = {};
    for (const t of txs) {
      const a = Number(t.amount) || 0;
      if (t.type === "income") gelir += a;
      else if (t.type === "expense") {
        gider += a;
        const k = t.category ?? "";
        katMap[k] = (katMap[k] || 0) + a;
      }
    }

    const kategoriler = Object.entries(katMap)
      .map(([cat, total]) => ({ cat, total }))
      .sort((a, b) => b.total - a.total);

    const fats = invoices.filter((f) => {
      if (!f.invoice_date) return false;
      const x = new Date(f.invoice_date).getTime();
      return x >= bas && x < bit && (f.currency || currency) === pb;
    });
    const toplamKdv = fats.reduce((s, f) => s + (Number(f.vat_amount) || 0), 0);

    return { txs, gelir, gider, net: gelir - gider, kategoriler, fats, toplamKdv };
  }, [transactions, invoices, bas, bit, pb, currency]);

  function ayDegistir(yon: number) {
    const m = ay + yon;
    if (m < 0 || m > 11) return; // rapor yalnız bu yıl içinde gezinir
    setAy(m);
  }

  const bugunGosterim = `${String(bd).padStart(2, "0")}.${String(bm).padStart(2, "0")}.${by}`;

  return (
    <>
      {/* ── Ekran kontrolleri (yazdırmada gizli) ── */}
      <div className="pr-ui">
        <PageHead
          title="PDF Rapor"
          sub="Aylık özet — yazdır ya da PDF olarak kaydet"
          action={
            /* ⚠️ `btn` TEMEL SINIFI ŞART: kutu biçimi (flex, padding, köşe, yazı) ondan gelir;
               `btn-primary` yalnız titanyum rengi/gölgesi verir. Tek başına yazılırsa
               düğme çıplak tarayıcı düğmesi gibi görünür (05.08.2026'da böyle çıktı). */
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <Printer size={16} />
              Yazdır
              {/* Dar ekranda gizlenir: `.btn` `white-space: nowrap` + `overflow:hidden`
                  olduğu için uzun etiket sarmıyor, KESİLİYOR (390px'te "…PDF Kayde"
                  diye çıkıyordu, 05.08 telefon testi). */}
              <span className="pr-print-uzun"> / PDF Kaydet</span>
            </button>
          }
        />

        <div className="ay-nav">
          <button onClick={() => ayDegistir(-1)} disabled={ay === 0} aria-label="Önceki ay">
            <ChevronLeft size={18} />
          </button>
          <span className="ay-nav-label">
            {AYLAR[ay]} {yil}
          </span>
          <button onClick={() => ayDegistir(1)} disabled={ay === 11} aria-label="Sonraki ay">
            <ChevronRight size={18} />
          </button>
        </div>

        {paraBirimleri.length > 1 && (
          <div className="chip-seg" style={{ marginBottom: 16 }}>
            {paraBirimleri.map((c) => (
              <button key={c} className={pb === c ? "active" : ""} onClick={() => setGosterilenPB(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Yazdırılan sayfa ── */}
      <div className="pr-sheet">
        <div className="pr-head">
          <h1>Paraner — Aylık Rapor</h1>
          <p>
            {firmaAdi} · {AYLAR[ay]} {yil}
            {paraBirimleri.length > 1 && ` · ${pb}`}
          </p>
        </div>

        <div className="pr-kpis">
          <div className="pr-kpi pr-in">
            <span className="pr-kpi-label">Toplam Gelir</span>
            <span className="pr-kpi-val">{formatCurrency(r.gelir, pb)}</span>
          </div>
          <div className="pr-kpi pr-out">
            <span className="pr-kpi-label">Toplam Gider</span>
            <span className="pr-kpi-val">{formatCurrency(r.gider, pb)}</span>
          </div>
          <div className={`pr-kpi ${r.net >= 0 ? "pr-in" : "pr-out"}`}>
            <span className="pr-kpi-label">{r.net >= 0 ? "Net Kâr" : "Net Zarar"}</span>
            <span className="pr-kpi-val">{formatCurrency(r.net, pb)}</span>
          </div>
        </div>

        {r.txs.length === 0 && r.fats.length === 0 ? (
          <p className="pr-empty">Bu ayda kayıt bulunmuyor.</p>
        ) : (
          <>
            {r.kategoriler.length > 0 && (
              <>
                <h2>Gider Dağılımı</h2>
                <table className="pr-table">
                  <thead>
                    <tr>
                      <th>Kategori</th>
                      <th className="pr-num">Tutar</th>
                      <th className="pr-num">Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.kategoriler.map((k) => (
                      <tr key={k.cat}>
                        <td>{findCategory(k.cat, customCategories).label}</td>
                        <td className="pr-num pr-neg">{formatCurrency(k.total, pb)}</td>
                        <td className="pr-num">
                          %{r.gider > 0 ? ((k.total / r.gider) * 100).toFixed(0) : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {r.fats.length > 0 && (
              <>
                <h2>Faturalar ({r.fats.length})</h2>
                <p className="pr-sub">
                  Dönem toplam KDV: <strong>{formatCurrency(r.toplamKdv, pb)}</strong>
                </p>
                <table className="pr-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>No</th>
                      <th>Müşteri / Firma</th>
                      <th className="pr-num">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.fats.map((f, i) => (
                      <tr key={i}>
                        <td>{f.invoice_date ? formatDate(f.invoice_date) : "—"}</td>
                        <td>{f.invoice_number ?? "—"}</td>
                        <td>{f.customer_name ?? "—"}</td>
                        <td className={`pr-num ${f.type === "expense" ? "pr-neg" : "pr-pos"}`}>
                          {formatCurrency(Number(f.amount) || 0, pb)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {r.txs.length > 0 && (
              <>
                <h2>İşlemler ({r.txs.length})</h2>
                <table className="pr-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Açıklama</th>
                      <th>Kategori</th>
                      <th className="pr-num">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.txs.map((t, i) => (
                      <tr key={i}>
                        <td>{t.date ? formatDate(t.date) : "—"}</td>
                        <td>{t.title ?? "—"}</td>
                        <td>{findCategory(t.category ?? "", customCategories).label}</td>
                        <td className={`pr-num ${t.type === "expense" ? "pr-neg" : "pr-pos"}`}>
                          {t.type === "expense" ? "−" : "+"}
                          {formatCurrency(Number(t.amount) || 0, pb)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        <p className="pr-foot">
          {bugunGosterim} tarihinde Paraner ile oluşturuldu · paraner.com
        </p>
      </div>

      <p className="kdv-note pr-ui">
        Rapor yalnızca içinde bulunduğunuz yıl için gezinir. Para birimleri ayrı raporlanır —
        çevrim yapılmaz. Yazdırma penceresinde &quot;Hedef&quot; olarak
        <strong> PDF olarak kaydet</strong> seçerseniz dosya olarak alırsınız.
      </p>
    </>
  );
}
