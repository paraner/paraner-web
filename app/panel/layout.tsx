import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfiles, profileAvatarUrl } from "../../lib/supabase/profile";
import Sidebar from "./Sidebar";
import LogoutButton from "./LogoutButton";
import Avatar from "../../components/ui/Avatar";

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
  // Oturum kontrolü zaten proxy.ts'te yapılıyor (girişsizi /giris'e atar).
  // getProfiles cache'li: sidebar + sayfalar aynı render içinde paylaşır → tek sorgu.
  const profiles = await getProfiles();
  const active = profiles.find((p) => p.is_active) ?? profiles[0] ?? null;
  if (!active) {
    redirect("/giris");
  }

  return (
    <div className="panel-shell">
      <Sidebar profiles={profiles} />
      <div className="panel-main">
        <header className="panel-topbar">
          <div className="panel-topbar-title">
            <Avatar name={active.profile_name} url={profileAvatarUrl(active)} small />
            <span>{active.profile_name ?? "Profil"}</span>
          </div>
          <LogoutButton />
        </header>
        <div className="panel-content">{children}</div>
      </div>
    </div>
  );
}
