import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getProfiles } from "../../lib/supabase/profile";
import Sidebar from "./Sidebar";
import { SparkleIcon, BellIcon, GearIcon } from "../../components/icons";

// Panel uygulamanın içi — tüm /panel sayfaları arama motorlarına kapalı
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

// Profil verisini ÇEKEN parça — Suspense içinde stream edilir.
// Böylece layout'un kabuğu (üst bar) getProfiles'u BEKLEMEDEN anında boyanır;
// profiller/sayfa verisi arkadan akar.
async function ProfileSidebar() {
  // Oturum kontrolü zaten proxy.ts'te yapılıyor (girişsizi /giris'e atar).
  // getProfiles cache'li: sidebar + sayfalar aynı render içinde paylaşır → tek sorgu.
  const profiles = await getProfiles();
  const active = profiles.find((p) => p.is_active) ?? profiles[0] ?? null;
  // Profil yoksa (yeni kayıt) sidebar yok — dashboard'daki kurulum modalı devralır.
  if (!active) {
    return null;
  }
  return <Sidebar profiles={profiles} />;
}

// Layout artık SENKRON (top-level await yok) → kabuk ilk byte'ta stream edilir.
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="panel-shell">
      {/* Profiller stream edilir → kabuk beklemeden boyanır */}
      <Suspense fallback={null}>
        <ProfileSidebar />
      </Suspense>
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
