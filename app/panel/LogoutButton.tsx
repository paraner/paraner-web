"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    // Aynı tarayıcıda tekrar girişte login-alert yeniden raporlasın diye guard'ı temizle
    try { sessionStorage.removeItem("login_reported"); } catch { /* yoksay */ }
    // scope: 'local' — SADECE bu tarayıcıdan çık. Varsayılan 'global' kullanıcının
    // TÜM cihazlarının token'ını iptal eder → başka cihaz (telefon) durduk yere düşer.
    await supabase.auth.signOut({ scope: "local" });
    // Çıkışta pazarlama anasayfasına (paraner.com) at — app.paraner.com → paraner.com,
    // dev'de app.localhost → localhost. Tam yeniden yükleme (server oturumu da temizlensin).
    const { protocol, hostname, port } = window.location;
    const marketingHost = hostname.replace(/^app\./, "");
    window.location.href = `${protocol}//${marketingHost}${port ? ":" + port : ""}/`;
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="panel-logout"
    >
      {loading ? "Çıkış yapılıyor…" : "Çıkış Yap"}
    </button>
  );
}
