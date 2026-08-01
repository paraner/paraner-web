"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Sparkles, X, ArrowUp, Plus, ImageIcon, Trash2, Check, Maximize2, Minimize2 } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";
import { announceDataChanged, announceRightPanel, useCloseOnOtherRightPanel } from "../../../lib/rightPanel";
import RichText, { parseBlocks, countWords } from "./RichText";
import { getCurrencySymbol } from "../../../lib/currencies";
import { confirmDialog } from "../../components/confirm";
import { showToast } from "../../components/toast";

/* ═══════════════════════════════════════════════════════════════════════════
   PARLA — panel içi AI asistanı (sağdan açılan yan panel)

   NEDEN YAN PANEL (baloncuk değil): Parla yalnız cevap vermiyor, İŞLEM DE EKLİYOR.
   Sektör araştırması (~/Developer/Paraner/parla/PLAN.md): köşedeki yüzen baloncuk kullanıcıya
   "destek botu, bir şey yapmaz" hissi veriyor; yan panel "yardımcı/copilot" konumu veriyor.
   Ayrıca panel arkada görünür kalıyor → eklenen işlem listede anında görülebiliyor.

   BEYİN BURADA DEĞİL: bu dosya yalnız ekran. Kurallar, kullanıcı verisi, işlem ekleme/silme
   ve sohbet kaydı SUNUCUDA (`ai-chat` edge function, mode: "assistant"). Mobil de aynı
   sunucuya bağlanacak (Faz 4) → tek beyin.
   ═══════════════════════════════════════════════════════════════════════════ */

type Msg = { id: string; role: "user" | "assistant"; content: string };

/** Sunucu "hangi kategoriye ekleyeyim?" dediğinde gelen taslak — işlem HENÜZ kaydedilmedi. */
type Secenek = { slug: string; label: string; icon?: string | null; color?: string | null; custom?: boolean };
type BekleyenKategori = {
  tx: { type: string; amount: number; title: string; date: string; currency?: string | null };
  options: Secenek[];
};

const FN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`;

/* Benzersiz mesaj id — `Date.now()` tek başına yetmiyor: aynı milisaniyede iki mesaj
   (çip onayı + yeni mesaj) aynı id alıp React'te tek key olarak çakışabilir (mobilde
   canlı görüldü, 24.07). Monoton sayaç bunu kökten bitirir. */
let _msgSayac = 0;
const yeniId = (p: string) => `${p}${Date.now()}-${++_msgSayac}`;

/* ─── DAKTİLO (cevap kelime kelime açılır) ───────────────────────────────────
   ⚠️ NEDEN İSTEMCİDE (25.07, Mehmet: "webde daktilo yok, appteki gibi olmalı"):
   sunucu YEREL katman cevaplarını (kategori sorusu, "işlem kaydedildi", özet) tek
   parça gönderiyor — AI'ya hiç gitmediği için akışa bölecek bir şey yok. Akışa
   güvenen web bunları "tak" diye basıyordu. Mobil (`app/ai-chat.tsx` StreamingMarkdown)
   zaten istemcide açıyor; buradaki hız/sınırlar onunla BİREBİR aynı tutulmalı. */
const DAKTILO_HEDEF_MS = 2400; // uzun cevap da yaklaşık bu sürede biter
const DAKTILO_MIN_MS = 9;
const DAKTILO_MAX_MS = 34;

/** Snap'te mesajın tepeden bırakacağı nefes payı (px). */
const SNAP_PAY = 6;

/* Cevaplanmamış kategori sorusu hatırlatması.
   ⚠️ DAVRANIŞ DEĞİŞTİ (Mehmet, 25.07): eskiden kullanıcı çip seçmeden başka bir şey
   yazınca taslak SESSİZCE düşüyordu — "ne oldu ona?" sorusu doğuyordu. Artık taslak
   DURUYOR: Parla önce yeni soruyu cevaplıyor, cevabı bitince tek bir hatırlatma
   yazıyor ve çipler yerinde kalıyor. İşlem hâlâ KAYDEDİLMİŞ DEĞİL — çipe dokununca
   kaydedilir (kayıt anı değişmedi).
   ⚠️ Tutar işaretli + sembollü yazılmalı, yoksa renklenmez (bkz. RichText INLINE_TUTAR). */
function hatirlatmaMetni(bekleyen: BekleyenKategori): string {
  const tx = bekleyen.tx;
  const gelir = tx.type === "income";
  const miktar = Number(tx.amount).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const tutar = `${gelir ? "+" : "−"}${miktar} ${getCurrencySymbol(tx.currency || "TRY")}`;
  return `Bu arada ${tutar} tutarını hangi kategoriye yazacağını belirtmedin. Aşağıdan seçersen ${
    gelir ? "gelir" : "gider"
  } olarak kaydedeyim.`;
}

/** Sunucu bir şey değiştirdiyse panel verisi bayat kalmasın (panel kuralı: mutasyon → refresh). */
const MUTATING_ACTIONS = ["transaction_added", "transaction_deleted", "goal_updated"];

/* Kayıt olduğunda üst bardan kısa bildirim.
   NEDEN sohbetteki cevap yetmiyor: sohbet balonu "Parla ne dedi"yi söyler; bildirim
   "PANELDEKİ VERİN değişti"i söyler. Kullanıcının gözü çoğu zaman arkadaki sayfada
   oluyor (Mehmet, 24.07: "eklemedi sandım"). */
const ACTION_TOAST: Record<string, string> = {
  transaction_added: "İşlem kaydedildi",
  transaction_deleted: "İşlem silindi",
  goal_updated: "Birikim hedefi güncellendi",
};

function bildir(action?: string | null) {
  if (!action) return;
  const baslik = ACTION_TOAST[action];
  if (baslik) showToast({ title: baslik, variant: "success" });
  // Sayfalar kendi istemci listelerini (ör. özel kategoriler) tazelesin
  announceDataChanged();
}

/* Belge (fiş/fatura/dekont) yükleme — sunucunun kabul ettiği türler (edge ALLOWED_IMAGE_MIME).
   ⚠️ PDF sunucuda desteklenmiyor; kullanıcıya seçtirip sonra reddetmemek için listede yok. */
/* ─── Panel genişliği (Shopify Sidekick'ten birebir ölçüldü, 01.08) ───────────────
   Shopify: varsayılan 400px, sürükleme sınırı 300–600, kademe YOK (1px hassasiyet),
   değer `localStorage`da `{"open":true,"size":437}` biçiminde saklanıyor ve sayfa
   yenilense de korunuyor. Aynı sınırlar ve aynı saklama biçimi. */
const PARLA_VARSAYILAN_W = 400;
const PARLA_MIN_W = 300;
const PARLA_MAX_W = 600;
const PARLA_DEPO = "paraner-parla-panel";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
/* Fiş okuma için 1600px fazlasıyla yeterli (mobil `compressImage` ile aynı ölçü): tarayıcıda
   küçültmek yüklemeyi hızlandırır, 8MB sınırına takılmayı ve gereksiz AI maliyetini önler. */
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.7;

/** Dosyayı tarayıcıda küçültüp base64'e çevirir (data URI öneki olmadan). */
function fileToCompressedBase64(file: File): Promise<{ base64: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Görsel işlenemedi")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      URL.revokeObjectURL(url);
      resolve({ base64: dataUrl.split(",")[1] ?? "", preview: dataUrl });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Görsel okunamadı")); };
    img.src = url;
  });
}

export default function ParlaChat() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  /* Panel genişliği + "genişletildi mi" — Shopify Sidekick deseni (canlı ölçüldü 01.08).
     Genişlik kullanıcının sürüklediği değer; sınırlar Shopify'ınkiyle aynı: 300–600.
     `hicAcildi`: kutu bir kez açıldıktan sonra DOM'dan HİÇ sökülmez (Shopify da sökmüyor)
     — kapanış animasyonunun oynayabilmesi için şart, bkz. aşağıdaki animasyon notu. */
  const [genislik, setGenislik] = useState(PARLA_VARSAYILAN_W);
  const [genis, setGenis] = useState(false);
  const [hicAcildi, setHicAcildi] = useState(false); // bir kez açıldıysa kutu DOM'da kalır
  const [girdi, setGirdi] = useState(false); // ilk kareden sonra true → içeri kayar
  const surukleBirak = useRef<(() => void) | null>(null);
  const navZaman = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number; isPremium: boolean } | null>(null);

  const [attached, setAttached] = useState<{ base64: string; preview: string; name: string } | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null); // sohbet temizlemede gerekli
  /* Kategori sorusu — yazma alanının ÜSTÜNDE çipler olarak durur. Kullanıcı cevaplamadan
     yeni bir mesaj yazarsa DÜŞER (Mehmet kararı): eski taslak kaydedilmez, yeni mesaj
     kendi başına değerlendirilir. */
  const [bekleyen, setBekleyen] = useState<BekleyenKategori | null>(null);
  const [yeniKategori, setYeniKategori] = useState<string | null>(null); // null = form kapalı

  /* Yazılmakta olan asistan mesajı: `n` = şu ana kadar açılmış kelime sayısı,
     `acik` = sunucudan hâlâ metin gelebilir (akış sürüyor) → kelimeler bitince
     durur, yeni parça gelince devam eder. Geçmiş mesajlar daktiloya girmez. */
  const [daktilo, setDaktilo] = useState<{ id: string; n: number; acik: boolean } | null>(null);

  /* Cevabın ARDINDAN yazılacak hatırlatma (bkz. `hatirlatmaMetni`). Cevap daktiloyla
     yazılırken araya girmesin diye kuyruğa alınır, yazma bitince basılır. */
  const [hatirlatma, setHatirlatma] = useState<string | null>(null);
  const hatirlatilanRef = useRef<BekleyenKategori | null>(null); // aynı taslak için tek kez

  /* Listenin altındaki GEÇİCİ boşluk (bkz. `snapUygula`). Cevap yazıldıkça küçülür →
     toplam yükseklik sabit kalır, ekran hiç oynamaz. */
  const [bosluk, setBosluk] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);  // son kullanıcı mesajı (tepeye oturan)
  const ciplerRef = useRef<HTMLDivElement | null>(null);  // kategori çipi rayı (yatay kayar)
  const boslukRef = useRef<HTMLDivElement | null>(null);
  const turAcikRef = useRef(false);   // gönderim turu sürüyor mu (boşluk yönetilsin mi)
  const kaydirildiRef = useRef(false); // bu turda anchor tepeye kaydırıldı mı

  useEffect(() => setMounted(true), []);

  // Sağ kenarı paylaşan diğer panel (işlem/fatura detayı) açılırsa Parla kapansın.
  const kapat = useCallback(() => setOpen(false), []);
  useCloseOnOtherRightPanel("parla", kapat);

  function ac() {
    setOpen(true);
    announceRightPanel("parla"); // açık detay çekmecesi varsa kapansın
  }

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  /* ─── SNAP — gönderilen mesaj tepeye, cevap altındaki boşluğa yazılır ─────────
     ⚠️ NEDEN BÖYLE (Mehmet, 25.07 — mobilde de aynı ders, `app/ai-chat.tsx` applySnap):
     eskiden her yeni kelimede liste DİBE kaydırılıyordu. Metin uzadıkça (satır sarması,
     boş satır, tutar satırı) yükseklik değişiyor, ekran aşağı-yukarı zıplıyordu.
     ChatGPT/mobil deseni: gönderim anında kullanıcının mesajı listenin TEPESİNE kaydırılır
     ve altına GEÇİCİ boşluk konur; cevap o boşluğu yiyerek yazılır → içerik yüksekliği
     sabit kalır, kaydırma olmaz. Cevap boşluktan uzunsa boşluk 0'a iner, metin doğal akar. */
  const snapUygula = useCallback((kaydir: boolean) => {
    const liste = listRef.current;
    const anchor = anchorRef.current;
    if (!liste || !anchor) return;
    const listeUst = liste.getBoundingClientRect().top;
    const anchorY = anchor.getBoundingClientRect().top - listeUst + liste.scrollTop;
    // Boşluk hesabın içine girmemeli, yoksa kendi kendini besler.
    const mevcutBosluk = boslukRef.current?.offsetHeight ?? 0;
    const alt = Math.max(0, liste.scrollHeight - mevcutBosluk - anchorY); // anchor + cevap
    setBosluk(Math.max(0, liste.clientHeight - alt - SNAP_PAY * 2));
    if (!kaydir) return;
    requestAnimationFrame(() => {
      const el = listRef.current;
      const a = anchorRef.current;
      if (!el || !a) return;
      const y = a.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
      el.scrollTo({ top: Math.max(0, y - SNAP_PAY), behavior: "smooth" });
    });
  }, []);

  /* Panel kapanınca snap boşluğu askıda kalmasın — tekrar açılınca sohbetin altında
     sebepsiz boşluk olarak görünürdü. */
  useEffect(() => {
    if (open) return;
    turAcikRef.current = false;
    setBosluk(0);
  }, [open]);

  /** Yeni bir gönderim turu başlat (mesaj yolla / kategori çipine dokun). */
  const turBaslat = useCallback(() => {
    turAcikRef.current = true;
    kaydirildiRef.current = false;
  }, []);

  /* Tur boyunca: mesaj eklendikçe ve daktilo kelime açtıkça boşluğu yeniden ölç.
     İlk ölçümde (kullanıcı mesajı eklendiğinde) bir kez anchor'a kaydırılır. */
  useLayoutEffect(() => {
    if (!turAcikRef.current || !anchorRef.current) return;
    const kaydir = !kaydirildiRef.current;
    if (kaydir) kaydirildiRef.current = true;
    snapUygula(kaydir);
  }, [msgs, daktilo, snapUygula]);

  /* Geçmiş SADECE panel ilk açıldığında yüklenir — her sayfa yüklemesinde sorgu atmayalım.
     Sohbet `chat_messages` tablosunda ve PROFİL bazlı → telefonda başlayan konuşma burada
     kaldığı yerden devam eder. */
  useEffect(() => {
    if (!open || loaded) return;
    let alive = true;
    (async () => {
      setBooting(true);
      const supabase = createClient();
      /* ⚠️ `maybeSingle()` KULLANMA (24.07 canlı hata): bir hesapta iki profil birden aktif
         işaretliyse maybeSingle HATA döndürür → sohbet geçmişi hiç yüklenmez ("mesajlar
         gitmiş" gibi görünür). Panelin geri kalanı aktif olanlardan İLKİNİ alıyor
         (lib/supabase/profile.ts, created_at sırası) — burası da aynısını yapar. */
      const { data: profiller } = await supabase
        .from("profiles")
        .select("id, is_active, is_primary")
        .order("created_at", { ascending: true })
        .limit(20);

      const profile =
        (profiller ?? []).find((p) => p.is_active) ??
        (profiller ?? []).find((p) => p.is_primary) ??
        (profiller ?? [])[0];

      if (profile?.id) {
        if (alive) setProfileId(profile.id);
        const { data } = await supabase
          .from("chat_messages")
          .select("id, role, content")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: true })
          .limit(50);
        if (alive && data) setMsgs(data as Msg[]);
      }
      if (alive) {
        setBooting(false);
        setLoaded(true);
        scrollToEnd();
        inputRef.current?.focus();
      }
    })();
    return () => { alive = false; };
  }, [open, loaded, scrollToEnd]);

  /* ─── Kategori çipi rayı: YATAY kaydırma ────────────────────────────────────
     ⚠️ NEDEN GEREKLİ (Mehmet, 25.07 canlı: "çiplere scroll edilemiyor, app'deki gibi
     olmalı"): ray zaten `overflow-x: auto` ama masaüstünde fare tekerleği DİKEY kaydırır
     → satır kıpırdamıyor, üstüne kaydırma çubuğu da gizli olduğu için kayabildiği hiç
     belli olmuyordu. Telefonda parmakla sürüklüyorsun; webde karşılığı yoktu.
     ① tekerlek yatay çevrilir  ② FARE ile sürüklenir (dokunmatikte doğal kaydırma kalır).
     ⚠️ Tekerlek dinleyicisi native ve `passive:false` — React'in onWheel'i pasif ekleniyor,
     `preventDefault` işlemiyor (arkadaki sohbet listesi kayardı). */
  useEffect(() => {
    const el = ciplerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return; // taşma yoksa karışma
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      el.scrollLeft += d;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [bekleyen, yeniKategori]);

  /* Fare ile sürükleyerek kaydırma. `tasindi` bayrağı şart: sürükleme bitince gelen
     tıklama yutulmazsa parmağın kalktığı çip seçilip işlem kaydedilirdi. */
  const surukle = useRef<{ x: number; sol: number; tasindi: boolean } | null>(null);

  function rayPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return; // dokunmatik: iOS/Android kendi kaydırması daha iyi
    const el = ciplerRef.current;
    if (!el) return;
    surukle.current = { x: e.clientX, sol: el.scrollLeft, tasindi: false };
  }

  function rayPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ciplerRef.current;
    const s = surukle.current;
    if (!el || !s) return;
    const dx = e.clientX - s.x;
    if (!s.tasindi && Math.abs(dx) > 4) s.tasindi = true; // titremeyi sürükleme sayma
    if (s.tasindi) el.scrollLeft = s.sol - dx;
  }

  function rayClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (!surukle.current?.tasindi) return;
    e.preventDefault();
    e.stopPropagation();
    surukle.current = null;
  }

  /* Sayfa içeriğini sola kaydır (işlem detayı çekmecesiyle aynı davranış).
     Kabuk (`app/panel/layout.tsx`) sunucu bileşeni → prop yerine body sınıfı: hiçbir sayfanın
     kodu değişmez, sonradan eklenen sayfalar da kendiliğinden uyar. CSS: `body.parla-open`. */
  useEffect(() => {
    document.body.classList.toggle("parla-open", open);
    return () => document.body.classList.remove("parla-open");
  }, [open]);

  /* ─── Genişlik: kaydedilmiş değeri geri yükle (Shopify da `localStorage` kullanıyor) ───
     ⚠️ Yalnız GENİŞLİK geri yükleniyor, "açık mıydı" DEĞİL. Shopify paneli açık
     bırakıyor ama bizde Parla üst bardaki bir düğme — her sayfa açılışında kendiliğinden
     açılması istenmeyen bir davranış (Mehmet onaylamadı). Açıklık istenirse buraya
     `open` de eklenir, saklama biçimi zaten hazır. */
  useEffect(() => {
    try {
      const ham = localStorage.getItem(PARLA_DEPO);
      if (!ham) return;
      const v = JSON.parse(ham) as { size?: number };
      if (typeof v.size === "number" && Number.isFinite(v.size)) {
        setGenislik(Math.min(PARLA_MAX_W, Math.max(PARLA_MIN_W, Math.round(v.size))));
      }
    } catch {
      /* bozuk/dolu depo → varsayılan genişlikle devam, kullanıcıya yansımasın */
    }
  }, []);

  /* Genişliği hem CSS'e (kutu + içeriğin kayması aynı değişkenden okur) hem depoya yaz. */
  useEffect(() => {
    document.body.style.setProperty("--parla-w", `${genislik}px`);
    try {
      localStorage.setItem(PARLA_DEPO, JSON.stringify({ size: genislik }));
    } catch {
      /* depo doluysa görsel davranış bozulmasın — sadece hatırlanmaz */
    }
  }, [genislik]);

  /* Genişletilmiş mod: içerik itilmesin diye body'ye de işaretlenir (CSS: `body.parla-genis`). */
  useEffect(() => {
    document.body.classList.toggle("parla-genis", open && genis);
    return () => document.body.classList.remove("parla-genis");
  }, [open, genis]);

  /* Panel kapanınca genişletilmiş mod sıfırlansın — tekrar açılınca kullanıcı
     beklemediği hâlde tüm ekranı kaplayan bir panelle karşılaşmasın. */
  useEffect(() => {
    if (!open) setGenis(false);
  }, [open]);

  /* ─── Sol menü genişliği → `--parla-nav-w` ───
     "Genişlet" panelin `100vw - sol menü` olmasını istiyor (Shopify: 1973 → 1733).
     Menü daraltılabildiği için (248 ↔ 74) değer SABİT YAZILAMAZ; menüyü ölçüp yazıyoruz.
     ⚠️ Telefonda menü çekmece (akışta yer kaplamıyor) → orada 0 yazılır, panel zaten
     tam ekran olduğu için etkisi yok. */
  /* ⚠️ MENÜ SONRADAN GELİYOR (01.08 — canlıda ölçüldü: menü daraltılınca genişlet 174px
     şaşıyordu). Sol menü `layout.tsx`te Suspense içinde AKIŞLA geliyor; Parla üst barda
     ondan ÖNCE bağlanıyor. İlk hâlde `querySelector` boş dönüp `return` ediyor, bir daha
     da denemiyordu → değişken 248'de donuyordu. Artık menü belirene kadar DOM izleniyor. */
  useEffect(() => {
    let gozlemci: ResizeObserver | null = null;
    /* ⚠️ GENİŞLİK DEĞİL, SAĞ KENAR (01.08 canlı ölçüm: genişletilmiş panel menünün
       üstüne tam 12px biniyordu). Sol menü yüzen kart → soldan 12px boşluk var:
       genişliği 248 ama sağ kenarı 260. Panel `100vw - değişken` kadar olduğu için
       genişlik yazılınca sol kenarı 248'e geliyor, yani menünün 12px üstüne. Sağ kenar
       yazılınca tam menünün bittiği yerden başlıyor (daraltılmışken de: 74 → 86). */
    /* ⚠️ MENÜ HAREKET EDERKEN PANELİN KENDİ GEÇİŞİ KAPANIR (Mehmet, 01.08: "sol menüyü
       daraltıp genişletmek istediğinde uyumsuz bir görüntü meydana çıkıyor, eşzamanlı
       değiller"). Sebep ÇİFT ANİMASYON: menü genişliğini 0.26s'de değiştiriyor; bu
       gözlemci her karede yeni sağ kenarı yazıyor; panel ise o değere kendi 0.25s'lik
       geçişiyle gitmeye çalışıyor → HAREKETLİ BİR HEDEFİ KOVALIYOR ve hep geride kalıyor.
       Çözüm: menü hareket ettiği sürece panelin geçişini kapat → panel her karede
       menünün o anki kenarına BİREBİR oturur, ikisi tek parça gibi hareket eder.
       Sınıf, son ölçümden 320ms sonra kalkar (menü geçişi 260ms; pay bırakıldı) —
       böylece düğmeyle genişlet/daralt gibi normal hareketler yine yumuşak kalır. */
    /* ⚠️ DARALTMA DÜĞMESİ DE HESABA KATILIR (Mehmet, 01.08: "tam ekranda sol panelin
       daraltma büyültme çubuğuna denk geliyor, oysa arada biraz boşluk bırakmıştık").
       `.sidebar-toggle` menünün SAĞ KENARINDAN 14px DIŞARI taşıyor (`right: -14px`,
       genişlik 28 → yarısı dışarıda duran yuvarlak düğme). Yalnız menünün kenarı
       ölçülünce panel 260+12 = 272'ye geliyor, düğmenin sağ kenarı ise 274 → panel
       düğmenin ÜSTÜNE biniyordu. Artık ikisinin de sağ kenarı alınıp BÜYÜĞÜ kullanılıyor,
       12px boşluk düğmeden sonra başlıyor. Düğme yoksa (telefon) ölçü menüden gelir. */
    const yaz = (menu: Element) => {
      let sagKenar = menu.getBoundingClientRect().right;
      const dugme = menu.querySelector(".sidebar-toggle");
      if (dugme) sagKenar = Math.max(sagKenar, dugme.getBoundingClientRect().right);
      document.body.style.setProperty("--parla-nav-w", `${Math.round(sagKenar)}px`);
      document.body.classList.add("parla-nav-oynuyor");
      if (navZaman.current) clearTimeout(navZaman.current);
      navZaman.current = setTimeout(() => {
        document.body.classList.remove("parla-nav-oynuyor");
        navZaman.current = null;
      }, 320);
    };
    const bagla = () => {
      const menu = document.querySelector(".panel-sidebar");
      if (!menu) return false;
      yaz(menu);
      gozlemci = new ResizeObserver(() => yaz(menu));
      gozlemci.observe(menu);
      return true;
    };
    /* ⚠️ Sökülürken bekleyen zamanlayıcı İPTAL + sınıf TEMİZLENİR: yoksa `parla-nav-oynuyor`
       body'de asılı kalır ve panelin geçişi kalıcı olarak kapalı kalırdı. */
    const temizle = () => {
      if (navZaman.current) { clearTimeout(navZaman.current); navZaman.current = null; }
      document.body.classList.remove("parla-nav-oynuyor");
    };
    if (bagla()) return () => { gozlemci?.disconnect(); temizle(); };
    // Henüz yok → gelene kadar izle, gelince bağlan ve izlemeyi bırak.
    const dom = new MutationObserver(() => { if (bagla()) dom.disconnect(); });
    dom.observe(document.body, { childList: true, subtree: true });
    return () => { dom.disconnect(); gozlemci?.disconnect(); temizle(); };
  }, []);

  /* ─── AÇILIŞ / KAPANIŞ ANİMASYONU ───
     ⚠️ KUTU İLK AÇILIŞTAN SONRA DOM'DA KALIR — sökülmez.
     NEYDİ (01.08 canlı ölçüm): kapanış HİÇ animasyon oynatmıyordu. Panel sol kenarı
     1200'den 1608'e 10ms'de ZIPLIYOR, sonra görünmez hâlde 250ms bekleyip söküleyordu
     (`getAnimations()` boş). Açılış ise 16 karede 265ms sürüyordu — yani tek yönlü.
     NEDEN: kutu `open || kapaniyor` koşuluyla çiziliyordu. `open` false olduğu RENDER'da
     `kapaniyor` hâlâ false (o değeri effect SONRADAN veriyor) → kutu bir kare SÖKÜLÜYOR,
     effect çalışınca KAPALI konumda yeniden takılıyordu. Tarayıcının animasyon için
     "önceki konum"u kalmıyor → geçiş hiç başlamıyor. Ölçüm bunu birebir gördü: öğe
     t=65'te bir kare `null`, hemen ardından doğrudan kapalı transform'la geri geliyor.
     ÇÖZÜM (Shopify'ın yaptığı): kutu bir kez açıldıktan sonra hiç sökülmez, yalnız
     `kapali` sınıfıyla sağa kaydırılır. Kapalıyken `pointer-events: none` + `inert`
     olduğu için ne tıklanır ne de klavyeyle içine girilir. */
  useEffect(() => {
    if (open) setHicAcildi(true);
  }, [open]);

  /* Açılışta içeri kayma: kutu önce "kapalı" konumda takılır, BİR SONRAKİ karede sınıf
     kalkar → geçiş tetiklenir. Aynı karede takılıp bırakılırsa animasyon oynamaz.
     ⚠️ `hicAcildi` de bağımlılık: ilk açılışta kutu bu değer true olana kadar DOM'da
     yok. Yalnız `open`e baksaydık rAF kutu takılmadan çalışır, ilk açılış animasyonsuz
     olurdu (sonrakiler doğru çalışırdı — yakalanması zor bir fark). */
  useEffect(() => {
    if (!open || !hicAcildi) { setGirdi(false); return; }
    const r = requestAnimationFrame(() => setGirdi(true));
    return () => cancelAnimationFrame(r);
  }, [open, hicAcildi]);

  /* ─── Sol kenardan sürükleyerek boyutlandırma ───
     Shopify'da ölçüldü: 300–600 arası, kademe yok (1px), içerik sürükleme SIRASINDA
     anlık takip ediyor (bırakınca değil). `pointer` olayları kullanılıyor → fare,
     kalem ve dokunmatik tek kodla çalışır; `setPointerCapture` sayesinde imleç panelin
     dışına çıksa bile sürükleme kopmaz. */
  /* ⚠️ DİNLEYİCİLER PENCEREDE, tutamakta DEĞİL (01.08 — canlıda ölçüldü, ilk hâli HİÇ
     çalışmadı). Önce tutamağın kendi `onPointerMove`u + `setPointerCapture` kullanılmıştı:
     `pointerdown` çalışıyordu (`body.parla-dragging` ekleniyordu) ama hareket hiç gelmiyor,
     sınıf da üstte kalıyordu. Tutamak 8px — imleç ilk karede dışına çıkıyor ve olay
     yakalama React'in kök dinleyicisiyle güvenilir kurulmuyor.
     Pencereye bağlanınca imleç NEREYE giderse gitsin hareket gelir; bırakma da garanti. */
  const surukleBasla = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = genislik;
    document.body.classList.add("parla-dragging");

    const hareket = (ev: PointerEvent) => {
      // Panel SAĞDA: imleç sola gidince (fark negatif) panel GENİŞLER → işaret ters.
      const hedef = w0 - (ev.clientX - x0);
      setGenislik(Math.min(PARLA_MAX_W, Math.max(PARLA_MIN_W, Math.round(hedef))));
    };
    const bitir = () => {
      document.body.classList.remove("parla-dragging");
      window.removeEventListener("pointermove", hareket);
      window.removeEventListener("pointerup", bitir);
      window.removeEventListener("pointercancel", bitir);
      surukleBirak.current = null;
    };
    window.addEventListener("pointermove", hareket);
    window.addEventListener("pointerup", bitir);
    window.addEventListener("pointercancel", bitir);
    surukleBirak.current = bitir; // sürükleme ortasında bileşen sökülürse temizlensin
  }, [genislik]);

  useEffect(() => () => { surukleBirak.current?.(); }, []);

  /* Klavyeyle boyutlandırma (tutamak odaktayken ok tuşları) — fare kullanamayan
     kullanıcı da genişliği değiştirebilsin. Shopify'da yok, erişilebilirlik için eklendi. */
  const surukleTus = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    const adim = e.shiftKey ? 40 : 10;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setGenislik((w) => Math.min(PARLA_MAX_W, w + adim));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setGenislik((w) => Math.max(PARLA_MIN_W, w - adim));
    }
  }, []);

  /* Biçimlendirme çözümü mesaj listesi değişince yapılır — her tuş vuruşunda değil
     (input state'i de bu bileşende; memo olmasa 50 mesaj her harfte yeniden ayrıştırılırdı). */
  const blocksById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof parseBlocks>>();
    for (const m of msgs) {
      if (m.role === "assistant") map.set(m.id, parseBlocks(m.content));
    }
    return map;
  }, [msgs]);

  /** Snap'in çapası: en son kullanıcı mesajı (cevap onun altına yazılır). */
  const anchorId = useMemo(() => {
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === "user") return msgs[i].id;
    return null;
  }, [msgs]);

  /* Daktilo saati — her adımda bir kelime açar. Hız mobil ile aynı: toplam ~2.4 sn
     hedefi kelime sayısına bölünür, 9-34 ms arasına sıkıştırılır (kısa cevap fazla
     yavaş, uzun cevap fazla hızlı olmasın). Metin akarken toplam büyüdüğü için her
     adımda yeniden hesaplanır. */
  useEffect(() => {
    if (!daktilo) return;
    const blocks = blocksById.get(daktilo.id);
    const toplam = blocks ? countWords(blocks) : 0;

    if (daktilo.n >= toplam) {
      // Akış kapandıysa iş bitti → mesaj normal (tam) çizime döner, tur da kapanır.
      // Kuyrukta hatırlatma varsa tur AÇIK kalır (o da aynı turun parçası, yeri hesaplansın).
      if (!daktilo.acik) { setDaktilo(null); if (!hatirlatma) turAcikRef.current = false; }
      return; // akış sürüyorsa yeni kelimeleri bekle
    }

    const aralik = Math.max(
      DAKTILO_MIN_MS,
      Math.min(DAKTILO_MAX_MS, Math.round(DAKTILO_HEDEF_MS / Math.max(1, toplam))),
    );
    const t = setTimeout(() => {
      setDaktilo((d) => (d && d.id === daktilo.id ? { ...d, n: d.n + 1 } : d));
      // Kaydırma YOK — yazı, snap'in açtığı boşluğa doğru büyür (yukarıdaki not).
    }, aralik);
    return () => clearTimeout(t);
  }, [daktilo, blocksById, hatirlatma]);

  /* Kuyruktaki hatırlatma, asıl cevabın yazması BİTİNCE yazılır (araya girip cevabı
     bölmesin). Kendisi de daktiloyla yazılır — her cevap aynı dilde.
     ⚠️ Bu mesaj sunucuda saklanmaz (taslak da istemcide): sayfa yenilenirse hatırlatma
     ve çipler birlikte gider — ikisi zaten aynı geçici duruma ait. */
  useEffect(() => {
    if (!hatirlatma || daktilo || loading) return;
    const id = yeniId("a");
    setMsgs((m) => [...m, { id, role: "assistant", content: hatirlatma }]);
    setDaktilo({ id, n: 0, acik: false });
    setHatirlatma(null);
  }, [hatirlatma, daktilo, loading]);

  /* Escape ile kapat.
     ⚠️ SÜRÜKLEME SÜRÜYORSA ÖNCE ONU İPTAL EDER, paneli KAPATMAZ (01.08 canlı ölçümde
     yakalandı): sürükleme ortasında Escape'e basılınca panel kapanıyor, ama sürükleme
     temizliği hiç çalışmadığı için `body.parla-dragging` sınıfı DOM'da panel yokken
     asılı kalıyordu (yalnız bir sonraki fare bırakması siliyordu). Ayrıca kapanmak
     sezgisel de değildi — sürüklerken Escape "bu işlemi bırak" demektir. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (surukleBirak.current) { surukleBirak.current(); return; }
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* ─── YAZI ALANI KENDİLİĞİNDEN BÜYÜR ───
     ⚠️ Bu kod HİÇ YAZILMAMIŞTI (01.08 canlı ölçümde çıktı): CSS'te niyet var
     (`max-height: 120px`, `min-height: 34px`) ama yüksekliği ayarlayan taraf yoktu →
     kutu 0, 124 ve 311 karakterde de 34px'te sabit kalıyordu; içerik `scrollHeight`
     34 → 45 → 85'e çıkarken kullanıcı 1,5 satırlık bir yarıktan, kendi yazdığını
     kaydırarak yazıyordu.
     Yöntem: önce `auto` (küçülme de çalışsın diye — yoksa silince yükseklik takılı
     kalır), sonra içeriğin gerçek yüksekliği. Üst sınırı CSS'teki `max-height` koyar,
     ondan sonrası kutunun içinde kayar. `useLayoutEffect`: boyama ÖNCESİ ayarlanır,
     yoksa her tuşta bir kare zıplama görünür. */
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  /* ─── KLAVYE ODAĞI ───
     Canlı ölçümde üç eksik çıktı: (1) panel açılınca odak içeri girmiyordu (`body`de
     kalıyordu), (2) odak panele HAPSOLMUYOR — Tab ile arkadaki sol menüye çıkılıyordu,
     (3) kapanınca odak Parla düğmesine dönmüyordu. En kötüsü ≤767px'te: orada panel tam
     ekran, yani klavye kullanıcısı GÖREMEDİĞİ içeriğin arasında dolaşıyordu.
     Şimdi: açılınca ilk odaklanabilir öğeye geçilir, Tab panelin içinde döner, kapanınca
     odak paneli açan düğmeye geri verilir. */
  const acanDugme = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !hicAcildi) return;
    const kutu = panelRef.current;
    if (!kutu) return;
    const SEC = 'button:not([disabled]), textarea, input:not([type="hidden"]), a[href], [tabindex]:not([tabindex="-1"])';
    // Açılışta odağı içeri al (kutunun kendisi değil, ilk gerçek öğe).
    const ilkler = kutu.querySelectorAll<HTMLElement>(SEC);
    ilkler[0]?.focus();

    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = Array.from(kutu.querySelectorAll<HTMLElement>(SEC)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (list.length === 0) return;
      const ilk = list[0];
      const son = list[list.length - 1];
      const simdi = document.activeElement as HTMLElement | null;
      // Panelin dışına düştüyse geri çek; uçlarda halkayı kapat.
      if (!simdi || !kutu.contains(simdi)) { e.preventDefault(); (e.shiftKey ? son : ilk).focus(); return; }
      if (e.shiftKey && simdi === ilk) { e.preventDefault(); son.focus(); }
      else if (!e.shiftKey && simdi === son) { e.preventDefault(); ilk.focus(); }
    };
    window.addEventListener("keydown", onTab);
    return () => {
      window.removeEventListener("keydown", onTab);
      // Kapanışta odağı paneli açan düğmeye geri ver (odak boşlukta kalmasın).
      acanDugme.current?.focus();
    };
  }, [open, hicAcildi]);

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // aynı dosya tekrar seçilebilsin
    if (!file) return;
    try {
      const { base64, preview } = await fileToCompressedBase64(file);
      setAttached({ base64, preview, name: file.name });
      inputRef.current?.focus();
    } catch {
      setMsgs((m) => [...m, { id: yeniId("e"), role: "assistant", content: "⚠️ Dosya okunamadı. JPG veya PNG dene." }]);
    }
  }

  /* Sohbeti temizle — mobildeki ⋯ > "Sohbeti Sil" ile AYNI iş (aynı tablo, aynı profil).
     ⚠️ Sohbet ORTAK: burada temizlenince telefondaki geçmiş de gider. Onay metninde söylüyoruz.
     ⚠️ `.select()` şart: PostgREST'te RLS 0 satır etkilese bile DELETE hata dönmez → sessiz
     "temizlendi" yalanı olmasın (bildirim çanında öğrenilen ders). */
  async function temizle() {
    if (!profileId || loading || !msgs.length) return;
    const ok = await confirmDialog({
      title: "Sohbet temizlensin mi?",
      message: "Parla ile yaptığın tüm yazışma silinir ve geri alınamaz. Telefondaki sohbet de temizlenir. Kaydettiğin gelir/giderler SİLİNMEZ.",
      confirmLabel: "Temizle",
      danger: true,
    });
    if (!ok) return;

    const yedek = msgs;
    setMsgs([]);
    setDaktilo(null); // yazılmakta olan cevap varsa onunla birlikte gitsin
    turAcikRef.current = false;
    setBosluk(0); // askıda kalan snap boşluğu boş sohbette dev boşluk gibi durmasın
    // Bekleyen kategori sorusu da düşer — ait olduğu mesaj artık yok (mobil ile aynı)
    setBekleyen(null);
    setYeniKategori(null);
    setHatirlatma(null); // kuyruktaki hatırlatma boş sohbete düşmesin
    hatirlatilanRef.current = null;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", profileId)
      .select("id");

    if (error || !data || data.length === 0) {
      setMsgs(yedek); // geri al ve söyle
      showToast({
        title: "Temizlenemedi",
        message: error?.message ?? "Kayıtlara erişilemedi (yetki).",
        variant: "error",
      });
      return;
    }
    showToast({ title: "Sohbet temizlendi", variant: "success" });
  }

  /** Çipe dokunuldu (ya da yeni kategori adı girildi) → işlem ŞİMDİ kaydedilir. */
  async function kategoriSec(secim: { category?: string; label?: string }) {
    if (!bekleyen || loading) return;
    const taslak = bekleyen;
    setBekleyen(null);
    setYeniKategori(null);
    setLoading(true);
    /* Çip onayı da bir gönderim turudur (mobilde de öyle): onay metni daktiloyla yazılır
       ve soruyu doğuran kullanıcı mesajı tepeye oturur. */
    turBaslat();

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Oturum bulunamadı. Sayfayı yenileyip tekrar dene.");

      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          mode: "assistant",
          platform: "web",
          confirm: {
            tx: taslak.tx,
            ...(secim.category ? { category: secim.category } : {}),
            ...(secim.label ? { newCategory: { label: secim.label } } : {}),
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Kaydedemedim, tekrar dener misin?");

      /* Çip onayının cevabı tek parça gelir (yerel katman) → daktiloyu burada başlat,
         yoksa "kaydedildi" mesajı ekrana bir anda basılır (mobilde daktiloyla yazılıyor). */
      const cevapId = yeniId("a");
      setMsgs((m) => [...m, { id: cevapId, role: "assistant", content: data.reply }]);
      setDaktilo({ id: cevapId, n: 0, acik: false });
      if (data.quota) setQuota(data.quota);
      if (data.action && MUTATING_ACTIONS.includes(data.action)) { bildir(data.action); router.refresh(); }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu.";
      setMsgs((m) => [...m, { id: yeniId("e"), role: "assistant", content: `⚠️ ${msg}` }]);
      turAcikRef.current = false; // hata metni daktilosuz basılır → tur burada biter
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function send() {
    const text = input.trim();
    // Görsel varsa metin şart değil (sadece fiş atılabilir).
    if ((!text && !attached) || loading) return;

    const gorsel = attached;
    // Yarım kalmış daktilo varsa tamamlanmış say — eski cevap yazılırken yenisi başlamasın
    setDaktilo(null);
    /* Cevaplanmamış kategori sorusu DÜŞMEZ (25.07 kararı): taslak duruyor, çipler yerinde
       kalıyor; cevap bitince bir kez hatırlatılıyor. İşlem hâlâ kaydedilmiş değil. */
    const bekleyenOnce = bekleyen;
    setYeniKategori(null); // yeni-kategori formu açıksa kapansın (çipler kalır)
    setInput("");
    setAttached(null);
    setMsgs((m) => [...m, {
      id: yeniId("u"),
      role: "user",
      content: gorsel ? (text ? `[Görsel eklendi]\n${text}` : "[Görsel eklendi]") : text,
    }]);
    setLoading(true);
    turBaslat(); // mesaj tepeye otursun, cevap altındaki boşluğa yazılsın

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Oturum bulunamadı. Sayfayı yenileyip tekrar dene.");

      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mode: "assistant",
          message: text,
          platform: "web",
          stream: true, // cevap üretildikçe aksın (bekleyip tek parça alma)
          ...(gorsel ? { image: gorsel.base64, imageMimeType: "image/jpeg" } : {}),
        }),
      });

      if (!res.ok || !res.body) {
        // 429 = günlük hak doldu; sunucu kullanıcıya gösterilecek metni kendisi yolluyor.
        const hata = await res.json().catch(() => ({}));
        throw new Error(hata?.error || "Şu an yanıt veremiyorum, lütfen tekrar dene.");
      }

      /* Sunucu satır başına bir JSON gönderiyor (NDJSON):
           {"t":"delta","v":"..."}  → baloncuğa ekle
           {"t":"done", replace, action, quota}
           {"t":"error","message"}
         Baloncuk İLK parça gelince oluşturulur → "yazıyor" göstergesi o ana kadar durur. */
      const id = yeniId("a");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let basladi = false;
      let birikti = "";
      let yeniSoru = false; // bu cevapta YENİ bir kategori sorusu geldi mi?

      const isle = (satir: string) => {
        if (!satir.trim()) return;
        let e: { t?: string; v?: string; replace?: string | null; action?: string; message?: string;
                pendingCategory?: BekleyenKategori | null;
                quota?: { used: number; limit: number; isPremium: boolean } };
        try { e = JSON.parse(satir); } catch { return; }

        if (e.t === "delta" && typeof e.v === "string") {
          birikti += e.v;
          if (!basladi) {
            basladi = true;
            setLoading(false); // ilk kelime geldi → üç nokta kalksın
            setMsgs((m) => [...m, { id, role: "assistant", content: birikti }]);
            /* Daktilo akışın ÜSTÜNDE çalışır: sunucu tek parça da gönderse (yerel katman
               cevapları) kelime kelime açılır; parça parça gönderirse hız yine sabit kalır. */
            setDaktilo({ id, n: 0, acik: true });
          } else {
            setMsgs((m) => m.map((x) => (x.id === id ? { ...x, content: birikti } : x)));
          }
          // Kaydırma YOK: metin snap boşluğuna doğru büyür (bkz. snapUygula notu).
        } else if (e.t === "done") {
          // Sunucu işlem kaydettiyse son söz onun: ekrandaki metin gerçek sonuçla değişir.
          if (typeof e.replace === "string") {
            birikti = e.replace;
            if (!basladi) {
              basladi = true;
              setLoading(false);
              setMsgs((m) => [...m, { id, role: "assistant", content: birikti }]);
              setDaktilo({ id, n: 0, acik: true });
            } else {
              setMsgs((m) => m.map((x) => (x.id === id ? { ...x, content: birikti } : x)));
            }
          }
          if (e.quota) setQuota(e.quota);
          // Yeni bir kategori sorusu geldiyse ESKİ taslağın yerini alır (tek taslak taşınır)
          if (e.pendingCategory) { setBekleyen(e.pendingCategory); yeniSoru = true; }
          if (e.action && MUTATING_ACTIONS.includes(e.action)) { bildir(e.action); router.refresh(); }
        } else if (e.t === "error") {
          throw new Error(e.message || "Bir hata oluştu.");
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const satirlar = buf.split("\n");
        buf = satirlar.pop() ?? ""; // yarım satır tamponda kalsın
        for (const s of satirlar) isle(s);
      }
      isle(buf);

      // Akış hiç metin getirmediyse kullanıcı boş ekrana bakmasın
      if (!basladi) {
        setMsgs((m) => [...m, { id, role: "assistant", content: "⚠️ Şu an yanıt veremedim, tekrar dener misin?" }]);
        turAcikRef.current = false; // daktilo yok → turu burada kapat
      }

      /* Cevaplanmamış taslak duruyorsa (ve cevap kendi sorusunu getirmediyse) tek kez
         hatırlat. Kuyruğa alınıyor: asıl cevabın daktilosu bitince yazılacak. */
      if (bekleyenOnce && !yeniSoru && hatirlatilanRef.current !== bekleyenOnce) {
        hatirlatilanRef.current = bekleyenOnce;
        setHatirlatma(hatirlatmaMetni(bekleyenOnce));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu.";
      setMsgs((m) => [...m, { id: yeniId("e"), role: "assistant", content: `⚠️ ${msg}` }]);
      turAcikRef.current = false;
    } finally {
      setLoading(false);
      /* Akış kapandı: daktilo kalan kelimeleri yazıp kendi kendine bitirir. Burada
         null'lamak metni ANINDA tamamlar (yazma efekti yarıda kesilirdi). */
      setDaktilo((d) => (d ? { ...d, acik: false } : null));
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter gönderir, Shift+Enter alt satır (sohbet arayüzlerinin standardı).
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const kalan = quota && !quota.isPremium && quota.limit > 0
    ? Math.max(0, quota.limit - quota.used)
    : null;

  return (
    <>
      <button
        type="button"
        ref={acanDugme}
        className={`topbar-icon-btn parla-btn${open ? " on" : ""}`}
        onClick={() => (open ? setOpen(false) : ac())}
        aria-label="Parla — yapay zeka asistanı"
        title="Parla — yapay zeka asistanı"
        aria-expanded={open}
      >
        <Sparkles size={18} />
      </button>

      {mounted && hicAcildi && createPortal(
        <aside
          ref={panelRef}
          className={`parla-drawer${!open || !girdi ? " kapali" : ""}${genis ? " genis" : ""}`}
          role="dialog"
          aria-label="Parla sohbeti"
          /* ⚠️ `aria-hidden` DEĞİL, `inert`: kapat düğmesine basınca odak hâlâ panelin
             İÇİNDE (düğmenin üstünde) kalıyor; odaklı öğeyi `aria-hidden` ile gizlemek
             tarayıcının engellediği bir durum ("Blocked aria-hidden… retained focus"
             uyarısı). `inert` odağı da düzgünce dışarı alır. Panel kapanış animasyonu
             boyunca (250ms) DOM'da durduğu için bu gerekli. */
          inert={!open}
        >
          {/* Sol kenardan sürükleyerek boyutlandırma — görünmez şerit, tek işaret imleç.
              `button` çünkü klavyeyle de odaklanıp ok tuşlarıyla boyutlandırılabiliyor. */}
          <button
            type="button"
            className="parla-resize"
            onPointerDown={surukleBasla}
            onKeyDown={surukleTus}
            aria-label="Paneli yeniden boyutlandır"
            title="Sürükleyerek genişliği değiştir"
          />
          <div className="parla-panel">
          <header className="parla-head">
            <div className="parla-id">
              <span className="parla-ic"><Sparkles size={15} /></span>
              <div>
                <div className="parla-name">Parla</div>
                <div className="parla-sub">
                  {kalan !== null ? `Bugün ${kalan} mesaj hakkın kaldı` : "Yapay zeka finans asistanın"}
                </div>
              </div>
            </div>
            <div className="parla-head-actions">
              {msgs.length > 0 && (
                <button
                  type="button"
                  className="parla-close"
                  onClick={temizle}
                  disabled={loading}
                  aria-label="Sohbeti temizle"
                  title="Sohbeti temizle"
                >
                  <Trash2 size={15} />
                </button>
              )}
              {/* Genişlet/Daralt — Shopify'daki "Genişletin" düğmesinin karşılığı.
                  Panel sol menüye kadar açılır. Dar ekranda (≤1039px) yer olmadığı için
                  gizli: orada panel zaten neredeyse tüm genişliği kaplıyor. */}
              <button
                type="button"
                className="parla-close parla-genislet"
                onClick={() => setGenis((g) => !g)}
                aria-label={genis ? "Daralt" : "Genişlet"}
                title={genis ? "Daralt" : "Genişlet"}
                aria-pressed={genis}
              >
                {genis ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button type="button" className="parla-close" onClick={() => setOpen(false)} aria-label="Kapat">
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="parla-list" ref={listRef}>
            {booting && <div className="parla-yukleniyor">Sohbet yükleniyor…</div>}

            {!booting && msgs.length === 0 && (
              <div className="parla-empty">
                <span className="parla-empty-ic"><Sparkles size={20} /></span>
                <div className="parla-empty-title">Merhaba, ben Parla</div>
                <div className="parla-empty-sub">
                  Harcamalarını sorabilir, doğrudan işlem ekletebilirsin.
                </div>
                <div className="parla-hints">
                  {["500 tl market", "bu ay ne kadar harcadım", "geçen ay özetim"].map((h) => (
                    <button key={h} type="button" className="parla-hint" onClick={() => setInput(h)}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m) => {
              /* "[Görsel eklendi]" işareti mobil ile ORTAK: görselin kendisi saklanmıyor,
                 baloncukta rozet olarak gösteriliyor (iki tarafta da aynı görünsün). */
              const gorselli = m.content.startsWith("[Görsel eklendi]");
              const metin = gorselli
                ? m.content.replace(/^\[Görsel eklendi\]\n?/, "")
                : m.content;
              const blocks = blocksById.get(m.id);
              return (
                <div
                  key={m.id}
                  className={`parla-msg ${m.role}`}
                  ref={m.id === anchorId ? anchorRef : undefined}
                >
                  {gorselli && (
                    <span className="parla-img-tag"><ImageIcon size={12} /> Görsel</span>
                  )}
                  {blocks
                    ? <RichText blocks={blocks} reveal={daktilo?.id === m.id ? daktilo.n : null} />
                    : metin}
                </div>
              );
            })}

            {loading && (
              <div className="parla-msg assistant typing" aria-live="polite">
                <span /><span /><span />
              </div>
            )}

            {/* Snap boşluğu — cevap yazıldıkça küçülür, içerik yüksekliği sabit kalır. */}
            {bosluk > 0 && (
              <div ref={boslukRef} aria-hidden style={{ height: bosluk, flexShrink: 0 }} />
            )}
          </div>

          <div className="parla-composer-alan"><div className="parla-composer">
            {/* KATEGORİ SORUSU — yazma alanının üstünde, aynı kutunun içinde.
                İşlem henüz kaydedilmedi; çipe dokununca kaydediliyor. */}
            {bekleyen && (
              <div className="parla-kat">
                {yeniKategori === null ? (
                  /* Tek satır, YANA kayar (alta sarmaz) — uzun liste ekranı şişirmesin.
                     Kaydırma: tekerlek + fareyle sürükleme (yukarıdaki nota bak). */
                  <div
                    className="parla-kat-cipler"
                    ref={ciplerRef}
                    onPointerDown={rayPointerDown}
                    onPointerMove={rayPointerMove}
                    onPointerUp={() => { if (surukle.current && !surukle.current.tasindi) surukle.current = null; }}
                    onPointerLeave={() => { if (surukle.current && !surukle.current.tasindi) surukle.current = null; }}
                    onClickCapture={rayClickCapture}
                  >
                    {bekleyen.options.map((o) => (
                      <button
                        key={o.slug}
                        type="button"
                        className="parla-kat-cip"
                        onClick={() => kategoriSec({ category: o.slug })}
                        disabled={loading}
                      >
                        {o.color && <span className="parla-kat-nokta" style={{ background: o.color }} />}
                        {o.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="parla-kat-cip yeni"
                      onClick={() => setYeniKategori("")}
                      disabled={loading}
                      aria-label="Yeni kategori oluştur"
                      title="Yeni kategori oluştur"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="parla-kat-yeni">
                    <input
                      className="parla-kat-input"
                      value={yeniKategori}
                      onChange={(e) => setYeniKategori(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); if (yeniKategori.trim()) kategoriSec({ label: yeniKategori.trim() }); }
                        if (e.key === "Escape") setYeniKategori(null);
                      }}
                      placeholder="Yeni kategori adı"
                      maxLength={40}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="parla-kat-ok"
                      onClick={() => yeniKategori.trim() && kategoriSec({ label: yeniKategori.trim() })}
                      disabled={loading || !yeniKategori.trim()}
                      aria-label="Oluştur ve kaydet"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      className="parla-kat-vazgec"
                      onClick={() => setYeniKategori(null)}
                      aria-label="Vazgeç"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {attached && (
              <div className="parla-attach">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attached.preview} alt="" className="parla-attach-thumb" />
                <span className="parla-attach-name">{attached.name}</span>
                <button
                  type="button"
                  className="parla-attach-x"
                  onClick={() => setAttached(null)}
                  aria-label="Görseli kaldır"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Tek kutu: yazı alanı üstte, düğmeler altta (Mehmet'in ilettiği örnek düzen) */}
            <textarea
              ref={inputRef}
              className="parla-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={attached ? "İstersen not ekle…" : "Bir şey sor ya da işlem yaz…"}
              rows={1}
              disabled={loading}
            />
            <div className="parla-composer-alt">
              <input ref={fileRef} type="file" accept={ACCEPT} onChange={onFilePicked} hidden />
              <button
                type="button"
                className="parla-plus"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                aria-label="Fiş, fatura veya dekont yükle"
                title="Fiş, fatura veya dekont yükle"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                className="parla-send"
                onClick={send}
                disabled={loading || (!input.trim() && !attached)}
                aria-label="Gönder"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
          </div>
          </div>
        </aside>,
        document.body,
      )}
    </>
  );
}
