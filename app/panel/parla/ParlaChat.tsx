"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Sparkles, X, ArrowUp } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";

/* ═══════════════════════════════════════════════════════════════════════════
   PARLA — panel içi AI asistanı (sağdan açılan yan panel)

   NEDEN YAN PANEL (baloncuk değil): Parla yalnız cevap vermiyor, İŞLEM DE EKLİYOR.
   Sektör araştırması (docs/AI-ORTAK-BEYIN-PLANI.md): köşedeki yüzen baloncuk kullanıcıya
   "destek botu, bir şey yapmaz" hissi veriyor; yan panel "yardımcı/copilot" konumu veriyor.
   Ayrıca panel arkada görünür kalıyor → eklenen işlem listede anında görülebiliyor.

   BEYİN BURADA DEĞİL: bu dosya yalnız ekran. Kurallar, kullanıcı verisi, işlem ekleme/silme
   ve sohbet kaydı SUNUCUDA (`ai-chat` edge function, mode: "assistant"). Mobil de aynı
   sunucuya bağlanacak (Faz 4) → tek beyin.
   ═══════════════════════════════════════════════════════════════════════════ */

type Msg = { id: string; role: "user" | "assistant"; content: string };

const FN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`;

/** Sunucu bir şey değiştirdiyse panel verisi bayat kalmasın (panel kuralı: mutasyon → refresh). */
const MUTATING_ACTIONS = ["transaction_added", "transaction_deleted", "goal_updated"];

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

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setMounted(true), []);

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

  // Escape ile kapat
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMsgs((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: text }]);
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
        body: JSON.stringify({ mode: "assistant", message: text, platform: "web" }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 429 = günlük hak doldu; sunucu kullanıcıya gösterilecek metni kendisi yolluyor.
        throw new Error(data?.error || "Şu an yanıt veremiyorum, lütfen tekrar dene.");
      }

      setMsgs((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: data.reply }]);
      if (data.quota) setQuota(data.quota);

      // İşlem eklendi/silindi ise açık sayfanın verisi bayat kalmasın.
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
        onClick={() => setOpen((o) => !o)}
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
            <button type="button" className="parla-close" onClick={() => setOpen(false)} aria-label="Kapat">
              <X size={16} />
            </button>
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

            {msgs.map((m) => (
              <div key={m.id} className={`parla-msg ${m.role}`}>
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="parla-msg assistant typing" aria-live="polite">
                <span /><span /><span />
              </div>
            )}
          </div>

          <div className="parla-composer">
            <textarea
              ref={inputRef}
              className="parla-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Bir şey sor ya da işlem yaz…"
              rows={1}
              disabled={loading}
            />
            <button
              type="button"
              className="parla-send"
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Gönder"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </aside>,
        document.body,
      )}
    </>
  );
}
