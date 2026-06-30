"use client";

import type { ReactNode } from "react";

// Tüm panel modüllerinde ortak "Ekle" butonu (titanyum + sade hover: + kutusu genişler).
// Stil: globals.css → .add-btn / .add-btn-ic
export default function AddButton({
  onClick,
  children,
  disabled,
  type = "button",
}: {
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} className="add-btn" onClick={onClick} disabled={disabled}>
      {children}
      <span className="add-btn-ic" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
    </button>
  );
}
