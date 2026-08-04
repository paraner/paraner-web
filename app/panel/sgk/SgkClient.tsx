"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShieldCheck, List, FileText, ArrowDownCircle, ArrowUpCircle, Calculator } from "lucide-react";
import { formatCurrency } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// SGK prim oranları — mobil `sgk-declarations.tsx` ile aynı (işçi %14, işveren %20,5).
// ⚠️ Teşvik/indirim/tavan-taban uygulanmadan KABA tahmindir.
const ISCI_ORAN = 0.14;
const ISVEREN_ORAN = 0.205;

export type MaasOdemesi = {
  amount: string | number | null;
  date: string | null;
};

type Bildirge = {
  id: string;
  baslik: string;
  aciklama: string;
  gun: number; // 0 = ayın son günü
  donem: "aylik" | "ceyreklik";
  ikon: React.ReactNode;
  renk: string;
};

const BILDIRGELER: Bildirge[] = [
  { id: "sgk_aylik", baslik: "SGK Aylık Prim Bildirimi", aciklama: "Çalışan sigorta primleri bildirimi", gun: 26, donem: "aylik", ikon: <ShieldCheck size={18} />, renk: "#1A6BFA" },
  { id: "sgk_hizmet", baslik: "SGK Hizmet Listesi", aciklama: "Aylık çalışan hizmet dökümü", gun: 26, donem: "aylik", ikon: <List size={18} />, renk: "#1A6BFA" },
  { id: "muhtasar", baslik: "Muhtasar Beyanname", aciklama: "Stopaj vergisi (gelir vergisi kesintisi)", gun: 26, donem: "aylik", ikon: <FileText size={18} />, renk: "#F97316" },
  { id: "ba", baslik: "Ba Formu (Alışlar)", aciklama: "5.000 TL üzeri alış bildirimi", gun: 0, donem: "aylik", ikon: <ArrowDownCircle size={18} />, renk: "#E24B4A" },
  { id: "bs", baslik: "Bs Formu (Satışlar)", aciklama: "5.000 TL üzeri satış bildirimi", gun: 0, donem: "aylik", ikon: <ArrowUpCircle size={18} />, renk: "#1D9E75" },
  { id: "gecici", baslik: "Geçici Vergi Beyannamesi", aciklama: "3 aylık kazanç üzerinden ödenen vergi", gun: 17, donem: "ceyreklik", ikon: <Calculator size={18} />, renk: "#BA7517" },
];

export default function SgkClient({
  currency,
  calisanSayisi,
  odemeler,
}: {
  currency: string;
  calisanSayisi: number;
  odemeler: MaasOdemesi[];
}) {
  const simdi = new Date();
  const [ay, setAy] = useState(simdi.getMonth());
  const [yil, setYil] = useState(simdi.getFullYear());

  // Seçili ayda yapılan maaş ödemelerinin toplamı — prim tahmini bunun üzerinden.
  const { toplamMaas, odemeSayisi } = useMemo(() => {
    const bas = new Date(yil, ay, 1).getTime();
    const bit = new Date(yil, ay + 1, 1).getTime(); // hariç
    let t = 0;
    let n = 0;
    for (const o of odemeler) {
      if (!o.date) continue;
      const x = new Date(o.date).getTime();
      if (x < bas || x >= bit) continue;
      t += Number(o.amount) || 0;
      n++;
    }
    return { toplamMaas: t, odemeSayisi: n };
  }, [odemeler, ay, yil]);

  const isciPrim = toplamMaas * ISCI_ORAN;
  const isverenPrim = toplamMaas * ISVEREN_ORAN;
  const toplamPrim = isciPrim + isverenPrim;

  const buAy = ay === simdi.getMonth() && yil === simdi.getFullYear();

  function ayDegistir(yon: number) {
    let m = ay + yon;
    let y = yil;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setAy(m);
    setYil(y);
  }

  const satirlar = useMemo(() => {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    return BILDIRGELER.map((b) => {
      const sonGunSayi = b.gun === 0 ? new Date(yil, ay + 1, 0).getDate() : b.gun;
      const sonTarih = new Date(yil, ay, sonGunSayi);
      const kalan = Math.ceil((sonTarih.getTime() - bugun.getTime()) / 86400000);
      return { ...b, sonGunSayi, kalan };
    });
  }, [ay, yil]);

  return (
    <>
      <PageHead title="SGK & Bildirgeler" sub="Prim tahmini ve bildirge son tarihleri" />

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

      {/* ── Prim tahmini ── */}
      <div className="section-title" style={{ marginTop: 0 }}>
        SGK Prim Tahmini
      </div>

      {calisanSayisi === 0 ? (
        <div className="pl-card">
          <div className="pl-margin" style={{ marginTop: 0 }}>
            Kayıtlı çalışanınız yok, bu yüzden prim tahmini hesaplanamıyor.{" "}
            <Link href="/panel/calisanlar" className="tx-link">
              Çalışan ekle
            </Link>
          </div>
        </div>
      ) : odemeSayisi === 0 ? (
        <div className="pl-card">
          <div className="pl-line">
            <span>Çalışan sayısı</span>
            <strong>{calisanSayisi}</strong>
          </div>
          <div className="pl-margin">
            {AYLAR[ay]} {yil} için kayıtlı maaş ödemesi yok, bu yüzden prim tahmini
            hesaplanamıyor.{" "}
            <Link href="/panel/maaslar" className="tx-link">
              Maaş ödemesi ekle
            </Link>
          </div>
        </div>
      ) : (
        <div className="pl-card">
          <div className="pl-line">
            <span>Çalışan sayısı</span>
            <strong>{calisanSayisi}</strong>
          </div>
          <div className="pl-line">
            <span>
              {AYLAR[ay]} ayında ödenen maaş
              <span className="pl-hint"> · {odemeSayisi} ödeme</span>
            </span>
            <strong>{formatCurrency(toplamMaas, currency)}</strong>
          </div>
          <div className="pl-line">
            <span>İşçi payı (%14)</span>
            <strong>{formatCurrency(isciPrim, currency)}</strong>
          </div>
          <div className="pl-line">
            <span>İşveren payı (%20,5)</span>
            <strong>{formatCurrency(isverenPrim, currency)}</strong>
          </div>
          <div className="pl-line pl-net">
            <span>Tahmini Toplam Prim</span>
            <strong>{formatCurrency(toplamPrim, currency)}</strong>
          </div>
          <div className="pl-margin">
            Hesap, <Link href="/panel/maaslar" className="tx-link">Maaş Ödemeleri</Link>&apos;ne
            girdiğiniz tutarlar üzerinden yapılır. Kaba tahmindir; teşvik, indirim ve
            tavan/taban uygulanmamıştır. Girilen tutar net ise gerçek prim daha yüksek çıkar.
          </div>
        </div>
      )}

      {/* ── Bildirge takvimi ── */}
      <div className="section-title">Bildirge Takvimi</div>
      <div className="tx-list">
        {satirlar.map((b) => {
          const gecti = buAy && b.kalan < 0;
          const yakin = buAy && b.kalan >= 0 && b.kalan <= 3;
          const cls = gecti ? "red" : yakin ? "amber" : "gray";
          return (
            <div key={b.id} className="tx-row">
              <div className="tx-main">
                <span className="sgk-ic" style={{ background: b.renk + "22", color: b.renk }}>
                  {b.ikon}
                </span>
                <div className="tx-left">
                  <span className="tx-title">{b.baslik}</span>
                  <span className="tx-meta">
                    {b.aciklama}
                    {b.donem === "ceyreklik" && " · 3 aylık"}
                  </span>
                </div>
              </div>
              <div className="tx-right">
                <div className="dv-prices">
                  <span className="tx-amount" style={{ fontSize: 14 }}>
                    {b.sonGunSayi} {AYLAR[ay]}
                  </span>
                  {buAy && (
                    <span className={`badge ${cls}`}>
                      {b.kalan < 0
                        ? "Süresi geçti"
                        : b.kalan === 0
                          ? "Bugün son gün"
                          : b.kalan === 1
                            ? "Yarın son gün"
                            : `${b.kalan} gün kaldı`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="kdv-note">
        Tarihler ve oranlar <strong>bilgilendirme amaçlıdır</strong>; resmî son tarihler için
        SGK / GİB e-Devlet duyuruları esas alınmalıdır. Geçici vergi yalnızca üçer aylık
        dönemlerde (Şubat, Mayıs, Ağustos, Kasım) verilir. Ba/Bs formları için eşik tutarı
        değişebilir — mali müşavirinizle teyit edin.
      </p>
    </>
  );
}
