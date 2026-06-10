"use client";

import { useEffect } from "react";

// Panelin ortak modalı — overlay + kart + başlık + kapat.
// Tüm ekranlarda aynı; redesign'da SADECE burayı değiştir, hepsi güncellensin.
export default function Modal({
  title,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean; // kaydederken kapatmayı engelle
  children: React.ReactNode;
}) {
  // Esc ile kapat (kaydederken değil)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
