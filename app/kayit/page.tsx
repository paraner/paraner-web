"use client";

import { useState } from "react";
import Link from "next/link";
import Background from "../components/Background";
import Logo from "../components/Logo";
import SocialAuth from "../components/SocialAuth";
import AuthVisual from "../components/AuthVisual";
import OtpVerify from "../components/OtpVerify";
import { createClient } from "../../lib/supabase/client";

export default function KayitPage() {
  const [step, setStep] = useState<"form" | "code">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // Kayıt — e-postaya doğrulama kodu gönder, kod adımına geç (şifresiz OTP)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Ad Soyad gerekli.");
    if (!isValidEmail(email)) return setError("Geçerli bir e-posta adresi gir.");

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          data: { full_name: name.trim() },
        },
      });
      if (error) {
        const msg = error.message.includes("rate limit") || error.message.includes("after")
          ? "Çok fazla deneme. Biraz bekleyip tekrar dene."
          : "Kayıt yapılamadı. Lütfen tekrar dene.";
        setError(msg);
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
    <>
      <Background />
      <div className="auth-split">
        <div className="auth-split-form">
          <Logo />

          {step === "code" ? (
            <OtpVerify email={email.trim()} mode="kayit" onBack={() => setStep("form")} />
          ) : (
            <>
              <div className="auth-head">
                <h1>Hesap oluştur</h1>
                <p>Dakikalar içinde paranı yönetmeye başla.</p>
              </div>

              {error && <div className="auth-msg error">{error}</div>}

              <SocialAuth mode="kayit" />

              <div className="auth-divider">veya e-posta ile</div>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="name">Ad Soyad</label>
                  <input id="name" type="text" placeholder="Adın Soyadın" autoComplete="name"
                    value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                </div>

                <div className="field">
                  <label htmlFor="email">E-posta</label>
                  <input id="email" type="email" placeholder="ornek@eposta.com" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>

                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  {loading ? "Gönderiliyor…" : "Doğrulama Kodu Gönder"}
                </button>
              </form>

              <p className="auth-terms">
                Kayıt olarak <a href="/gizlilik">Gizlilik Politikası</a>'nı kabul etmiş olursun.
              </p>

              <p className="auth-alt">
                Zaten hesabın var mı? <Link href="/giris">Giriş yap</Link>
              </p>
            </>
          )}
        </div>

        <AuthVisual />
      </div>
    </>
  );
}
