"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

// Google ile giriş (aktif) + Apple ile giriş (pasif placeholder — Apple eklenince
// `appleEnabled` true yapılır, tek satır). Hem giriş hem kayıt sayfasında kullanılır.
export default function SocialAuth({ mode }: { mode: "giris" | "kayit" }) {
  const [loading, setLoading] = useState(false);
  const verb = mode === "kayit" ? "kayıt ol" : "devam et";
  const appleEnabled = false; // Apple ile Giriş eklenince true

  async function handleGoogle() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setLoading(false);
        alert("Google ile bağlanılamadı. Lütfen tekrar dene.");
      }
      // Başarılıysa tarayıcı Google'a yönlenir.
    } catch {
      setLoading(false);
      alert("Bağlantı hatası. İnternetini kontrol et.");
    }
  }

  return (
    <div className="social-auth">
      <button
        type="button"
        className="btn btn-social btn-google"
        onClick={handleGoogle}
        disabled={loading}
      >
        <GoogleIcon />
        {loading ? "Yönlendiriliyor…" : `Google ile ${verb}`}
      </button>

      <button
        type="button"
        className="btn btn-social btn-apple"
        disabled={!appleEnabled}
        title="Apple ile Giriş yakında"
      >
        <AppleIcon />
        Apple ile {verb}
        {!appleEnabled && <span className="soon-tag">YAKINDA</span>}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.63z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <path d="M12.7 9.57c-.02-1.9 1.55-2.81 1.62-2.85-.88-1.29-2.26-1.47-2.75-1.49-1.17-.12-2.28.69-2.87.69-.59 0-1.5-.67-2.47-.65-1.27.02-2.44.74-3.1 1.87-1.32 2.3-.34 5.7.95 7.56.63.91 1.39 1.93 2.38 1.9.95-.04 1.31-.62 2.46-.62 1.15 0 1.47.62 2.47.6 1.02-.02 1.66-.93 2.29-1.85.72-1.06 1.02-2.08 1.04-2.13-.02-.01-2-.77-2.02-3.05zM10.9 3.86c.52-.64.88-1.51.78-2.39-.75.03-1.67.5-2.21 1.13-.48.56-.91 1.46-.8 2.32.84.06 1.7-.42 2.23-1.06z" />
    </svg>
  );
}
