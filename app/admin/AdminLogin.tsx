"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

/* İç ekip giriş ekranı (admin.paraner.com/giris).
   Müşteri AuthForm'undan AYRI olmasının sebebi: orada kayıt switcher'ı + Google/Apple + mağaza
   rozetleri var — iç ekip host'unda hiçbiri istenmiyor (kimse buradan üye olamaz).
   Rol kontrolü BURADA YAPILMAZ: giriş herkese açıktır, yetkiyi app/admin/layout.tsx sunucuda
   kontrol eder (staff değilse müşteri paneline atar). Yani burada "admin mi" diye bakmak
   güvenlik sağlamaz, sadece daha iyi bir hata mesajı verir. */
export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // çift-submit kilidi
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(
        authError.message.includes("Invalid login credentials")
          ? "E-posta veya şifre hatalı."
          : authError.message.includes("Email not confirmed")
          ? "E-posta adresin henüz doğrulanmamış."
          : "Giriş yapılamadı. Lütfen tekrar dene.",
      );
      setLoading(false);
      return;
    }

    // Kök → proxy /admin'e çevirir. Tam yeniden yükleme: sunucu oturumu taze okusun.
    window.location.assign("/");
  }

  return (
    <div className="adm-login-page">
      <form className="adm-login-card" onSubmit={handleSubmit}>
        <div className="adm-login-brand">
          PARANER<span>Yönetim</span>
        </div>
        <p className="adm-login-note">
          <ShieldCheck size={14} /> İç ekip paneli — yalnız yetkili hesaplar.
        </p>

        <label className="adm-login-label" htmlFor="adm-email">
          E-posta
        </label>
        <input
          id="adm-email"
          className="adm-login-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          autoFocus
        />

        <label className="adm-login-label" htmlFor="adm-pass">
          Şifre
        </label>
        <input
          id="adm-pass"
          className="adm-login-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="adm-login-error" role="alert">
            {error}
          </p>
        )}

        <button className="adm-login-btn" type="submit" disabled={loading}>
          {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>

        <a className="adm-login-link" href="https://paraner.com/sifre-sifirla">
          Şifremi unuttum
        </a>
      </form>
    </div>
  );
}
