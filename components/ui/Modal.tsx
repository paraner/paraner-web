"use client";

import { useEffect, useId, useRef } from "react";

// Panelin ortak modalı — overlay + kart + başlık + kapat.
// Tüm ekranlarda aynı; redesign'da SADECE burayı değiştir, hepsi güncellensin.
// Erişilebilirlik: role=dialog + aria-modal + aria-labelledby; açılınca odak modala
// girer (mevcut autoFocus korunur), kapanınca tetikleyen öğeye döner; Tab focus-trap.
export default function Modal({
  title,
  onClose,
  busy = false,
  wide = false,
  children,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean; // kaydederken kapatmayı engelle
  wide?: boolean; // geniş varyant (ör. işlem ekleme — hesap kartları için)
  children: React.ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Esc ile kapat (kaydederken değil) + Tab focus-trap
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const f = card.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  // Odak: açılınca modala girer (autoFocus'lu içerik varsa ona dokunma),
  // kapanınca tetikleyen öğeye geri döner.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    if (card && !card.contains(document.activeElement)) {
      const target =
        card.querySelector<HTMLElement>(
          "input:not([disabled]),select:not([disabled]),textarea:not([disabled])"
        ) ?? card;
      target.focus();
    }
    return () => prev?.focus?.();
  }, []);

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div
        ref={cardRef}
        className={`modal-card${wide ? " modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
