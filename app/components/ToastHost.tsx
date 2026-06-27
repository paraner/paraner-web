"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToasts, dismissToast, type ToastItem, type ToastVariant } from "./toast";

// Sonner tarzı bildirim yığını (sağ üst). Toast'lar üst üste binip yığılır; fareyle
// üstüne gelince dikey listeye açılır. Panel layout + auth sayfalarında mount edilir.
const PEEK = 14;      // yığılı haldeyken arkadaki toast'ların görünen payı (px)
const GAP = 14;       // açıldığında toast'lar arası boşluk (px)
const MAX = 3;        // yığılı halde görünür toast sayısı
const FALLBACK_H = 64;

function Icon({ variant }: { variant: ToastVariant }) {
  if (variant === "error") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }
  if (variant === "info") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="8.5 12.5 11 15 15.5 9.5" />
    </svg>
  );
}

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const refs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => subscribeToasts(setItems), []);

  // En yeni en önde (index 0 = üstteki tam görünen kart)
  const ordered = [...items].reverse();

  // Yükseklikleri ölç (açılınca doğru konumlama için)
  useEffect(() => {
    const h: Record<number, number> = {};
    for (const t of ordered) {
      const el = refs.current[t.id];
      if (el) h[t.id] = el.offsetHeight;
    }
    setHeights((prev) => {
      const same = ordered.every((t) => prev[t.id] === h[t.id]);
      return same ? prev : h;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (ordered.length === 0) return null;

  const hOf = (id: number) => heights[id] ?? FALLBACK_H;
  const visible = Math.min(ordered.length, MAX);
  const collapsedH = hOf(ordered[0].id) + (visible - 1) * PEEK;
  const expandedH = ordered.reduce((s, t) => s + hOf(t.id), 0) + (ordered.length - 1) * GAP;

  return (
    <div
      className="toast-host"
      style={{ height: expanded ? expandedH : collapsedH }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {ordered.map((t, i) => {
        const hidden = i >= MAX && !expanded;
        let y = 0;
        if (expanded) {
          for (let j = 0; j < i; j++) y += hOf(ordered[j].id) + GAP;
        } else {
          y = i * PEEK;
        }
        const scale = expanded ? 1 : Math.max(0, 1 - i * 0.05);
        return (
          <div
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            className={`toast toast-${t.variant}`}
            role="status"
            style={{
              transform: `translateY(${y}px) scale(${scale})`,
              opacity: hidden ? 0 : 1,
              zIndex: ordered.length - i,
              pointerEvents: hidden ? "none" : "auto",
            }}
            onClick={() => dismissToast(t.id)}
          >
            <span className="toast-icon"><Icon variant={t.variant} /></span>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.message && <div className="toast-msg">{t.message}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
