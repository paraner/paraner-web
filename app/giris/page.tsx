"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Background from "../components/Background";
import Logo from "../components/Logo";
import { createClient } from "../../lib/supabase/client";

export default function GirisPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("E-posta ve şifre gerekli.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Supabase hata mesajlarını Türkçeleştir
        const msg = error.message.includes("Invalid login credentials")
          ? "E-posta veya şifre hatalı."
          : error.message.includes("Email not confirmed")
          ? "E-posta adresin henüz doğrulanmamış."
          : "Giriş yapılamadı. Lütfen tekrar dene.";
        setError(msg);
        return;
      }

      // Başarılı → panele git.
      // Canlıda panel app.paraner.com'da → oraya geç (oturum .paraner.com cookie'siyle paylaşılır).
      // Lokalde aynı host'ta kal (cookie subdomain'ler arası paylaşılmaz).
      const { protocol, hostname } = window.location;
      if (hostname.endsWith("paraner.com")) {
        window.location.assign(`${protocol}//app.paraner.com/`);
      } else {
        router.push("/panel");
        router.refresh();
      }
    } catch {
      setError("Bağlantı hatası. İnternetini kontrol et.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Background />
      <div className="auth-page">
        <div className="auth-top">
          <Logo />
        </div>

        <div className="auth-card">
          <div className="auth-head">
            <h1>Tekrar hoş geldin</h1>
            <p>Hesabına giriş yap, kaldığın yerden devam et.</p>
          </div>

          {error && <div className="auth-msg error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-posta</label>
              <input
                id="email"
                type="email"
                placeholder="ornek@eposta.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Şifre</label>
              <div className="input-wrap">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? "Gizle" : "Göster"}
                </button>
              </div>
            </div>

            <div className="auth-row">
              <Link href="/giris">Şifremi unuttum</Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
            >
              {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
            </button>
          </form>

          <div className="auth-divider">veya</div>

          <p className="auth-alt">
            Hesabın yok mu? <Link href="/kayit">Kayıt ol</Link>
          </p>
        </div>
      </div>
    </>
  );
}
