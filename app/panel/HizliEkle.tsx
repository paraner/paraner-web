"use client";

/* ÜST BAR — HIZLI EKLEME ("dinamik ada")
 *
 * Mehmet (26.07): "ekle yerine dinamik ada gibi bir şey olsun, Apple yapıyor ya onun gibi;
 * üzerine geldiğinde açılsın, üzerinden gittiğinde kapansın."
 *
 * Davranış: fareyle üzerine gelince açılır, ayrılınca kapanır. Dokunmatikte hover yoktur →
 * TIKLAMA da açar/kapatır. Klavyeyle odaklanınca da açılır (Tab ile gezen kullanıcı).
 *
 * ⚠️ TEK GÖVDE (28.07, Mehmet: "ayrı bir panelmiş gibi görünmesin, hemen altında açılsın").
 * Düğme ile menü AYRI İKİ KUTU DEĞİL: "Hızlı İşlem" yazan pilin KENDİSİ büyüyor — iOS
 * Dynamic Island'ın yaptığı da tam olarak bu (araştırma notu globals.css'te). Bu yüzden
 * üst barda duran `.di` yalnız YER TUTUCUdur (görünmez); görünen ada `body`ye portal
 * edilip o yer tutucunun tam üstüne oturtulur.
 * ⚠️ Bilinen ödün: ada portal edildiği için Tab sırası görsel sıradan farklı (sayfanın
 * sonunda). Menü zaten portaldeydi; erişilebilirlik bu turda kötüleşmedi.
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
  /* Menünün ekrandaki yeri — düğmenin altına, sağ kenarları hizalı.
     ⚠️ Menü de `body`'ye PORTAL ediliyor (form gibi). NEDEN (Mehmet, 28.07: "Parla
     açıkken + üzerine gelince menü arkada kalıyor"): üst bar `z-index: 10` ile KENDİ
     yığın bağlamını kuruyor → içindeki menü ne kadar yüksek z-index alırsa alsın, o
     bağlamın dışına (Parla çekmecesi 92, işlem çekmecesi 200, bildirim 300) çıkamıyor.
     Portal + `position: fixed` ile menü doğrudan `body` katmanında çizilir; konumu CSS
     ile hizalanamadığı için düğmenin yeri ÖLÇÜLÜP yazılır (NotificationBell ile aynı
     desen, aynı sebep). */
  /* Adanın ekrandaki yeri = üst bardaki yer tutucunun yeri. */
  const [konum, setKonum] = useState<{ top: number; right: number } | null>(null);
  /* Adanın ölçüleri. `height: auto` animasyon almaz → sayı şart.
       kapali = yalnız başlık satırı (pil hâli)
       acik   = başlık + liste (açık ada)
       w      = içeriğin doğal genişliği
     MASAÜSTÜNDE GENİŞLİK DEĞİŞMEZ: ada `width: max-content` ile en geniş satıra göre
     kurulur, pil de o genişlikte durur (Mehmet: "çerçeveyi içerikle genişlet") → açılırken
     yazı yana kaymaz, hareket tek eksende. `w` yalnız TELEFONDA gerekli: orada pil 40px
     ikon olur, açılınca bu genişliğe yayılır. */
  const [olcu, setOlcu] = useState<{ w: number; kapali: number; acik: number } | null>(null);
  const adaRef = useRef<HTMLDivElement>(null);
  const icRef = useRef<HTMLDivElement>(null);
  const basRef = useRef<HTMLButtonElement>(null);

  /* ⚠️ Ölçüm `overflow: hidden` ada içinde bile doğrudur: kırpma çocuğun yüksekliğini
     değiştirmez, yalnız görünürlüğünü keser. */
  const olcumAl = useCallback(() => {
    const ic = icRef.current;
    const bas = basRef.current;
    if (!ic || !bas) return;
    setOlcu({
      // Genişlik iç kutudan: ada telefonda 40px'e kırpılıyor, iç kutu doğal genişlikte kalıyor
      w: ic.offsetWidth,
      kapali: bas.offsetHeight + 12, // başlık + iç kutunun dikey dolgusu (6+6)
      acik: ic.offsetHeight,
    });
  }, []);

  const konumOlc = useCallback(() => {
    const r = kokRef.current?.getBoundingClientRect();
    if (r) setKonum({ top: r.top, right: window.innerWidth - r.right });
  }, []);

  /* İlk ölçüm + profil türü değişince (menü satır sayısı değişir) yeniden ölç.
     Yazı tipi geç yüklenirse genişlik değişebilir → `document.fonts.ready` sonrası bir daha. */
  useEffect(() => {
    olcumAl();
    konumOlc();
    document.fonts?.ready.then(() => {
      olcumAl();
      konumOlc();
    });
  }, [olcumAl, konumOlc, profileType]);

  const iptal = () => {
    if (kapatmaZamani.current) clearTimeout(kapatmaZamani.current);
    kapatmaZamani.current = null;
  };
  const ac = useCallback(() => {
    iptal();
    konumOlc();
    setAcik(true);
  }, [konumOlc]);

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
    /* Ada `body`de → üst bardaki yer tutucu (`kokRef`) onu KAPSAMAZ; adanın kendisi
       sorulmalı, yoksa adanın içine tıklamak menüyü kapatırdı. */
    const disari = (e: MouseEvent) => {
      if (!adaRef.current?.contains(e.target as Node)) setAcik(false);
    };
    window.addEventListener("keydown", esc);
    document.addEventListener("mousedown", disari);
    window.addEventListener("resize", konumOlc);
    window.addEventListener("scroll", konumOlc, true);
    return () => {
      window.removeEventListener("keydown", esc);
      document.removeEventListener("mousedown", disari);
      window.removeEventListener("resize", konumOlc);
      window.removeEventListener("scroll", konumOlc, true);
    };
  }, [acik, konumOlc]);

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
    <>
      {/* ÜST BARDAKİ YER TUTUCU — görünmez, yalnız adanın kapladığı yeri ayırır.
          Ada `body`ye portal edildiği için (bkz. dosya başı notu) üst bar onun
          genişliğini kendiliğinden bilemez; ölçülen değer buraya yazılır. */}
      <div
        className="di"
        ref={kokRef}
        aria-hidden="true"
        style={olcu ? { width: olcu.w, height: olcu.kapali } : undefined}
      />

      {/* ADA — tek gövde: pil de menü de bu kutu. Kapalıyken yalnız başlık satırı
          görünür, açılınca kutu aşağı doğru büyür ve liste ortaya çıkar.
          ⚠️ onMouseEnter DEĞİL, hover yeteneği kontrollü onPointerEnter: dokunmatikte
          tarayıcı parmak değince sentetik "fare girdi" üretiyor (menü açılıyor), hemen
          ardından click gelip kapatıyordu → telefonda menü hiç açılmıyordu (ölçüldü). */}
      {mounted &&
        createPortal(
          <div
            ref={adaRef}
            className={`di-ada${acik ? " acik" : ""}`}
            style={
              {
                top: konum?.top,
                right: konum?.right,
                "--di-y0": olcu ? `${olcu.kapali}px` : undefined,
                "--di-y1": olcu ? `${olcu.acik}px` : undefined,
                "--di-w1": olcu ? `${olcu.w}px` : undefined,
              } as React.CSSProperties
            }
            onPointerEnter={hoverVar ? ac : undefined}
            onPointerLeave={hoverVar ? gecikmeliKapat : undefined}
          >
            <div className="di-ic" ref={icRef}>
              <button
                ref={basRef}
                type="button"
                className="di-bas"
                aria-label="Hızlı işlem"
                aria-expanded={acik}
                aria-haspopup="menu"
                onClick={() => setAcik((a) => !a)}
                /* ⚠️ Düz `onFocus={ac}` OLMAZ: dokunmatikte parmak değince düğme
                   ODAKLANIYOR (menü açılıyor), hemen ardından click gelip kapatıyordu →
                   telefonda ilk dokunuş hiçbir şey yapmıyor gibi görünüyordu (ölçüldü).
                   `:focus-visible` yalnız KLAVYE odağında doğrudur. */
                onFocus={(e) => {
                  if (e.currentTarget.matches(":focus-visible")) ac();
                }}
              >
                <Plus aria-hidden="true" />
                <span className="di-bas-txt">Hızlı İşlem</span>
              </button>

              <div className="di-liste" role="menu" aria-hidden={!acik}>
                {eylemler.map((e, i) => (
                  <button
                    key={e.etiket}
                    type="button"
                    role="menuitem"
                    className="di-row"
                    tabIndex={acik ? 0 : -1}
                    /* Satırlar sırayla belirsin — kutu önde, içerik peşinde (iOS deseni) */
                    style={{ transitionDelay: acik ? `${60 + i * 26}ms` : "0ms" }}
                    onClick={() => calistir(e)}
                  >
                    <span className="di-ikon" aria-hidden="true">
                      {e.ikon}
                    </span>
                    {e.etiket}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

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
    </>
  );
}
