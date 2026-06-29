"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "./toast";
import { createClient } from "../../lib/supabase/client";

// Google Web Client ID (public — mobil app ile aynı, Supabase Google provider'da kayıtlı).
const GOOGLE_CLIENT_ID =
  "108116742316-mng0v121kl33sju0mb0ecruak83qmbbs.apps.googleusercontent.com";

// Google Identity Services (GIS) tipleri — sadece kullandığımız kadar.
type GoogleCredentialResponse = { credential: string };
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

// Google ile giriş + Apple (pasif placeholder). Hem giriş hem kayıt sayfasında kullanılır.
//
// Google: artık GIS "One Tap" + kişiselleştirilmiş buton. Tarayıcıda Google oturumu
// açıksa "Paraner olarak devam et · admin@paraner.com" şeklinde hesabı gösterir
// (signInWithIdToken — sayfadan çıkmadan giriş). GIS yüklenmezse eski signInWithOAuth
// redirect butonuna güvenli şekilde düşülür.
export default function SocialAuth({ mode }: { mode: "giris" | "kayit" }) {
  const router = useRouter();
  const appleEnabled = false; // Apple ile Giriş eklenince true

  const [loading, setLoading] = useState(false);
  // Hata mesajları sağ üst toast'ta (Sonner). setError → toast'a yönlendiren sarmalayıcı.
  const setError = (msg: string | null) => { if (msg) showToast({ title: msg, variant: "error" }); };
  const [gisReady, setGisReady] = useState(false); // GIS butonu render edildi mi
  const btnRef = useRef<HTMLDivElement>(null);
  const rawNonceRef = useRef<string>(""); // signInWithIdToken'a ham nonce gider
  const modeRef = useRef(mode); // GIS init'te context için (mod değişince RE-INIT YOK → titreme yok)
  modeRef.current = mode;

  // Başarılı girişten sonra yönlendirme (şifre/OTP akışıyla aynı).
  const goAfterLogin = useCallback(() => {
    const { protocol, hostname } = window.location;
    if (hostname.endsWith("paraner.com")) {
      window.location.assign(`${protocol}//app.paraner.com/`);
    } else {
      router.push("/panel");
      router.refresh();
    }
  }, [router]);

  // Google credential geldi → Supabase oturumu aç (ham nonce ile).
  const handleCredential = useCallback(
    async (resp: GoogleCredentialResponse) => {
      setError(null);
      setLoading(true);
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: resp.credential,
          nonce: rawNonceRef.current,
        });
        if (error) {
          setLoading(false);
          setError("Google ile giriş tamamlanamadı. Lütfen tekrar dene.");
          return;
        }
        goAfterLogin();
      } catch {
        setLoading(false);
        setError("Bağlantı hatası. İnternetini kontrol et.");
      }
    },
    [goAfterLogin]
  );

  useEffect(() => {
    let cancelled = false;

    async function initGis() {
      if (cancelled || !window.google || !btnRef.current) return;

      // nonce: Google'a SHA-256 hash'li, Supabase'e ham versiyonu verilir (güvenlik şartı).
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const rawNonce = btoa(String.fromCharCode(...Array.from(bytes)));
      const hashBuf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(rawNonce)
      );
      const hashedNonce = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      rawNonceRef.current = rawNonce;

      if (cancelled || !window.google || !btnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        nonce: hashedNonce,
        use_fedcm_for_prompt: true, // One Tap kartı — Chrome cookie kaldırmasına uyum
        use_fedcm_for_button: true, // Kişiselleştirilmiş "Continue as" butonu (cookie'siz)
        itp_support: true, // Safari ITP
        auto_select: false,
        cancel_on_tap_outside: true,
        context: modeRef.current === "kayit" ? "signup" : "signin",
      });

      // Genişlik: gsi-wrap GIS hazır olana kadar display:none (gsi-hidden) → clientWidth 0 döner
      // ve eski kod 240'a düşüyordu (Google butonu sabit dar/ortada kalıyordu). GÖRÜNÜR parent'tan
      // hesapla: telefon (≤420 kolon) → tam genişlik; masaüstü (satır) → yarım (gap 16). Apple ile eşit.
      const parentW = btnRef.current.parentElement?.clientWidth || 0;
      const column = window.matchMedia("(max-width: 420px)").matches;
      const target = column ? parentW : (parentW - 16) / 2;
      const width = Math.round(Math.min(400, Math.max(200, target || 240)));
      // Mobil (≤1024) auth KOYU temada → koyu Google butonu (Apple koyu pill ile tutarlı).
      // Masaüstü beyaz formda → outline (beyaz). matchMedia render anında okunur.
      const darkAuth =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 1024px)").matches;
      window.google.accounts.id.renderButton(btnRef.current, {
        type: "standard",
        theme: darkAuth ? "filled_black" : "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width,
      });
      setGisReady(true);

      // One Tap kişiselleştirilmiş kart (Google oturumu açıksa belirir).
      window.google.accounts.id.prompt();
    }

    // GIS script'ini bir kez yükle.
    const existing = document.getElementById(
      "google-gsi-script"
    ) as HTMLScriptElement | null;
    if (window.google) {
      initGis();
    } else if (!existing) {
      const s = document.createElement("script");
      s.id = "google-gsi-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = () => {
        if (!cancelled) initGis();
      };
      document.head.appendChild(s);
    } else {
      existing.addEventListener(
        "load",
        () => {
          if (!cancelled) initGis();
        },
        { once: true }
      );
    }

    return () => {
      cancelled = true;
      try {
        window.google?.accounts.id.cancel();
      } catch {
        /* GIS yüklü değilse yoksay */
      }
    };
    // mode KASITLI olarak yok — mod değişiminde GIS re-init etme (Google butonu titremesin)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleCredential]);

  // GIS yüklenmezse — eski OAuth redirect yedeği.
  async function handleGoogleFallback() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setLoading(false);
        setError("Google ile bağlanılamadı. Lütfen tekrar dene.");
      }
      // Başarılıysa tarayıcı Google'a yönlenir.
    } catch {
      setLoading(false);
      setError("Bağlantı hatası. İnternetini kontrol et.");
    }
  }

  return (
    <div className="social-auth">
      {/* Google kişiselleştirilmiş buton (GIS render eder) */}
      <div
        ref={btnRef}
        className={`gsi-wrap${gisReady ? "" : " gsi-hidden"}`}
        aria-busy={loading}
      />

      {/* Yedek custom buton — GIS hazır değilse */}
      {!gisReady && (
        <button
          type="button"
          className="btn btn-social btn-google"
          onClick={handleGoogleFallback}
          disabled={loading}
        >
          <GoogleIcon />
          {loading ? "…" : "Google"}
        </button>
      )}

      <button
        type="button"
        className="btn btn-social btn-apple"
        disabled={!appleEnabled}
        title="Apple ile Giriş yakında"
      >
        <AppleIcon />
        Apple
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
