"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import SocialAuth from "./SocialAuth";
import OtpVerify from "./OtpVerify";
import { createClient } from "../../lib/supabase/client";

type Mode = "giris" | "kayit";

// Birleşik giriş/kayıt formu. Üstte wordmark + iOS tarzı sürüklenebilir Giriş/Kayıt
// switcher; mod yerinde değişir (sayfa yenilenmez). /giris ve /kayit aynı bileşeni
// farklı initialMode ile render eder. Şifresiz OTP + şifre fallback (giriş) + Google.
export default function AuthForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [dir, setDir] = useState<"fwd" | "back">("fwd"); // geçiş animasyon yönü (kayıt=sağdan, giriş=soldan)
  const [step, setStep] = useState<"input" | "code">("input");

  const [pwMode, setPwMode] = useState(false); // giriş: false = OTP, true = şifre
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null); // şifre sıfırlama bağlantısı gönderildi

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // Ana sayfa beam input'undan gelen ?email= ile alanı önceden doldur.
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("email");
    if (e) setEmail(e);
  }, []);

  // Mod değiştir (switcher) — alanları sıfırla + URL'yi (/giris ↔ /kayit) güncelle.
  const switchTo = useCallback((next: Mode) => {
    setDir(next === "kayit" ? "fwd" : "back");
    setMode(next);
    setStep("input");
    setPwMode(false);
    setError(null);
    setResetMsg(null);
    setPassword("");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", next === "kayit" ? "/kayit" : "/giris");
    }
  }, []);

  const goPanel = useCallback(() => {
    const { protocol, hostname } = window.location;
    if (hostname.endsWith("paraner.com")) {
      window.location.assign(`${protocol}//app.paraner.com/`);
    } else {
      router.push("/panel");
      router.refresh();
    }
  }, [router]);

  // Güvenlik ağı: OAuth kodu /auth/callback yerine buraya düşerse tarayıcıda takas et;
  // ?closed / ?error / ?signedout mesajlarını kullanıcı dostu uyarıya çevir.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("closed") === "1") {
      setError("Hesabın ve tüm verilerin kalıcı olarak silindi. Bizi tekrar denemek istersen yeni bir hesap oluşturabilirsin.");
      window.history.replaceState({}, "", "/giris");
      return;
    }
    if (params.get("error") === "oauth") {
      setError("Google ile giriş tamamlanamadı. Lütfen tekrar dene.");
      window.history.replaceState({}, "", "/giris");
      return;
    }
    if (params.get("signedout") === "1") {
      setError("Güvenliğin için bu cihazdan çıkış yapıldı. Lütfen tekrar giriş yap.");
      window.history.replaceState({}, "", "/giris");
      return;
    }
    const code = params.get("code");
    if (!code) return;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      try {
        const { data: pre } = await supabase.auth.getSession();
        if (pre.session) { goPanel(); return; }
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { goPanel(); return; }
        const { data: post } = await supabase.auth.getSession();
        if (post.session) { goPanel(); return; }
        setError("Google ile giriş tamamlanamadı. Lütfen tekrar dene.");
        window.history.replaceState({}, "", "/giris");
      } catch {
        const { data: post } = await supabase.auth.getSession();
        if (post.session) { goPanel(); return; }
        setError("Google ile giriş tamamlanamadı. Lütfen tekrar dene.");
        window.history.replaceState({}, "", "/giris");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Giriş — OTP gönder
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) return setError("Geçerli bir e-posta adresi gir.");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) {
        setError(
          error.message.includes("Signups not allowed") || error.message.includes("not found")
            ? "Bu e-posta ile kayıtlı hesap bulunamadı. Önce kayıt ol."
            : "Kod gönderilemedi. Lütfen tekrar dene.",
        );
        return;
      }
      setStep("code");
    } catch {
      setError("Bağlantı hatası. İnternetini kontrol et.");
    } finally {
      setLoading(false);
    }
  }

  // Giriş — şifre ile (fallback)
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError("E-posta ve şifre gerekli.");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(
          error.message.includes("Invalid login credentials")
            ? "E-posta veya şifre hatalı."
            : error.message.includes("Email not confirmed")
            ? "E-posta adresin henüz doğrulanmamış."
            : "Giriş yapılamadı. Lütfen tekrar dene.",
        );
        return;
      }
      goPanel();
    } catch {
      setError("Bağlantı hatası. İnternetini kontrol et.");
    } finally {
      setLoading(false);
    }
  }

  // Şifremi unuttum — Supabase şifre sıfırlama bağlantısı gönder (mobil ile aynı akış).
  // Link → /sifre-sifirla (recovery oturumu → yeni şifre). E-posta önce girilmeli.
  async function handleForgotPassword() {
    setError(null);
    setResetMsg(null);
    if (!isValidEmail(email)) return setError("Önce e-posta adresini gir, sonra Şifremi unuttum'a bas.");
    setLoading(true);
    try {
      // implicit flow → e-postadaki token düz token_hash olur (pkce_ değil) → /sifre-sifirla
      // verifyOtp ile doğrular, farklı cihaz/tarayıcıda da açılır.
      const supabase = createClient({ implicit: true });
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/sifre-sifirla`,
      });
      if (error) {
        setError(
          error.message.includes("rate limit") || error.message.includes("after")
            ? "Çok fazla deneme. Biraz bekleyip tekrar dene."
            : "Sıfırlama bağlantısı gönderilemedi. Lütfen tekrar dene.",
        );
        return;
      }
      setResetMsg(`${email.trim()} adresine şifre sıfırlama bağlantısı gönderildi. E-postanı kontrol et.`);
    } catch {
      setError("Bağlantı hatası. İnternetini kontrol et.");
    } finally {
      setLoading(false);
    }
  }

  // Kayıt — doğrulama kodu gönder (şifresiz OTP)
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) return setError("Geçerli bir e-posta adresi gir.");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) {
        setError(
          error.message.includes("rate limit") || error.message.includes("after")
            ? "Çok fazla deneme. Biraz bekleyip tekrar dene."
            : "Kayıt yapılamadı. Lütfen tekrar dene.",
        );
        return;
      }
      setStep("code");
    } catch {
      setError("Bağlantı hatası. İnternetini kontrol et.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split-form">
      <a
        href="https://paraner.com"
        className="auth-wordmark"
        aria-label="Paraner — ana sayfaya git"
      />

      {step === "code" ? (
        <OtpVerify email={email.trim()} mode={mode} onBack={() => setStep("input")} />
      ) : (
        <>
          <AuthSwitch mode={mode} onSwitch={switchTo} />

          <div key={`head-${mode}`} className={`auth-anim auth-anim-${dir} auth-head`}>
            <h1>{mode === "kayit" ? "Hesap oluştur" : "Tekrar hoş geldin"}</h1>
            <p>
              {mode === "kayit"
                ? "Dakikalar içinde paranı yönetmeye başla."
                : "Hesabına giriş yap, kaldığın yerden devam et."}
            </p>
          </div>

          {error && <div className="auth-msg error">{error}</div>}

          <SocialAuth key="social" mode={mode} />

          <div className="auth-divider">veya e-posta ile</div>

          <div key={`form-${mode}`} className={`auth-anim auth-anim-${dir}`}>
          {mode === "kayit" ? (
            <form onSubmit={handleSignup}>
              <div className="field">
                <input id="email" type="email" placeholder="E-posta" aria-label="E-posta" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? "Gönderiliyor…" : "Devam Et"}
              </button>
              <p className="auth-terms">
                Kayıt olarak <a href="/gizlilik">Gizlilik Politikası</a>&apos;nı kabul etmiş olursun.
              </p>
            </form>
          ) : pwMode ? (
            <form onSubmit={handlePasswordLogin}>
              <div className="field">
                <input id="email" type="email" placeholder="E-posta" aria-label="E-posta" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="field">
                <div className="input-wrap">
                  <input id="password" type={showPw ? "text" : "password"} placeholder="Şifre" aria-label="Şifre"
                    autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                  <button type="button" className="toggle-pw" onClick={() => setShowPw((s) => !s)}>
                    {showPw ? "Gizle" : "Göster"}
                  </button>
                </div>
              </div>
              <div className="auth-row">
                <button type="button" onClick={handleForgotPassword} disabled={loading}>
                  Şifremi unuttum
                </button>
              </div>
              {resetMsg && <div className="auth-msg success">{resetMsg}</div>}
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
              </button>
              <button type="button" className="auth-text-link"
                onClick={() => { setPwMode(false); setError(null); setResetMsg(null); }}>
                Kod ile giriş yap
              </button>
            </form>
          ) : (
            <form onSubmit={handleSendOtp}>
              <div className="field">
                <input id="email" type="email" placeholder="E-posta" aria-label="E-posta" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? "Gönderiliyor…" : "Devam Et"}
              </button>
              <button type="button" className="auth-text-link"
                onClick={() => { setPwMode(true); setError(null); setResetMsg(null); }}>
                Şifre ile giriş yap
              </button>
            </form>
          )}
          </div>
        </>
      )}
    </div>
  );
}

// iOS UISegmentedControl tarzı — kaydırmalı thumb, tıkla veya sürükle.
function AuthSwitch({ mode, onSwitch }: { mode: Mode; onSwitch: (m: Mode) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null); // sürükleme sırasında thumb translate (px)
  const movedRef = useRef(false);
  const startXRef = useRef(0);

  // Thumb'ın sürükleme aralığı: 0 (sol/giriş) → maxTravel (sağ/kayıt).
  function maxTravel() {
    const w = trackRef.current?.clientWidth ?? 0;
    return (w - 8) / 2; // padding 4px iki yandan
  }

  const downRef = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    movedRef.current = false;
    downRef.current = true;
    startXRef.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    // drag'i HENÜZ set etme → sadece gerçekten sürüklenince başlar (tap'te transition korunur)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!downRef.current || !trackRef.current) return;
    if (Math.abs(e.clientX - startXRef.current) > 3) movedRef.current = true;
    if (!movedRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const half = maxTravel();
    const rel = e.clientX - rect.left - 4 - half / 2; // thumb'ı parmağın altına ortala
    setDrag(Math.max(0, Math.min(half, rel)));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!downRef.current) return;
    downRef.current = false;
    if (movedRef.current) {
      // sürükleme bitti → en yakına yapış
      onSwitch((drag ?? 0) > maxTravel() / 2 ? "kayit" : "giris");
    } else if (trackRef.current) {
      // tap → tıklanan yarıya göre geç (thumb CSS transition ile kayar)
      const rect = trackRef.current.getBoundingClientRect();
      onSwitch(e.clientX - rect.left > rect.width / 2 ? "kayit" : "giris");
    }
    setDrag(null);
  }

  const thumbStyle: React.CSSProperties =
    drag !== null
      ? { transform: `translateX(${drag}px)`, transition: "none" }
      : { transform: mode === "kayit" ? "translateX(100%)" : "translateX(0)" };

  return (
    <div
      className="auth-switch"
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span className="auth-switch-thumb" style={thumbStyle} />
      <button
        type="button"
        className={`auth-switch-seg${mode === "giris" ? " active" : ""}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSwitch("giris"); } }}
      >
        Giriş Yap
      </button>
      <button
        type="button"
        className={`auth-switch-seg${mode === "kayit" ? " active" : ""}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSwitch("kayit"); } }}
      >
        Kayıt Ol
      </button>
    </div>
  );
}
