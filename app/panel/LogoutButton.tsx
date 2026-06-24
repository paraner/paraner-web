"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    // Aynı tarayıcıda tekrar girişte login-alert yeniden raporlasın diye guard'ı temizle
    try { sessionStorage.removeItem("login_reported"); } catch { /* yoksay */ }
    // scope: 'local' — SADECE bu tarayıcıdan çık. Varsayılan 'global' kullanıcının
    // TÜM cihazlarının token'ını iptal eder → başka cihaz (telefon) durduk yere düşer.
    await supabase.auth.signOut({ scope: "local" });
    router.push("/giris");
    router.refresh();
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
