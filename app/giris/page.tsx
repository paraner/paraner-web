"use client";

import { useState } from "react";
import Link from "next/link";
import Background from "../components/Background";
import Logo from "../components/Logo";

export default function GirisPage() {
  const [showPw, setShowPw] = useState(false);

  // Backend henüz bağlı değil — şimdilik sadece bilgi mesajı gösteriyoruz
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-posta</label>
              <input id="email" type="email" placeholder="ornek@eposta.com" autoComplete="email" />
            </div>

            <div className="field">
              <label htmlFor="password">Şifre</label>
              <div className="input-wrap">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Giriş Yap
            </button>
          </form>

          <p className="auth-soon">
            🔒 Giriş yakında aktifleşecek. Şu an site önizlemesi.
          </p>

          <div className="auth-divider">veya</div>

          <p className="auth-alt">
            Hesabın yok mu? <Link href="/kayit">Kayıt ol</Link>
          </p>
        </div>
      </div>
    </>
  );
}
