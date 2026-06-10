import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import LogoutButton from "./LogoutButton";

// Panel uygulamanın içi — arama motorlarına kapalı
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default async function PanelPage() {
  const supabase = await createClient();

  // Oturum yoksa girişe geri at
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/giris");
  }

  // Aktif profili çek (RLS otomatik: sadece kendi profilleri görünür)
  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_name, profile_type, currency")
    .eq("is_active", true)
    .maybeSingle();

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Giriş başarılı ✓
      </h1>
      <p style={{ color: "rgba(255,255,255,0.55)", marginBottom: 24 }}>
        Mobil uygulamayla aynı hesaba bağlandın. Bu sayfa şimdilik sadece bir test.
      </p>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          lineHeight: 1.9,
        }}
      >
        <div>
          <strong>E-posta:</strong> {user.email}
        </div>
        <div>
          <strong>Aktif profil:</strong>{" "}
          {profile?.profile_name ?? "— (henüz profil yok)"}
        </div>
        <div>
          <strong>Profil tipi:</strong> {profile?.profile_type ?? "—"}
        </div>
        <div>
          <strong>Para birimi:</strong> {profile?.currency ?? "—"}
        </div>
      </div>

      <LogoutButton />
    </main>
  );
}
