"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

// Şifresiz OTP doğrulama adımı — e-postaya gelen 6 haneli kodu girer.
// Hem /giris hem /kayit sayfasında, e-posta gönderildikten sonra gösterilir.
export default function OtpVerify({
  email,
  mode,
  onBack,
}: {
  email: string;
  mode: "giris" | "kayit";
  onBack: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const routeAfterAuth = useCallback(() => {
    const { protocol, hostname } = window.location;
    if (hostname.endsWith("paraner.com")) {
      window.location.assign(`${protocol}//app.paraner.com/`);
    } else {
      router.push("/panel");
      router.refresh();
    }
  }, [router]);

  const verify = useCallback(
    async (token: string) => {
      if (token.length !== CODE_LENGTH || loading) return;
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        });
        if (verifyError || !data.user) {
          // Supabase yanlış kod ile süresi dolmuş kodu aynı mesajla döner → birleşik göster
          setError("Kod hatalı ya da süresi dolmuş. Tekrar dene ya da yeni kod iste.");
          setCode("");
          setLoading(false);
          inputRef.current?.focus();
          return;
        }
        routeAfterAuth();
      } catch {
        setError("Bağlantı hatası. İnternetini kontrol et.");
        setLoading(false);
      }
    },
    [email, loading, routeAfterAuth],
  );

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) verify(digits);
  }

  async function resend() {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: mode === "kayit" },
      });
      if (resendError) {
        setError("Kod gönderilemedi. Biraz bekleyip tekrar dene.");
        return;
      }
      setSecondsLeft(RESEND_SECONDS);
      setCode("");
      inputRef.current?.focus();
    } catch {
      setError("Bağlantı hatası. İnternetini kontrol et.");
    } finally {
      setResending(false);
    }
  }

  const cells = Array.from({ length: CODE_LENGTH });

  return (
    <div className="otp-step">
      <div className="auth-head">
        <h1>Kodu gir</h1>
        <p>
          <strong>{email}</strong> adresine gönderdiğimiz 6 haneli kodu gir.
        </p>
      </div>

      {error && <div className="auth-msg error">{error}</div>}

      <div className="otp-wrap" onClick={() => inputRef.current?.focus()}>
        <input
          ref={inputRef}
          className="otp-hidden"
          value={code}
          onChange={onChange}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          autoFocus
          aria-label="Doğrulama kodu"
        />
        <div className="otp-cells">
          {cells.map((_, i) => {
            const char = code[i];
            const active = i === code.length;
            return (
              <div
                key={i}
                className={`otp-cell${char ? " filled" : ""}${active ? " active" : ""}${
                  error ? " err" : ""
                }`}
              >
                {char || ""}
              </div>
            );
          })}
        </div>
      </div>

      {loading && <div className="otp-loading">Doğrulanıyor…</div>}

      <div className="otp-resend">
        {secondsLeft > 0 ? (
          <span>Kod gelmediyse {secondsLeft} sn sonra tekrar isteyebilirsin</span>
        ) : (
          <button type="button" className="otp-resend-link" onClick={resend} disabled={resending}>
            {resending ? "Gönderiliyor…" : "Kodu tekrar gönder"}
          </button>
        )}
      </div>

      <button type="button" className="otp-back" onClick={onBack}>
        ← E-postayı değiştir
      </button>
    </div>
  );
}
