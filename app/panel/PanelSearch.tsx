"use client";

/* PANEL GENELİ ARAMA (üst bar) — iki katman:
 *   ① SAYFALAR: tamamen yerel, anında, veritabanına HİÇ gitmez. Kaynak sol menünün kendisi
 *      (`BUSINESS_SECTIONS`) → yeni modül eklenince aramaya elle satır eklemek GEREKMEZ.
 *      Yanına Türkçe eş anlamlılar konur ("veresiye" → Veresiye Defteri, "kar" → Kâr/Zarar).
 *   ② VERİ: kullanıcının kendi kayıtları (`lib/panelSearch.ts`) — 2 harften sonra, gecikmeli.
 *
 * ⚠️ Sayfa listesi profil türünü İZLER: işletme bölümleri bireysel hesapta menüde yoktur,
 * aramada da çıkmamalı (olmayan sayfaya götürmek en kötü arama sonucudur).
 *
 * ⚠️ Türkçe arama düz `toLowerCase()` ile ÇALIŞMAZ: "İ"→"i̇" (noktalı) çıkar, "Kâr" yazan
 * başlığı "kar" araması bulamaz. Hem tr-TR küçültme hem şapka/nokta sadeleştirme yapılıyor.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, X } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { fetchCustomCategories, type CustomCategory } from "../../lib/customCategories";
import { BUSINESS_SECTIONS } from "./businessMenu";
import {
  veriAra,
  GRUP_ETIKET,
  GRUP_SIRA,
  type VeriSonuc,
  type VeriTipi,
} from "../../lib/panelSearch";
import { formatCurrency } from "../../lib/format";

/* ── Türkçe normalleştirme ── */
const HARF: Record<string, string> = {
  ı: "i", i̇: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c",
  â: "a", î: "i", û: "u", ê: "e",
};
const nrm = (s: string) =>
  s.toLocaleLowerCase("tr-TR").replace(/[ıi̇şğüöçâîûê]/g, (m) => HARF[m] ?? m);

type Sayfa = { etiket: string; href: string; grup: string; anahtar: string };

/* Eş anlamlılar — mobil `app/app-search.tsx` SYNONYMS'ten uyarlandı (web yollarına göre).
   Amaç: kullanıcının aklındaki kelime menüdeki başlıktan farklı olduğunda da bulunsun. */
const ES_ANLAM: Record<string, string> = {
  "/panel": "ozet dashboard ana sayfa kpi genel bakis durum",
  "/panel/islemler": "gelir gider harcama hareket kayit islem",
  "/panel/hesaplar": "kasa banka iban hesap bakiye kart",
  "/panel/cuzdanim": "birikim yatirim varlik portfoy altin doviz",
  "/panel/ayarlar": "ayar tercih profil sirket",
  "/panel/destek": "yardim destek sss soru talep iletisim",
  "/panel/faturalar": "fatura satis alis kesme belge",
  "/panel/duzenli-fatura": "duzenli fatura otomatik abonelik tekrar",
  "/panel/teklifler": "teklif proforma fiyat teklifi",
  "/panel/duzenli-odemeler": "duzenli odeme abonelik otomatik kira",
  "/panel/cek-senet": "cek senet vade odeme",
  "/panel/borc-alacak": "borc alacak takip",
  "/panel/nakit-akisi": "nakit akis analiz likidite",
  "/panel/kdv": "kdv hesapla vergi hesap makinesi",
  "/panel/butceler": "butce limit harcama kategori",
  "/panel/musteriler": "musteri tedarikci kart kisi rehber",
  "/panel/cariler": "cari hesap bakiye musteri tedarikci",
  "/panel/veresiye": "veresiye borc defter musteri borcu",
  "/panel/mutabakat": "mutabakat anlasma uzlasma bakiye dogrulama",
  "/panel/vade": "vade gecikme alacak yaslandirma tahsilat",
  "/panel/calisanlar": "calisan personel eleman liste",
  "/panel/maaslar": "maas odeme personel calisan ucret",
  "/panel/harcamalar": "calisan harcama masraf fis",
  "/panel/izinler": "izin devamsizlik tatil rapor calisan",
  "/panel/urunler": "urun hizmet katalog fiyat",
  "/panel/stok": "stok depo urun miktar",
  "/panel/gelir-gider-raporu": "gelir gider rapor ozet",
  "/panel/kar-zarar": "kar zarar tablo karlilik",
  "/panel/kdv-raporu": "kdv beyanname vergi rapor",
  "/panel/vergi-takvimi": "vergi takvim son odeme tarih",
};

/* Ayarlar sekmeleri ayrı ayrı aranabilir — "abonelik" ya da "kategori" arayan kullanıcı
   önce Ayarlar'ı bulup içinde sekme aramak zorunda kalmasın. */
const AYAR_SEKMELERI: { etiket: string; tab: string; anahtar: string }[] = [
  { etiket: "Hesap Bilgileri", tab: "genel", anahtar: "profil ad sirket vergi iban logo" },
  { etiket: "Fatura Ayarları", tab: "fatura", anahtar: "fatura numara seri sira" },
  { etiket: "Kategoriler", tab: "kategoriler", anahtar: "kategori ikon renk ozel" },
  { etiket: "Abonelik", tab: "abonelik", anahtar: "plan premium pro yukselt deneme odeme uyelik" },
  { etiket: "Veri & Yedekleme", tab: "veri", anahtar: "yedek disa aktar csv indir ice aktar" },
  { etiket: "Bildirimler", tab: "bildirimler", anahtar: "bildirim uyari mail eposta tercih" },
  { etiket: "Hesap & Güvenlik", tab: "hesap", anahtar: "sifre parola guvenlik cihaz hesap sil" },
];

function sayfaKatalogu(isletmeMi: boolean): Sayfa[] {
  const s: Sayfa[] = [
    { etiket: "Genel Bakış", href: "/panel", grup: "Genel" },
    { etiket: "İşlemler", href: "/panel/islemler", grup: "Genel" },
    { etiket: "Hesaplar", href: "/panel/hesaplar", grup: "Genel" },
    { etiket: "Cüzdanım", href: "/panel/cuzdanim", grup: "Genel" },
  ].map((x) => ({ ...x, anahtar: ES_ANLAM[x.href] ?? "" }));

  if (isletmeMi) {
    for (const bol of BUSINESS_SECTIONS)
      for (const it of bol.items)
        // href:null = web'de henüz yok (menüde pasif satır) → aramada da gösterme
        if (it.href)
          s.push({
            etiket: it.label,
            href: it.href,
            grup: bol.label,
            anahtar: ES_ANLAM[it.href] ?? "",
          });
  }

  for (const t of AYAR_SEKMELERI)
    s.push({
      etiket: t.etiket,
      href: `/panel/ayarlar?tab=${t.tab}`,
      grup: "Ayarlar",
      anahtar: t.anahtar,
    });

  s.push({ etiket: "Destek", href: "/panel/destek", grup: "Ayarlar", anahtar: ES_ANLAM["/panel/destek"] });
  return s;
}

export default function PanelSearch({
  profilId,
  isletmeMi,
}: {
  profilId: string;
  isletmeMi: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [acik, setAcik] = useState(false);
  const [terim, setTerim] = useState("");
  const [veri, setVeri] = useState<VeriSonuc[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const [imlec, setImlec] = useState(0);
  const [ozelKat, setOzelKat] = useState<CustomCategory[]>([]);
  /* Kutu `body`'ye taşınır (portal) — ParlaChat ile aynı desen. Sebep: bileşen ÜST BARIN
     içinde doğuyor, üst bar da `z-index` taşıyan bir flex öğesi → kendi katman bağlamını
     kuruyor. Portal olmadan `position: fixed` karartma sol menünün ALTINDA kalıyordu
     (ölçüldü: menü kararmıyordu). */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  /* Kısayol ipucu işletim sistemine göre: Mac'te ⌘K, Windows/Linux'ta Ctrl K.
     Kısayolun KENDİSİ zaten ikisini de dinliyordu (aşağıda `metaKey || ctrlKey`) —
     eksik olan yalnız kutudaki yazıydı: Windows kullanıcısı hiç basmayacağı bir tuşu
     görüyordu (Mehmet, 28.07).
     ⚠️ Sunucuda işletim sistemi BİLİNEMEZ → ilk çizimde ⌘K yazılır, tarayıcı açılınca
     düzeltilir. Varsayılan Mac tarafı: aksi hâlde Mac kullanıcısında yazı "Ctrl K"den
     "⌘K"ya atlar; bu kutuyu asıl kullanan kitle Mac. Windows'ta tek karelik bir
     düzelme olur, kimse fark etmez. (Sunucu/istemci ilk çizim aynı olmalı — yoksa
     React "hydration" uyarısı verir; bu yüzden state + effect, doğrudan okuma değil.) */
  const [mac, setMac] = useState(true);
  useEffect(() => {
    const p =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ??
      navigator.platform ??
      "";
    // iPad/iPhone'da da ⌘ doğru (harici klavye); "Mac" ve "iP*" birlikte bakılır.
    setMac(/mac|iphone|ipad|ipod/i.test(`${p} ${navigator.userAgent}`));
  }, []);
  const ozelKatAlindi = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);
  const kutuRef = useRef<HTMLDivElement>(null);
  const [konum, setKonum] = useState<{ left: number; top: number; width: number } | null>(null);

  /* Listeyi kutunun altına çivile. Portal `body`'de olduğu için hizalama CSS ile
     yapılamıyor → kutunun ekrandaki yeri ölçülüp yazılıyor.
     Telefonda kutu daraldığı için liste kutuya değil EKRANA göre genişler (yoksa
     sonuçlar 200px'lik bir şeride sıkışırdı). */
  const olc = useCallback(() => {
    const r = kutuRef.current?.getBoundingClientRect();
    if (!r) return;
    const dar = window.innerWidth <= 760;
    setKonum(
      dar
        ? { left: 12, top: r.bottom + 8, width: window.innerWidth - 24 }
        : { left: r.left, top: r.bottom + 8, width: r.width }
    );
  }, []);

  useEffect(() => {
    if (!acik) return;
    olc();
    window.addEventListener("resize", olc);
    return () => window.removeEventListener("resize", olc);
  }, [acik, olc]);

  /* AÇILIŞ/KAPANIŞ — kapanışta liste bir anda YOK OLMASIN diye ayrı bir "kapanıyor"
     evresi var: `acik` false olunca DOM'dan hemen silmiyoruz, çıkış animasyonu bitene
     kadar (KAPANIS_MS) tutuyoruz. React tek başına bunu yapmaz; unmount anında animasyon
     çalışmaz. Süre CSS'teki `psOut` ile aynı olmalı. */
  const KAPANIS_MS = 120;
  const [gorunur, setGorunur] = useState(false);
  useEffect(() => {
    if (acik) {
      setGorunur(true);
      return;
    }
    if (!gorunur) return;
    const t = setTimeout(() => setGorunur(false), KAPANIS_MS);
    return () => clearTimeout(t);
  }, [acik, gorunur]);

  const katalog = useMemo(() => sayfaKatalogu(isletmeMi), [isletmeMi]);

  /* ⌘K / Ctrl+K her yerden açar. Kullanıcı bir yazı alanındayken çalışmaz —
     fatura notu yazarken kısayola basmak paneli kaçırmasın. */
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        const h = document.activeElement;
        const yaziAlani =
          h instanceof HTMLElement &&
          (h.tagName === "INPUT" || h.tagName === "TEXTAREA" || h.isContentEditable);
        if (yaziAlani && h !== inputRef.current) return;
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setAcik(true);
      }
      if (e.key === "Escape") {
        setAcik(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [acik]);

  useEffect(() => {
    if (acik) {
      setImlec(0);
      /* Özel kategoriler İLK AÇILIŞTA bir kez çekilir (panel ayakta kaldığı sürece yeniden
         çekilmez). Sebep: işlem sonucunda kategori adı yazacağız; kimlik ("kira_geliri")
         basmak panelin geri kalanıyla çelişirdi. */
      if (!ozelKatAlindi.current) {
        ozelKatAlindi.current = true;
        fetchCustomCategories(profilId).then(setOzelKat).catch(() => {});
      }
      return;
    }
    setTerim("");
    setVeri([]);
  }, [acik, profilId]);

  /* Veri araması: 2 harf + 250ms sessizlik. Her tuşta 12 tabloya sorgu atmamak için
     (arama kutusu panelin en pahalı bileşeni olabilirdi). */
  useEffect(() => {
    const t = terim.trim();
    if (t.length < 2) {
      setVeri([]);
      setAraniyor(false);
      return;
    }
    setAraniyor(true);
    let gecerli = true;
    const z = setTimeout(async () => {
      const r = await veriAra(supabase, profilId, isletmeMi, t, ozelKat);
      if (!gecerli) return; // kullanıcı yazmaya devam ettiyse eski cevabı YAZMA
      setVeri(r);
      setAraniyor(false);
    }, 250);
    return () => {
      gecerli = false;
      clearTimeout(z);
    };
  }, [terim, supabase, profilId, isletmeMi, ozelKat]);

  const sayfaSonuc = useMemo(() => {
    const t = nrm(terim.trim());
    if (!t) {
      /* Boş kutuda katalogun ilk 6'sı gösteriliyordu → "Düzenli Fatura" gibi nadir sayfalar
         hızlı erişim sanılıyordu. Sıra elle seçildi (en çok gidilenler). */
      const kisa = isletmeMi
        ? ["/panel", "/panel/islemler", "/panel/faturalar", "/panel/musteriler", "/panel/hesaplar", "/panel/urunler"]
        : ["/panel", "/panel/islemler", "/panel/hesaplar", "/panel/cuzdanim", "/panel/ayarlar?tab=kategoriler", "/panel/ayarlar?tab=abonelik"];
      return kisa
        .map((h) => katalog.find((s) => s.href === h))
        .filter((s): s is Sayfa => Boolean(s));
    }
    const puanla = (s: Sayfa) => {
      const e = nrm(s.etiket);
      if (e.startsWith(t)) return 0;
      if (e.includes(t)) return 1;
      if (nrm(s.anahtar).includes(t)) return 2;
      return 99;
    };
    return katalog
      .map((s) => ({ s, p: puanla(s) }))
      .filter((x) => x.p < 99)
      .sort((a, b) => a.p - b.p)
      .slice(0, 8)
      .map((x) => x.s);
  }, [terim, katalog]);

  const veriGruplu = useMemo(() => {
    const m = new Map<VeriTipi, VeriSonuc[]>();
    for (const v of veri) {
      const l = m.get(v.tip) ?? [];
      l.push(v);
      m.set(v.tip, l);
    }
    return GRUP_SIRA.filter((t) => m.has(t)).map((t) => ({ tip: t, kayitlar: m.get(t)! }));
  }, [veri]);

  // Klavye ile gezinilen DÜZ liste (ekrandaki sırayla aynı olmalı)
  const duzListe = useMemo(
    () => [
      ...sayfaSonuc.map((s) => s.href),
      ...veriGruplu.flatMap((g) => g.kayitlar.map((k) => k.href)),
    ],
    [sayfaSonuc, veriGruplu]
  );

  const git = useCallback(
    (href: string) => {
      setAcik(false);
      router.push(href);
    },
    [router]
  );

  function tus(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setImlec((i) => Math.min(i + 1, duzListe.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setImlec((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const h = duzListe[imlec];
      if (h) git(h);
    }
  }

  // İmleç görünür kalsın (uzun listede klavyeyle aşağı inince)
  useEffect(() => {
    listeRef.current
      ?.querySelector<HTMLElement>(`[data-i="${imlec}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [imlec]);

  let sira = -1; // düz listedeki konum (render sırasına göre artar)

  return (
    <>
      {/* Kutunun KENDİSİ gerçek input — ayrı bir "tetikleyici düğme + pencere içinde ikinci
          input" kurgusu yoktu artık: kullanıcı ortadaki kutuya yazar, liste tam ALTINDA açılır. */}
      <div className="ps-box" ref={kutuRef}>
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          className="ps-input"
          value={terim}
          onChange={(e) => {
            setTerim(e.target.value);
            setImlec(0);
            if (!acik) setAcik(true);
          }}
          onFocus={() => setAcik(true)}
          onKeyDown={tus}
          placeholder="Ara"
          aria-label="Panelde ara"
          aria-expanded={acik}
          autoComplete="off"
          spellCheck={false}
        />
        {araniyor ? (
          <span className="ps-spin" aria-label="Aranıyor" />
        ) : terim ? (
          <button
            type="button"
            className="ps-clear"
            aria-label="Aramayı temizle"
            onClick={() => {
              setTerim("");
              inputRef.current?.focus();
            }}
          >
            <X aria-hidden="true" />
          </button>
        ) : (
          <kbd className="ps-kbd" title={mac ? "Command + K" : "Ctrl + K"}>
            {mac ? "⌘K" : "Ctrl K"}
          </kbd>
        )}
      </div>

      {mounted && gorunur && konum && createPortal(
        <div
          className={`ps-overlay${acik ? "" : " kapaniyor"}`}
          onMouseDown={() => setAcik(false)}
          role="presentation"
        >
          {/* Liste kutuya ÇİVİLİ: konum/genişlik kutunun ölçüsünden gelir (portal body'de
              olduğu için CSS ile hizalanamaz, ölçüp yazıyoruz). */}
          <div
            className={`ps-panel${acik ? "" : " kapaniyor"}`}
            role="listbox"
            aria-label="Arama sonuçları"
            style={{ left: konum.left, top: konum.top, width: konum.width }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="ps-results" ref={listeRef}>
              {sayfaSonuc.length > 0 && (
                <div className="ps-group">
                  <div className="ps-group-label">{terim.trim() ? "Sayfalar" : "Hızlı erişim"}</div>
                  {sayfaSonuc.map((s) => {
                    sira += 1;
                    const i = sira;
                    return (
                      <button
                        key={s.href}
                        type="button"
                        data-i={i}
                        className={`ps-row${i === imlec ? " on" : ""}`}
                        onMouseEnter={() => setImlec(i)}
                        onClick={() => git(s.href)}
                      >
                        <span className="ps-row-main">
                          <span className="ps-row-title">{s.etiket}</span>
                          <span className="ps-row-sub">{s.grup}</span>
                        </span>
                        <CornerDownLeft className="ps-enter" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              )}

              {veriGruplu.map((g) => (
                <div className="ps-group" key={g.tip}>
                  <div className="ps-group-label">{GRUP_ETIKET[g.tip]}</div>
                  {g.kayitlar.map((k) => {
                    sira += 1;
                    const i = sira;
                    return (
                      <button
                        key={k.tip + k.id}
                        type="button"
                        data-i={i}
                        className={`ps-row${i === imlec ? " on" : ""}`}
                        onMouseEnter={() => setImlec(i)}
                        onClick={() => git(k.href)}
                      >
                        <span className="ps-row-main">
                          <span className="ps-row-title">{k.baslik}</span>
                          {k.alt && <span className="ps-row-sub">{k.alt}</span>}
                        </span>
                        {k.tutar != null && (
                          <span className={`ps-amount${k.tutar < 0 ? " eksi" : ""}`}>
                            {formatCurrency(k.tutar, k.paraBirimi ?? "TRY")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              {terim.trim().length >= 2 && !araniyor && duzListe.length === 0 && (
                <p className="ps-empty">
                  <b>“{terim.trim()}”</b> için sonuç yok. Sayfa adı, kişi adı, fatura numarası
                  ya da tutar yazmayı dene.
                </p>
              )}
              {terim.trim().length === 1 && (
                <p className="ps-empty">Kayıtlarında arama için en az 2 harf yaz.</p>
              )}
            </div>

            <div className="ps-foot">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> gez
              </span>
              <span>
                <kbd>↵</kbd> aç
              </span>
              <span>
                <kbd>esc</kbd> kapat
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
