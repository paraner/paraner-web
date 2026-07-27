"use client";

/* ÜST BAR — HIZLI EKLEME ("dinamik ada")
 *
 * Mehmet (26.07): "ekle yerine dinamik ada gibi bir şey olsun, Apple yapıyor ya onun gibi;
 * üzerine geldiğinde açılsın, üzerinden gittiğinde kapansın."
 *
 * Davranış: fareyle üzerine gelince açılır, ayrılınca kapanır. Dokunmatikte hover yoktur →
 * TIKLAMA da açar/kapatır. Klavyeyle odaklanınca da açılır (Tab ile gezen kullanıcı).
 *
 * ⚠️ FORMLARIN KOPYASI BURADA DEĞİL: her satır ilgili modüle `?ekle=…` ile gider, o modül
 * KENDİ ekleme formunu açar (`lib/useEkleTohumu`). Üst bara ikinci bir form yazmak iki ayrı
 * form demek olurdu — biri düzelir, öteki unutulur.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  Files,
  UserPlus,
  Package,
  Wallet,
} from "lucide-react";

type Eylem = { etiket: string; href: string; ikon: React.ReactNode };

const ISLETME: Eylem[] = [
  { etiket: "Gelir ekle", href: "/panel/islemler?ekle=gelir", ikon: <ArrowUpCircle /> },
  { etiket: "Gider ekle", href: "/panel/islemler?ekle=gider", ikon: <ArrowDownCircle /> },
  { etiket: "Fatura oluştur", href: "/panel/faturalar?ekle=1", ikon: <FileText /> },
  { etiket: "Teklif oluştur", href: "/panel/teklifler?ekle=1", ikon: <Files /> },
  { etiket: "Müşteri ekle", href: "/panel/musteriler?ekle=1", ikon: <UserPlus /> },
  { etiket: "Ürün ekle", href: "/panel/urunler?ekle=1", ikon: <Package /> },
];

const BIREYSEL: Eylem[] = [
  { etiket: "Gelir ekle", href: "/panel/islemler?ekle=gelir", ikon: <ArrowUpCircle /> },
  { etiket: "Gider ekle", href: "/panel/islemler?ekle=gider", ikon: <ArrowDownCircle /> },
  { etiket: "Hesap ekle", href: "/panel/hesaplar?ekle=1", ikon: <Wallet /> },
];

/** Fare düğmeden panele geçerken aradaki boşlukta kapanmasın diye tolerans. */
const KAPANMA_GECIKMESI = 140;

export default function HizliEkle({ isletmeMi }: { isletmeMi: boolean }) {
  const router = useRouter();
  const eylemler = isletmeMi ? ISLETME : BIREYSEL;
  const [acik, setAcik] = useState(false);
  const kapatmaZamani = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kokRef = useRef<HTMLDivElement>(null);

  const iptal = () => {
    if (kapatmaZamani.current) clearTimeout(kapatmaZamani.current);
    kapatmaZamani.current = null;
  };
  const ac = useCallback(() => {
    iptal();
    setAcik(true);
  }, []);
  const gecikmeliKapat = useCallback(() => {
    iptal();
    kapatmaZamani.current = setTimeout(() => setAcik(false), KAPANMA_GECIKMESI);
  }, []);

  useEffect(() => () => iptal(), []);

  /* Cihaz gerçekten hover ediyor mu (fare/kalem var mı)?
     ⚠️ `e.pointerType === "touch"` kontrolü YETMEDİ (ölçüldü): dokunmatikte tarayıcının
     parmak değince ürettiği SAHTE pointerenter kendini "mouse" diye tanıtıyor → menü
     açılıyor, hemen ardından click gelip kapatıyordu; telefonda hiç açılmıyordu.
     Doğru ayrım cihazın YETENEĞİ: `(hover: hover)`. Hover'ı olmayan cihazda hover
     dinleyicileri hiç çalışmaz, açma/kapama tamamen tıklamaya kalır. */
  const [hoverVar, setHoverVar] = useState(true);
  useEffect(() => {
    setHoverVar(window.matchMedia("(hover: hover)").matches);
  }, []);

  // Esc kapatsın; ayrıca dışarı tıklayınca (dokunmatikte tıklayarak açılıyor)
  useEffect(() => {
    if (!acik) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
    };
    const disari = (e: MouseEvent) => {
      if (!kokRef.current?.contains(e.target as Node)) setAcik(false);
    };
    window.addEventListener("keydown", esc);
    document.addEventListener("mousedown", disari);
    return () => {
      window.removeEventListener("keydown", esc);
      document.removeEventListener("mousedown", disari);
    };
  }, [acik]);

  function git(href: string) {
    setAcik(false);
    router.push(href);
  }

  return (
    /* ⚠️ onMouseEnter DEĞİL, pointerType kontrollü onPointerEnter: dokunmatikte tarayıcı
       parmak değince ÖNCE sentetik "fare girdi" olayı üretiyor (menü açılıyor), hemen
       ardından click gelip kapatıyordu → telefonda menü hiç açılmıyordu (ölçüldü).
       Hover yalnız gerçek fare/kalem için; dokunmatikte tıklama açar. */
    <div
      className={`di${acik ? " acik" : ""}`}
      ref={kokRef}
      onPointerEnter={hoverVar ? ac : undefined}
      onPointerLeave={hoverVar ? gecikmeliKapat : undefined}
    >
      <button
        type="button"
        className="topbar-icon-btn di-btn"
        aria-label="Hızlı ekle"
        aria-expanded={acik}
        aria-haspopup="menu"
        onClick={() => setAcik((a) => !a)}
        /* ⚠️ Düz `onFocus={ac}` OLMAZ: dokunmatikte parmak değince düğme ODAKLANIYOR
           (menü açılıyor), hemen ardından click gelip kapatıyordu → telefonda ilk dokunuş
           hiçbir şey yapmıyor gibi görünüyordu (ölçüldü). `:focus-visible` yalnız KLAVYE
           odağında doğrudur; fare/parmakla odaklanmada değil. */
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) ac();
        }}
      >
        <Plus aria-hidden="true" />
      </button>

      {/* Panel her zaman DOM'da: açılış/kapanış CSS ile (giriş-çıkış animasyonu için
          unmount etmiyoruz — unmount anında animasyon çalışmaz). Kapalıyken
          `visibility/pointer-events` ile tamamen erişim dışı. */}
      <div className="di-panel" role="menu" aria-hidden={!acik}>
        {eylemler.map((e, i) => (
          <button
            key={e.href}
            type="button"
            role="menuitem"
            className="di-row"
            tabIndex={acik ? 0 : -1}
            style={{ transitionDelay: acik ? `${40 + i * 22}ms` : "0ms" }}
            onClick={() => git(e.href)}
          >
            <span className="di-ic" aria-hidden="true">
              {e.ikon}
            </span>
            {e.etiket}
          </button>
        ))}
      </div>
    </div>
  );
}
