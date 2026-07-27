"use client";

/* ÜST BAR — HIZLI EKLEME ("dinamik ada")
 *
 * Mehmet (26.07): "ekle yerine dinamik ada gibi bir şey olsun, Apple yapıyor ya onun gibi;
 * üzerine geldiğinde açılsın, üzerinden gittiğinde kapansın."
 *
 * Davranış: fareyle üzerine gelince açılır, ayrılınca kapanır. Dokunmatikte hover yoktur →
 * TIKLAMA da açar/kapatır. Klavyeyle odaklanınca da açılır (Tab ile gezen kullanıcı).
 *
 * ⚠️ FORMLARIN KOPYASI BURADA DEĞİL. İki çalışma biçimi var:
 *   ① `form`: modülün ekleme formu BURADA açılır — kullanıcı bulunduğu sayfada kalır
 *      (Mehmet, 28.07: "hangi sayfadaysa orada kalsın, ilgili sayfaya gitmesin, geç
 *      açılıyor"). Açılan bileşen modülün KENDİ formudur (ör. `musteriler/MusteriFormu`),
 *      kopyası değil → alan eklenince iki yer de alır.
 *   ② `href`: formu henüz ayrı bileşene taşınmamış modüller, eskisi gibi `?ekle=…` ile
 *      o sayfaya gider (`lib/useEkleTohumu`). ŞU AN BU DAL BOŞ — altı modülün altısı da
 *      taşındı. Yeni bir satır eklerken ①'i tercih et; `href` yalnız gerçekten sayfaya
 *      GİTMESİ gereken bir iş için (ör. çok adımlı sihirbaz) kalsın.
 *
 * ⚠️ Formlar `next/dynamic` ile TALEP ANINDA yükleniyor: üst bar her panel sayfasında var,
 * formların kodu her sayfaya bindirilseydi ilk açılış yavaşlardı.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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

/* Yerinde açılan formlar — talep anında yüklenir (bkz. dosya başı notu). */
const MusteriFormu = dynamic(() => import("./musteriler/MusteriFormu"));
const UrunFormu = dynamic(() => import("./urunler/UrunFormu"));
const HesapFormu = dynamic(() => import("./hesaplar/HesapFormu"));
const TeklifFormu = dynamic(() => import("./teklifler/TeklifFormu"));
const FaturaFormu = dynamic(() => import("./faturalar/FaturaFormu"));
const IslemFormu = dynamic(() => import("./islemler/IslemFormu"));

/** Yerinde açılabilen form anahtarları. Yeni form taşındıkça buraya eklenir. */
type FormAnahtari = "musteri" | "urun" | "hesap" | "teklif" | "fatura" | "gelir" | "gider";

/** `form` → bulunduğun sayfada açılır · `href` → o sayfaya gider (henüz taşınmamış). */
type Eylem = {
  etiket: string;
  ikon: React.ReactNode;
  form?: FormAnahtari;
  href?: string;
};

const ISLETME: Eylem[] = [
  { etiket: "Gelir ekle", form: "gelir", ikon: <ArrowUpCircle /> },
  { etiket: "Gider ekle", form: "gider", ikon: <ArrowDownCircle /> },
  { etiket: "Fatura oluştur", form: "fatura", ikon: <FileText /> },
  { etiket: "Teklif oluştur", form: "teklif", ikon: <Files /> },
  { etiket: "Müşteri ekle", form: "musteri", ikon: <UserPlus /> },
  { etiket: "Ürün ekle", form: "urun", ikon: <Package /> },
];

const BIREYSEL: Eylem[] = [
  { etiket: "Gelir ekle", form: "gelir", ikon: <ArrowUpCircle /> },
  { etiket: "Gider ekle", form: "gider", ikon: <ArrowDownCircle /> },
  { etiket: "Hesap ekle", form: "hesap", ikon: <Wallet /> },
];

/** Fare düğmeden panele geçerken aradaki boşlukta kapanmasın diye tolerans. */
const KAPANMA_GECIKMESI = 140;

export default function HizliEkle({
  profileId,
  profileType,
  currency,
  invoicePrefix,
}: {
  profileId: string;
  /** "business" | "individual" — menü içeriği ve hesap formu etiketleri buna bakar. */
  profileType: string;
  /** Profilin varsayılan para birimi (yeni hesap/teklif/fatura bununla açılır). */
  currency: string;
  /** Fatura numarası öneki (ör. "MGZR" → MGZR-000006). */
  invoicePrefix: string;
}) {
  const router = useRouter();
  const eylemler = profileType === "business" ? ISLETME : BIREYSEL;
  const [acik, setAcik] = useState(false);
  /** Yerinde açılan form (null = kapalı). */
  const [form, setForm] = useState<FormAnahtari | null>(null);
  /* ⚠️ Form `body`'ye PORTAL ile taşınır (PanelSearch ile aynı desen, aynı sebep):
     bu bileşen ÜST BARIN içinde doğuyor, üst bar hem `z-index: 10` hem
     `backdrop-filter` taşıyor. `backdrop-filter` `position: fixed` çocuklar için
     yeni bir sabitleme kutusu kurar → modalın tam-ekran karartması ekranı değil
     ÜST BARI kaplardı ve sol menünün (z-index: 20) altında kalırdı. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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

  const kapatForm = useCallback(() => setForm(null), []);

  function calistir(e: Eylem) {
    setAcik(false);
    // Taşınmış modül: formu BURADA aç, sayfa değişmesin.
    if (e.form) {
      setForm(e.form);
      return;
    }
    if (e.href) router.push(e.href);
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
            key={e.etiket}
            type="button"
            role="menuitem"
            className="di-row"
            tabIndex={acik ? 0 : -1}
            style={{ transitionDelay: acik ? `${40 + i * 22}ms` : "0ms" }}
            onClick={() => calistir(e)}
          >
            <span className="di-ic" aria-hidden="true">
              {e.ikon}
            </span>
            {e.etiket}
          </button>
        ))}
      </div>

      {/* Yerinde açılan formlar. Kaydedince form kendi `router.refresh()`ini çağırır →
          kullanıcı o modülün sayfasındaysa listesi de tazelenir (sayfalar `initial`
          prop'unu izliyor), değilse zaten sonra girdiğinde güncel görür. */}
      {mounted &&
        form &&
        createPortal(
          <>
            {form === "musteri" && (
              <MusteriFormu profileId={profileId} onKapat={kapatForm} />
            )}
            {form === "urun" && <UrunFormu profileId={profileId} onKapat={kapatForm} />}
            {form === "hesap" && (
              <HesapFormu
                profileId={profileId}
                profileType={profileType}
                defaultCurrency={currency}
                onKapat={kapatForm}
              />
            )}
            {form === "teklif" && (
              <TeklifFormu profileId={profileId} currency={currency} onKapat={kapatForm} />
            )}
            {form === "fatura" && (
              <FaturaFormu
                profileId={profileId}
                currency={currency}
                invoicePrefix={invoicePrefix}
                onKapat={kapatForm}
              />
            )}
            {(form === "gelir" || form === "gider") && (
              <IslemFormu
                profileId={profileId}
                currency={currency}
                varsayilanTur={form === "gider" ? "expense" : "income"}
                onKapat={kapatForm}
              />
            )}
          </>,
          document.body
        )}
    </div>
  );
}
