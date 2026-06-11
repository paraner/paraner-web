import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfiles } from "../../lib/supabase/profile";
import Sidebar from "./Sidebar";
import { SparkleIcon, BellIcon, GearIcon } from "../../components/icons";

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
          <div className="panel-topbar-actions">
            <button type="button" className="topbar-icon-btn" aria-label="AI Sohbet" title="AI Sohbet">
              <SparkleIcon />
            </button>
            <button type="button" className="topbar-icon-btn" aria-label="Bildirimler" title="Bildirimler">
              <BellIcon />
            </button>
            <Link href="/panel/ayarlar" className="topbar-icon-btn" aria-label="Ayarlar" title="Ayarlar">
              <GearIcon />
            </Link>
          </div>
        </header>
        <div className="panel-content">{children}</div>
      </div>
    </div>
  );
}
