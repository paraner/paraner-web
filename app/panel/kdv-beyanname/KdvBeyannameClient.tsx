"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { formatCurrency } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";

export type BeyanFatura = {
  type: string | null; // income = satış / expense = alış
  vat_amount: string | number | null;
  vat_rate: string | number | null;
  invoice_date: string | null;
  currency: string | null;
};

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// Mobil `vat-declaration.tsx` ile birebir kova mantığı: ≤1 → %1, ≤10 → %10, üstü → %20.
function kova(rate: number): 1 | 10 | 20 {
  if (rate <= 1) return 1;
  if (rate <= 10) return 10;
  return 20;
}

type Ozet = {
  satis: Record<1 | 10 | 20, number>;
  alis: Record<1 | 10 | 20, number>;
  toplamSatis: number;
  toplamAlis: number;
  net: number;
  odenecek: number;
  faturaSayisi: number;
};

export default function KdvBeyannameClient({
  currency,
  invoices,
  bugun,
}: {
  currency: string;
  invoices: BeyanFatura[];
  /* Sunucudaki "bugün" (YYYY-MM-DD, Europe/Istanbul). ⚠️ Burada `new Date()` ÇAĞIRMA:
     sunucu ile istemci farklı gün/saat hesaplarsa "N gün kaldı" metni uyuşmaz →
     React #418 hydration hatası (05.08.2026'da canlıda çıktı). */
  bugun: string;
}) {
  const [by, bm, bd] = bugun.split("-").map(Number);
  const simdi = new Date(by, bm - 1, bd);
  const [ay, setAy] = useState(bm - 1);
  const [yil, setYil] = useState(by);
  const [kopyalandi, setKopyalandi] = useState(false);

  const o: Ozet = useMemo(() => {
    const bos = { 1: 0, 10: 0, 20: 0 } as Record<1 | 10 | 20, number>;
    const r: Ozet = {
      satis: { ...bos },
      alis: { ...bos },
      toplamSatis: 0,
      toplamAlis: 0,
      net: 0,
      odenecek: 0,
      faturaSayisi: 0,
    };

    const bas = new Date(yil, ay, 1).getTime();
    const bit = new Date(yil, ay + 1, 1).getTime(); // hariç

    for (const f of invoices) {
      if ((f.currency || currency) !== currency) continue;
      if (!f.invoice_date) continue;
      const t = new Date(f.invoice_date).getTime();
      if (t < bas || t >= bit) continue;

      r.faturaSayisi++;
      const kdv = Number(f.vat_amount) || 0;
      const k = kova(Number(f.vat_rate) || 20);

      if (f.type === "expense") {
        r.alis[k] += kdv;
        r.toplamAlis += kdv;
      } else {
        r.satis[k] += kdv;
        r.toplamSatis += kdv;
      }
    }

    r.net = r.toplamSatis - r.toplamAlis;
    r.odenecek = Math.max(0, r.net);
    return r;
  }, [invoices, ay, yil, currency]);

  function ayDegistir(yon: number) {
    let m = ay + yon;
    let y = yil;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setAy(m);
    setYil(y);
    setKopyalandi(false);
  }

  const buAy = ay === simdi.getMonth() && yil === simdi.getFullYear();

  // Beyanname son günü: takip eden ayın 28'i (KDV1)
  const sonGun = new Date(yil, ay + 1, 28);
  const kalanGun = Math.round((sonGun.getTime() - simdi.getTime()) / 86400000);

  const ozetMetni = useMemo(() => {
    const s = (n: number) => formatCurrency(n, currency);
    return [
      "KDV BEYANNAME ÖZETİ",
      `Dönem: ${AYLAR[ay]} ${yil}`,
      "",
      "HESAPLANAN KDV (Satış)",
      `  %1:  ${s(o.satis[1])}`,
      `  %10: ${s(o.satis[10])}`,
      `  %20: ${s(o.satis[20])}`,
      `  Toplam: ${s(o.toplamSatis)}`,
      "",
      "İNDİRİLECEK KDV (Alış)",
      `  %1:  ${s(o.alis[1])}`,
      `  %10: ${s(o.alis[10])}`,
      `  %20: ${s(o.alis[20])}`,
      `  Toplam: ${s(o.toplamAlis)}`,
      "",
      `NET KDV: ${s(o.net)}`,
      `ÖDENECEK: ${s(o.odenecek)}`,
      `Fatura sayısı: ${o.faturaSayisi}`,
    ].join("\n");
  }, [o, ay, yil, currency]);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(ozetMetni);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      /* pano izni yoksa sessiz geç */
    }
  }

  return (
    <>
      <PageHead
        title="KDV Beyanname Özeti"
        sub="Dönem KDV'sinin oran oran dökümü"
        action={
          <button className="btn btn-ghost btn-sm" onClick={kopyala} title="Özeti panoya kopyala">
            {kopyalandi ? <Check size={16} /> : <Copy size={16} />}
            {kopyalandi ? "Kopyalandı" : "Özeti Kopyala"}
          </button>
        }
      />

      {/* ── Ay gezinme ── */}
      <div className="ay-nav">
        <button onClick={() => ayDegistir(-1)} aria-label="Önceki ay">
          <ChevronLeft size={18} />
        </button>
        <span className="ay-nav-label">
          {AYLAR[ay]} {yil}
        </span>
        <button onClick={() => ayDegistir(1)} aria-label="Sonraki ay">
          <ChevronRight size={18} />
        </button>
      </div>

      {buAy && (
        <div className={`beyan-uyari ${kalanGun <= 7 ? "yakin" : ""}`}>
          Beyanname son günü <strong>28 {AYLAR[(ay + 1) % 12]}</strong>
          {kalanGun >= 0 ? ` — ${kalanGun} gün kaldı` : " — süresi geçti"}
        </div>
      )}

      {/* ── Hesaplanan (satış) ── */}
      <div className="section-title">Hesaplanan KDV (Satış)</div>
      <div className="pl-card">
        {([1, 10, 20] as const).map((k) => (
          <div key={k} className="pl-line">
            <span>%{k} oranında</span>
            <strong>{formatCurrency(o.satis[k], currency)}</strong>
          </div>
        ))}
        <div className="pl-line pl-net">
          <span>Toplam Hesaplanan</span>
          <strong>{formatCurrency(o.toplamSatis, currency)}</strong>
        </div>
      </div>

      {/* ── İndirilecek (alış) ── */}
      <div className="section-title">İndirilecek KDV (Alış)</div>
      <div className="pl-card">
        {([1, 10, 20] as const).map((k) => (
          <div key={k} className="pl-line">
            <span>%{k} oranında</span>
            <strong>{formatCurrency(o.alis[k], currency)}</strong>
          </div>
        ))}
        <div className="pl-line pl-net">
          <span>Toplam İndirilecek</span>
          <strong>{formatCurrency(o.toplamAlis, currency)}</strong>
        </div>
      </div>

      {/* ── Sonuç ── */}
      <div className="section-title">Sonuç</div>
      <div className="pl-card">
        <div className="pl-line">
          <span>Net KDV (Hesaplanan − İndirilecek)</span>
          <strong style={{ color: o.net >= 0 ? "var(--danger)" : "var(--income)" }}>
            {formatCurrency(o.net, currency)}
          </strong>
        </div>
        <div className="pl-line pl-net">
          <span>{o.net >= 0 ? "Ödenecek KDV" : "Sonraki Döneme Devreden"}</span>
          <strong style={{ color: o.net >= 0 ? "var(--danger)" : "var(--income)" }}>
            {formatCurrency(Math.abs(o.net), currency)}
          </strong>
        </div>
        <div className="pl-margin">
          Bu dönemde {o.faturaSayisi} fatura hesaba katıldı.
        </div>
      </div>

      <p className="kdv-note">
        Bu özet, girdiğiniz faturaların KDV tutarlarından hesaplanır ve <strong>bilgilendirme
        amaçlıdır</strong>; resmî beyanname yerine geçmez. Önceki dönemden devreden KDV,
        tevkifat ve istisnalar bu hesaba dahil değildir — beyannamenizi mali müşavirinizle
        kontrol edin.
      </p>
    </>
  );
}
