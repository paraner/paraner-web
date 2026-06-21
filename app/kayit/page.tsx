"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Background from "../components/Background";
import Logo from "../components/Logo";
import SocialAuth from "../components/SocialAuth";
import AuthVisual from "../components/AuthVisual";
import { createClient } from "../../lib/supabase/client";

export default function KayitPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!name.trim()) return setError("Ad Soyad gerekli.");
    if (!email.trim()) return setError("E-posta gerekli.");
    if (password.length < 8) return setError("Şifre en az 8 karakter olmalı.");

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });

      if (error) {
        const msg = error.message.includes("already registered")
          ? "Bu e-posta zaten kayıtlı."
          : "Kayıt yapılamadı. Lütfen tekrar dene.";
        setError(msg);
        return;
      }

      // E-posta doğrulaması açıksa oturum gelmez → bilgilendir
      if (!data.session) {
        setInfo("Hesabın oluşturuldu! E-postana gönderdiğimiz bağlantıyla doğrula, sonra giriş yap.");
        return;
      }

      // Oturum geldi → panele (yeni kullanıcı için onboarding orada açılacak — Faz 2)
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
      <div className="auth-split">
        <div className="auth-split-form">
          <Logo />

          <div className="auth-head">
            <h1>Hesap oluştur</h1>
            <p>Dakikalar içinde paranı yönetmeye başla.</p>
          </div>

          {error && <div className="auth-msg error">{error}</div>}
          {info && <div className="auth-msg success">{info}</div>}

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

            <div className="field">
              <label htmlFor="password">Şifre</label>
              <div className="input-wrap">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="En az 8 karakter"
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

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? "Oluşturuluyor…" : "Kayıt Ol"}
            </button>
          </form>

          <p className="auth-terms">
            Kayıt olarak <a href="/gizlilik">Gizlilik Politikası</a>'nı kabul etmiş olursun.
          </p>

          <p className="auth-alt">
            Zaten hesabın var mı? <Link href="/giris">Giriş yap</Link>
          </p>
        </div>

        <AuthVisual />
      </div>
    </>
  );
}
