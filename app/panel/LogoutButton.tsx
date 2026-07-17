"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

export default function LogoutButton({
  variant = "button",
  collapsed = false,
}: {
  /** "button" = Ayarlar sayfası (kutu buton) · "nav" = Sidebar alt menü öğesi */
  variant?: "button" | "nav";
  collapsed?: boolean;
} = {}) {
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
    // İSTİSNA admin.*: iç ekip pazarlama sayfasına düşmesin → kendi host'unda kalır, proxy
    // oturumsuz kullanıcıyı admin.paraner.com/giris'e alır (tekrar girmek tek tık).
    const { protocol, hostname, port } = window.location;
    const target = hostname.startsWith("admin.") ? hostname : hostname.replace(/^app\./, "");
    window.location.href = `${protocol}//${target}${port ? ":" + port : ""}/`;
  }

  // Sidebar alt menüsünde: Ayarlar/Destek ile aynı görünüm (panel-nav-item)
  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="panel-nav-item nav-logout"
        title={collapsed ? "Çıkış Yap" : undefined}
      >
        <LogOut />
        <span className="nav-label">{loading ? "Çıkış yapılıyor…" : "Çıkış Yap"}</span>
      </button>
    );
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
