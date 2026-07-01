"use client";

import type { CSSProperties } from "react";

// Modal birincil "Kaydet / Güncelle" butonu (uiverse dark-glossy → TİTANYUM aksan).
// Harf-harf shimmer + kıvılcım ikonu + hover/aktif titanyum parıltı.
// busy=true iken (kaydediliyor) sürekli parıltı + ikon hızlı flicker.
// Stil: globals.css → .sb / .sb-*
export default function SaveButton({
  children,
  busy = false,
  disabled,
  type = "submit",
  onClick,
  className = "",
  style,
}: {
  children: string;
  busy?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type={type}
      className={`sb${busy ? " is-busy" : ""}${className ? " " + className : ""}`}
      disabled={disabled}
      onClick={onClick}
      style={style}
      aria-busy={busy || undefined}
    >
      <svg className="sb-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
        />
      </svg>
      <span className="sb-txt" key={children}>
        {[...children].map((ch, i) => (
          <span className="sb-letter" key={i}>
            {ch === " " ? " " : ch}
          </span>
        ))}
      </span>
    </button>
  );
}
