"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Sparkles, X, ArrowUp, Plus, ImageIcon, Trash2, Check } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";
import { announceRightPanel, useCloseOnOtherRightPanel } from "../../../lib/rightPanel";
import RichText, { parseBlocks } from "./RichText";
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

/** Sunucu bir şey değiştirdiyse panel verisi bayat kalmasın (panel kuralı: mutasyon → refresh). */
const MUTATING_ACTIONS = ["transaction_added", "transaction_deleted", "goal_updated"];

/* Belge (fiş/fatura/dekont) yükleme — sunucunun kabul ettiği türler (edge ALLOWED_IMAGE_MIME).
   ⚠️ PDF sunucuda desteklenmiyor; kullanıcıya seçtirip sonra reddetmemek için listede yok. */
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


  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  /* Geçmiş SADECE panel ilk açıldığında yüklenir — her sayfa yüklemesinde sorgu atmayalım.
     Sohbet `chat_messages` tablosunda ve PROFİL bazlı → telefonda başlayan konuşma burada
     kaldığı yerden devam eder. */
  useEffect(() => {
    if (!open || loaded) return;
    let alive = true;
    (async () => {
      setBooting(true);
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_active", true)
        .maybeSingle();

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

  /* Sayfa içeriğini sola kaydır (işlem detayı çekmecesiyle aynı davranış).
     Kabuk (`app/panel/layout.tsx`) sunucu bileşeni → prop yerine body sınıfı: hiçbir sayfanın
     kodu değişmez, sonradan eklenen sayfalar da kendiliğinden uyar. CSS: `body.parla-open`. */
  useEffect(() => {
    document.body.classList.toggle("parla-open", open);
    return () => document.body.classList.remove("parla-open");
  }, [open]);

  /* Biçimlendirme çözümü mesaj listesi değişince yapılır — her tuş vuruşunda değil
     (input state'i de bu bileşende; memo olmasa 50 mesaj her harfte yeniden ayrıştırılırdı). */
  const blocksById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof parseBlocks>>();
    for (const m of msgs) {
      if (m.role === "assistant") map.set(m.id, parseBlocks(m.content));
    }
    return map;
  }, [msgs]);

  // Escape ile kapat
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // aynı dosya tekrar seçilebilsin
    if (!file) return;
    try {
      const { base64, preview } = await fileToCompressedBase64(file);
      setAttached({ base64, preview, name: file.name });
      inputRef.current?.focus();
    } catch {
      setMsgs((m) => [...m, { id: `e-${Date.now()}`, role: "assistant", content: "⚠️ Dosya okunamadı. JPG veya PNG dene." }]);
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
    scrollToEnd();

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

      setMsgs((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: data.reply }]);
      if (data.quota) setQuota(data.quota);
      if (data.action && MUTATING_ACTIONS.includes(data.action)) router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu.";
      setMsgs((m) => [...m, { id: `e-${Date.now()}`, role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      scrollToEnd();
      inputRef.current?.focus();
    }
  }

  async function send() {
    const text = input.trim();
    // Görsel varsa metin şart değil (sadece fiş atılabilir).
    if ((!text && !attached) || loading) return;

    const gorsel = attached;
    // Cevaplanmamış kategori sorusu varsa DÜŞER — o taslak kaydedilmez (karar: 24.07)
    setBekleyen(null);
    setYeniKategori(null);
    setInput("");
    setAttached(null);
    setMsgs((m) => [...m, {
      id: `u-${Date.now()}`,
      role: "user",
      content: gorsel ? (text ? `[Görsel eklendi]\n${text}` : "[Görsel eklendi]") : text,
    }]);
    setLoading(true);
    scrollToEnd();

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
      const id = `a-${Date.now()}`;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let basladi = false;
      let birikti = "";

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
          } else {
            setMsgs((m) => m.map((x) => (x.id === id ? { ...x, content: birikti } : x)));
          }
          scrollToEnd();
        } else if (e.t === "done") {
          // Sunucu işlem kaydettiyse son söz onun: ekrandaki metin gerçek sonuçla değişir.
          if (typeof e.replace === "string") {
            birikti = e.replace;
            if (!basladi) {
              basladi = true;
              setLoading(false);
              setMsgs((m) => [...m, { id, role: "assistant", content: birikti }]);
            } else {
              setMsgs((m) => m.map((x) => (x.id === id ? { ...x, content: birikti } : x)));
            }
          }
          if (e.quota) setQuota(e.quota);
          if (e.pendingCategory) setBekleyen(e.pendingCategory);
          if (e.action && MUTATING_ACTIONS.includes(e.action)) router.refresh();
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
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu.";
      setMsgs((m) => [...m, { id: `e-${Date.now()}`, role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      scrollToEnd();
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
        className={`topbar-icon-btn parla-btn${open ? " on" : ""}`}
        onClick={() => (open ? setOpen(false) : ac())}
        aria-label="Parla — yapay zeka asistanı"
        title="Parla — yapay zeka asistanı"
        aria-expanded={open}
      >
        <Sparkles size={18} />
      </button>

      {mounted && open && createPortal(
        <aside className="parla-drawer" role="dialog" aria-label="Parla sohbeti">
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
              <button type="button" className="parla-close" onClick={() => setOpen(false)} aria-label="Kapat">
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="parla-list" ref={listRef}>
            {booting && <div className="parla-empty">Sohbet yükleniyor…</div>}

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
                <div key={m.id} className={`parla-msg ${m.role}`}>
                  {gorselli && (
                    <span className="parla-img-tag"><ImageIcon size={12} /> Görsel</span>
                  )}
                  {blocks
                    ? <RichText blocks={blocks} reveal={null} />
                    : metin}
                </div>
              );
            })}

            {loading && (
              <div className="parla-msg assistant typing" aria-live="polite">
                <span /><span /><span />
              </div>
            )}
          </div>

          <div className="parla-composer-alan"><div className="parla-composer">
            {/* KATEGORİ SORUSU — yazma alanının üstünde, aynı kutunun içinde.
                İşlem henüz kaydedilmedi; çipe dokununca kaydediliyor. */}
            {bekleyen && (
              <div className="parla-kat">
                {yeniKategori === null ? (
                  /* Tek satır, YANA kayar (alta sarmaz) — uzun liste ekranı şişirmesin. */
                  <div className="parla-kat-cipler">
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
        </aside>,
        document.body,
      )}
    </>
  );
}
