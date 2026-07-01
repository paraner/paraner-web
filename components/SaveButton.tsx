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
