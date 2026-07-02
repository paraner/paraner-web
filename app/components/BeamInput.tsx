"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Hover.dev "Beam Input" — kenarında dönen ışık huzmesi (form background'unda iki
// katmanlı conic-gradient; mask YOK — iOS Safari mask'i düşürüp beyaz kama basıyordu,
// bkz. globals.css .beam-input notu). E-posta + "Ücretsiz Başla"
// → /kayit'a yazılan e-postayı taşıyarak yönlendirir (AuthForm prefill eder).
export default function BeamInput() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    // Geçerli e-posta → /kayit'a start=1 ile git: AuthForm otomatik kod gönderip
    // doğrudan "Kodu gir" adımına geçer. Boş/geçersizse normal kayıt formuna düşer.
    if (isValidEmail(v)) {
      router.push(`/kayit?email=${encodeURIComponent(v)}&start=1`);
    } else {
      router.push(v ? `/kayit?email=${encodeURIComponent(v)}` : "/kayit");
    }
  };

  return (
    <form className="beam-input" onSubmit={submit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-posta adresin"
        aria-label="E-posta adresin"
        autoComplete="email"
      />
      <button type="submit" className="beam-btn">
        <span>Ücretsiz Başla</span>
        <svg className="beam-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </form>
  );
}
