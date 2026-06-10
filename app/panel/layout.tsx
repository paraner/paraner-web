import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import Sidebar from "./Sidebar";
import LogoutButton from "./LogoutButton";

// Panel uygulamanın içi — tüm /panel sayfaları arama motorlarına kapalı
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/giris");
  }

  // Üst bar + menü için aktif profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_name, profile_type")
    .eq("is_active", true)
    .maybeSingle();

  const typeLabel =
    profile?.profile_type === "business" ? "İşletme" : "Bireysel";

  return (
    <div className="panel-shell">
      <Sidebar profileType={profile?.profile_type ?? null} />
      <div className="panel-main">
        <header className="panel-topbar">
          <div className="panel-profile">
            <strong>{profile?.profile_name ?? "Profil"}</strong>
            <span>{typeLabel}</span>
          </div>
          <LogoutButton />
        </header>
        <div className="panel-content">{children}</div>
      </div>
    </div>
  );
}
