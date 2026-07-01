"use client";

import { useEffect, useReducer, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   JumpProbe — "sayfa geçişi dikey zıplama" TEŞHİS aracı (geçici, debug).

   Neden var: ana sayfa → /giris|/kayit geçişinde SADECE canlıda dikey zıplama
   oluyor (local + headless'te ÜRETİLEMİYOR). Tahminle deploy yerine, canlıda ne
   olduğunu EKRANDA gösterir → Mehmet tek ekran görüntüsü alır, kesin görürüz.

   Neyi yakalar (zaman damgalı, en yeni üstte):
     • NAV   → route değişimi anı (pushState/replaceState/popstate)
     • SCR   → scrollY (pencere kaydırma) + hız
     • VH    → innerHeight / visualViewport yükseklik + offsetTop değişimi (iOS URL bar)
     • DOCH  → document scrollHeight değişimi (5000px→800px çökmesi = clamp zıplaması kanıtı)
     • SHIFT → PerformanceObserver layout-shift (CLS): kayma değeri + kaynak eleman + Δy

   Açma: adres çubuğuna  ?jump=1  (paraner.com/?jump=1) → localStorage'a yazılır,
   client geçişlerinde de kalıcı olur. Kapatma: ?jump=0 .  Root layout'ta mount
   edilir (geçişte unmount olmaz → geçiş anını yakalayabilir).
   ──────────────────────────────────────────────────────────────────────────── */

type Line = { t: number; tag: string; msg: string };

const MAX = 44;

export default function JumpProbe() {
  const [, force] = useReducer((n) => n + 1, 0);
  const linesRef = useRef<Line[]>([]);
  const activeRef = useRef(false);
  const t0Ref = useRef(0);

  useEffect(() => {
    // ── Aktiflik: ?jump=1 → aç (localStorage'a yaz), ?jump=0 → kapat ──
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("jump") === "1") localStorage.setItem("__jumpProbe", "1");
    if (sp.get("jump") === "0") localStorage.removeItem("__jumpProbe");
    if (localStorage.getItem("__jumpProbe") !== "1") return;

    activeRef.current = true;
    t0Ref.current = performance.now();

    const push = (tag: string, msg: string) => {
      const t = Math.round(performance.now() - t0Ref.current);
      linesRef.current = [{ t, tag, msg }, ...linesRef.current].slice(0, MAX);
      force();
    };

    push("INIT", `${location.pathname} · dpr${window.devicePixelRatio}`);

    // ── SCROLL ── (rAF ile coalesce; ani sıçramayı hız olarak göster)
    let lastY = window.scrollY;
    let scrTick = 0;
    const onScroll = () => {
      if (scrTick) return;
      scrTick = requestAnimationFrame(() => {
        scrTick = 0;
        const y = window.scrollY;
        const dy = y - lastY;
        lastY = y;
        if (Math.abs(dy) >= 1) push("SCR", `y=${Math.round(y)} Δ${dy > 0 ? "+" : ""}${Math.round(dy)}`);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // ── VIEWPORT yükseklik (innerHeight + visualViewport = iOS URL bar) ──
    let lastVH = window.innerHeight;
    let lastVVH = window.visualViewport?.height ?? 0;
    let lastVVTop = window.visualViewport?.offsetTop ?? 0;
    const onResize = () => {
      const vh = window.innerHeight;
      const vvh = Math.round(window.visualViewport?.height ?? 0);
      const vvt = Math.round(window.visualViewport?.offsetTop ?? 0);
      if (vh !== lastVH || vvh !== Math.round(lastVVH) || vvt !== Math.round(lastVVTop)) {
        push("VH", `inner=${vh} vv=${vvh} vvTop=${vvt}`);
        lastVH = vh;
        lastVVH = vvh;
        lastVVTop = vvt;
      }
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);

    // ── DOCUMENT yüksekliği + sosyal buton satırı (rAF poll; çökme/büyümeyi yakala) ──
    let lastDocH = document.documentElement.scrollHeight;
    let lastSocialH = 0; // .social-auth satır yüksekliği (GIS async gelince değişirse = zıplama)
    let rafPoll = 0;
    const poll = () => {
      rafPoll = requestAnimationFrame(poll);
      const dh = document.documentElement.scrollHeight;
      if (Math.abs(dh - lastDocH) >= 4) {
        push("DOCH", `${lastDocH} → ${dh} (Δ${dh - lastDocH})`);
        lastDocH = dh;
      }
      const social = document.querySelector(".social-auth") as HTMLElement | null;
      const sh = social ? Math.round(social.getBoundingClientRect().height) : 0;
      if (sh !== lastSocialH) {
        push("SOCIAL", `row h ${lastSocialH} → ${sh}`);
        lastSocialH = sh;
      }
    };
    rafPoll = requestAnimationFrame(poll);

    // ── NAV (history) ──
    const logNav = (how: string) => push("NAV", `${how} → ${location.pathname}`);
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = function (...args: Parameters<typeof origPush>) {
      const r = origPush(...args);
      logNav("push");
      return r;
    };
    history.replaceState = function (...args: Parameters<typeof origReplace>) {
      const r = origReplace(...args);
      logNav("replace");
      return r;
    };
    const onPop = () => logNav("pop");
    window.addEventListener("popstate", onPop);

    // ── LAYOUT SHIFT (CLS) — asıl "zıplama" kanıtı ──
    let po: PerformanceObserver | undefined;
    try {
      po = new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
          sources?: { node?: Node; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[];
        })[]) {
          if (e.value < 0.001) continue;
          const s = e.sources?.[0];
          let who = "?";
          let dy = 0;
          if (s) {
            dy = Math.round(s.currentRect.top - s.previousRect.top);
            const n = s.node as Element | undefined;
            if (n && n.nodeType === 1) {
              const cls = typeof n.className === "string" ? n.className.split(/\s+/).slice(0, 2).join(".") : "";
              who = `${n.tagName.toLowerCase()}${n.id ? "#" + n.id : ""}${cls ? "." + cls : ""}`;
            } else if (n) {
              who = n.nodeName;
            }
          }
          push("SHIFT", `${e.value.toFixed(3)} Δy${dy > 0 ? "+" : ""}${dy} ${who}`);
        }
      });
      po.observe({ type: "layout-shift", buffered: true });
    } catch {
      /* tarayıcı desteklemiyorsa sessizce geç */
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
      window.removeEventListener("popstate", onPop);
      cancelAnimationFrame(scrTick);
      cancelAnimationFrame(rafPoll);
      history.pushState = origPush;
      history.replaceState = origReplace;
      po?.disconnect();
    };
  }, []);

  if (!activeRef.current) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 6,
        left: 6,
        zIndex: 2147483647,
        maxWidth: "min(94vw, 460px)",
        maxHeight: "68vh",
        overflow: "hidden",
        pointerEvents: "none",
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 10.5,
        lineHeight: 1.35,
        color: "#9dff9d",
        background: "rgba(0,0,0,0.82)",
        border: "1px solid #2f5f2f",
        borderRadius: 6,
        padding: "6px 8px",
        whiteSpace: "pre",
      }}
    >
      {linesRef.current
        .map((l) => `${String(l.t).padStart(5)}  ${l.tag.padEnd(5)} ${l.msg}`)
        .join("\n")}
    </div>
  );
}
