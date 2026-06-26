"use client";

import { useState, useEffect, useCallback } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

// Şifre sıfırlama (recovery) sayfası. E-postadaki link buraya gelir (PKCE ?code veya
// token_hash+type=recovery). Oturum kurulunca yeni şifre formu açılır → updateUser →
// panele yönlendirir. Mobil reset-password ile aynı sonuç (web'de paraner.com'da).
type Phase = "verifying" | "form" | "done" | "invalid";

export default function ResetPasswordClient() {
  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goPanel = useCallback(() => {
    const { protocol, hostname } = window.location;
    if (hostname.endsWith("paraner.com")) {
      window.location.assign(`${protocol}//app.paraner.com/`);
    } else {
      window.location.assign("/panel");
    }
  }, []);

  // Recovery oturumunu kur — manuel takas + detectSessionInUrl auto-takas yarışına dayanıklı.
  useEffect(() => {
    const supabase = createClient();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.history.replaceState({}, "", "/sifre-sifirla"); // token URL'den temizlenir
      setPhase("form");
    };

    // Supabase recovery linkini işleyince PASSWORD_RECOVERY (veya SIGNED_IN) tetikler.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) finish();
    });

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) return finish();
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
          if (!error) return finish();
        }
        // Manuel takas başarısız / parametre yok → auto-takas (detectSessionInUrl) oturumu
        // kurmuş olabilir, kısa süre bekleyip kontrol et.
        await new Promise((r) => setTimeout(r, 1200));
        const { data } = await supabase.auth.getSession();
        if (data.session) finish();
        else if (!done) setPhase("invalid");
      } catch {
        if (!done) setPhase("invalid");
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Şifre en az 6 karakter olmalı.");
    if (password !== confirm) return setError("Şifreler eşleşmiyor.");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError("Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir, yeniden iste.");
        setLoading(false);
        return;
      }
      setPhase("done");
      setTimeout(goPanel, 1500);
    } catch {
      setError("Bağlantı hatası. İnternetini kontrol et.");
      setLoading(false);
    }
  }

  return (
    <div className="reset-page">
      <div className="reset-card">
        <a href="https://paraner.com" className="auth-wordmark" aria-label="Paraner — ana sayfaya git" />

        {phase === "verifying" && (
          <>
            <h1>Bağlantı doğrulanıyor…</h1>
            <div className="reset-state">Lütfen bekle.</div>
          </>
        )}

        {phase === "invalid" && (
          <>
            <h1>Bağlantı geçersiz</h1>
            <p>Şifre sıfırlama bağlantısının süresi dolmuş ya da geçersiz. Giriş sayfasından yeniden iste.</p>
            <a className="btn btn-primary btn-block btn-lg" href="/giris">Giriş sayfasına dön</a>
          </>
        )}

        {phase === "done" && (
          <>
            <h1>Şifren güncellendi</h1>
            <p>Yeni şifrenle oturum açıldı. Panele yönlendiriliyorsun…</p>
          </>
        )}

        {phase === "form" && (
          <>
            <h1>Yeni şifre belirle</h1>
            <p>Hesabın için yeni bir şifre oluştur.</p>
            {error && <div className="auth-msg error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <div className="input-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Yeni şifre"
                    aria-label="Yeni şifre"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button type="button" className="toggle-pw" onClick={() => setShowPw((s) => !s)}>
                    {showPw ? "Gizle" : "Göster"}
                  </button>
                </div>
              </div>
              <div className="field">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Yeni şifre (tekrar)"
                  aria-label="Yeni şifre tekrar"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? "Güncelleniyor…" : "Şifreyi Güncelle"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
