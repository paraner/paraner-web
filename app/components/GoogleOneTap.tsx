"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "../../lib/supabase/client";

// Google Web Client ID — SocialAuth ile aynı (Supabase Google provider'da kayıtlı).
const GOOGLE_CLIENT_ID =
  "108116742316-mng0v121kl33sju0mb0ecruak83qmbbs.apps.googleusercontent.com";

// Ana sayfa Google One Tap: kullanıcı paraner.com'u açınca üstte "Paraner olarak
// devam et · e-posta" kartı belirir; basınca signInWithIdToken ile SAYFADAN ÇIKMADAN
// kayıt/giriş olur → panele yönlenir. (window.google tipi SocialAuth'ta global tanımlı.)
// Oturum zaten açıksa veya GIS yüklenmezse sessizce hiçbir şey yapmaz.
export default function GoogleOneTap() {
  const rawNonceRef = useRef("");

  const handleCredential = useCallback(async (resp: { credential: string }) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: resp.credential,
        nonce: rawNonceRef.current,
      });
      if (error) return;
      const { protocol, hostname } = window.location;
      window.location.assign(
        hostname.endsWith("paraner.com") ? `${protocol}//app.paraner.com/` : "/panel"
      );
    } catch {
      /* yoksay — kullanıcı normal akıştan devam edebilir */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (cancelled || !window.google) return;
      // Zaten oturum açıksa One Tap gösterme.
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (cancelled || data.session) return;

      // nonce: Google'a SHA-256 hash, Supabase'e ham (güvenlik şartı).
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
      if (cancelled || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
        itp_support: true,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signup",
      });
      window.google.accounts.id.prompt();
    }

    const existing = document.getElementById(
      "google-gsi-script"
    ) as HTMLScriptElement | null;
    if (window.google) {
      init();
    } else if (!existing) {
      const s = document.createElement("script");
      s.id = "google-gsi-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = () => {
        if (!cancelled) init();
      };
      document.head.appendChild(s);
    } else {
      existing.addEventListener("load", () => !cancelled && init(), { once: true });
    }

    return () => {
      cancelled = true;
      try {
        window.google?.accounts.id.cancel();
      } catch {
        /* GIS yüklü değilse yoksay */
      }
    };
  }, [handleCredential]);

  return null;
}
