"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Hover.dev "Beam Input" — kenarında dönen ışık huzmesi (conic-gradient + CSS mask,
// saf CSS @property açısıyla; framer-motion'a gerek yok). E-posta + "Ücretsiz Başla"
// → /kayit'a yazılan e-postayı taşıyarak yönlendirir (AuthForm prefill eder).
export default function BeamInput() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    router.push(v ? `/kayit?email=${encodeURIComponent(v)}` : "/kayit");
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
      <div className="beam-border" aria-hidden="true">
        <div className="beam-ring" />
      </div>
    </form>
  );
}
