"use client";

import { useState } from "react";
import Link from "next/link";
import Background from "../components/Background";
import Logo from "../components/Logo";

export default function KayitPage() {
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
            <h1>Hesap oluştur</h1>
            <p>Dakikalar içinde paranı yönetmeye başla.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Ad Soyad</label>
              <input id="name" type="text" placeholder="Adın Soyadın" autoComplete="name" />
            </div>

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
                  placeholder="En az 8 karakter"
                  autoComplete="new-password"
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

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Kayıt Ol
            </button>
          </form>

          <p className="auth-terms">
            Kayıt olarak <a href="/giris">Kullanım Koşulları</a> ve{" "}
            <a href="/giris">Gizlilik Politikası</a>'nı kabul etmiş olursun.
          </p>

          <p className="auth-soon">
            🔒 Kayıt yakında aktifleşecek. Şu an site önizlemesi.
          </p>

          <div className="auth-divider">veya</div>

          <p className="auth-alt">
            Zaten hesabın var mı? <Link href="/giris">Giriş yap</Link>
          </p>
        </div>
      </div>
    </>
  );
}
