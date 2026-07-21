import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getProfiles } from "../../lib/supabase/profile";
import Sidebar from "./Sidebar";
import LoginReporter from "./LoginReporter";
import Heartbeat from "./Heartbeat";
import AccountStatusGuard from "./AccountStatusGuard";
import ToastHost from "../components/ToastHost";
import ConfirmProvider from "../components/ConfirmProvider";
import NotificationBell from "../../components/NotificationBell";

// Panel uygulamanın içi — tüm /panel sayfaları arama motorlarına kapalı
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

// Profil verisini ÇEKEN parça — Suspense içinde stream edilir.
// Böylece layout'un kabuğu (üst bar) getProfiles'u BEKLEMEDEN anında boyanır;
// profiller/sayfa verisi arkadan akar.
/* ⚠️ Daralt tercihi ÇEREZDE, localStorage'da DEĞİL (2026-07-19).
   Eskiden sunucu her zaman "açık" render ediyor, tarayıcı localStorage'ı sonradan okuyup
   kapatıyordu → ÖLÇÜLDÜ: sol panel 315ms'de 248px (açık) geliyor, 566ms'de 74px'e iniyor.
   Genişlik animasyonu da olduğu için göz kırpması net görülüyordu (Mehmet fark etti).
   Çerez sunucuya İSTEKLE BİRLİKTE gider → ilk HTML zaten doğru genişlikte gelir, hiç
   zıplama olmaz. localStorage bunu yapamaz: sunucu onu göremez. */
async function ProfileSidebar() {
  const kapali = (await cookies()).get("paraner-sidebar-collapsed")?.value === "1";
  // Oturum kontrolü zaten proxy.ts'te yapılıyor (girişsizi /giris'e atar).
  // getProfiles cache'li: sidebar + sayfalar aynı render içinde paylaşır → tek sorgu.
  const profiles = await getProfiles();
  const active = profiles.find((p) => p.is_active) ?? profiles[0] ?? null;
  // Profil yoksa (yeni kayıt) sidebar yok — dashboard'daki kurulum modalı devralır.
  if (!active) {
    return null;
  }
  return <Sidebar profiles={profiles} initialCollapsed={kapali} />;
}

// Layout artık SENKRON (top-level await yok) → kabuk ilk byte'ta stream edilir.
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="panel-shell">
      {/* Girişten sonra (oturum başına bir kez) güvenlik: yeni cihaz/konum bildirimi */}
      <LoginReporter />
      {/* Canlı aktiflik: panel görünürken last_seen'i tazeler (admin paneli buradan okur) */}
      <Heartbeat />
      {/* Hesap kalıcı kapatıldıysa (sunucuda silindiyse) oturumu kapat + girişe at */}
      <AccountStatusGuard />
      {/* Uygulama geneli bildirim + onay kutusu sistemi */}
      <ToastHost />
      <ConfirmProvider />
      {/* Profiller stream edilir → kabuk beklemeden boyanır */}
      <Suspense fallback={null}>
        <ProfileSidebar />
      </Suspense>
      <div className="panel-main">
        <header className="panel-topbar">
          <div className="panel-topbar-actions">
            {/* Yalnız bildirim (sağda). Ayarlar sol menüde; AI Sohbet butonu işlevsizdi → kaldırıldı. */}
            <NotificationBell />
          </div>
        </header>
        <div className="panel-content">{children}</div>
      </div>
    </div>
  );
}
