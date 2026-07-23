"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, LifeBuoy, UsersRound, Radio, ScrollText, Sparkles } from "lucide-react";
import LogoutButton from "../panel/LogoutButton";
import NavPending from "../components/NavPending";
import type { StaffRole } from "../../lib/adminGuard";

/* `unstable_dynamicOnHover` App Router Link'inde VAR ama next/link tip tanımına yansımamış
   → prop'u tipe tanıtan ince sarmalayıcı. (Müşteri panelindeki Sidebar ile AYNI desen.) */
const NavLink = Link as unknown as React.ComponentType<
  React.ComponentProps<typeof Link> & { unstable_dynamicOnHover?: boolean }
>;

const ITEMS: { href: string; label: string; icon: typeof Users; exact?: boolean; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  // Müşteri e-postalarını listeliyor → yalnız yönetici (sayfa da requireAdminPage ile korunuyor)
  { href: "/admin/canli", label: "Canlı Görünüm", icon: Radio, adminOnly: true },
  { href: "/admin/musteriler", label: "Müşteriler", icon: Users, adminOnly: true },
  { href: "/admin/destek", label: "Destek", icon: LifeBuoy },
  // Hesap bazlı AI maliyeti — müşteri e-postaları görünür → yalnız yönetici
  { href: "/admin/ai", label: "AI Kullanımı", icon: Sparkles, adminOnly: true },
  { href: "/admin/ekip", label: "Ekip", icon: UsersRound, adminOnly: true },
  // Kim neyi değiştirdi — müşteri e-postaları görünür → yalnız yönetici
  { href: "/admin/denetim", label: "Denetim Kaydı", icon: ScrollText, adminOnly: true },
];

export default function AdminSidebar({ role, email }: { role: StaffRole; email: string | null }) {
  const pathname = usePathname();
  const items = ITEMS.filter((it) => !it.adminOnly || role === "admin");

  return (
    <aside className="admin-sidebar">
      {/* Metin wordmark yerine müşteri panelindeki GÖRSEL wordmark (Mehmet, 2026-07-18):
          iki panelin markası aynı görünsün. Altında oturum açık hesap yazıyor. */}
      <div className="admin-brand">
        <Image
          src="/paraner-wordmark-titan.png"
          alt="Paraner"
          width={118}
          height={24}
          priority
        />
        {email && <span className="admin-brand-mail" title={email}>{email}</span>}
      </div>
      <nav className="admin-nav">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            /* ⚠️ `prefetch` (=true) BİLEREK KALDIRILDI — 2026-07-23 ölçümü.
               `prefetch={true}` = TAM rota + VERİSİ (next docs link.md:303). Menüdeki 7 link
               de görüş alanında olduğu için her mount'ta 7 ağır sunucu render'ı birden
               tetikleniyordu. Ölçüm (prod): eşzamanlı koşan bu rotalar 3-6 sn sürüyor,
               tek başına 0,1-1,1 sn — yani kapasite fiilen TEK isteği seri işliyor
               (Vercel Hobby + Supabase Free). Kullanıcı tam o sırada tıklayınca kendi sayfası
               kuyruğun arkasına düşüyordu: Destek 5 859 ms (docs/DONMA-TESHIS-2026-07-23.md).
               Prop'suz hâli `auto`: dinamik rotada YALNIZ `loading.tsx` sınırına kadar ucuz
               kabuk prefetch'i (ölçüm: 110-450 ms) → tıklamada iskelet ANINDA çıkar.
               Tam yük NİYETTE geliyor: `unstable_dynamicOnHover` hover'da VE DOKUNMADA
               (link.js:340-354 `onTouchStart` → `onNavigationIntent`) tek bir rotayı
               Full'e yükseltir. Yani bedel yalnız kullanıcının gerçekten istediği sayfa için
               ödeniyor, hepsi için değil. */
            <NavLink
              key={it.href}
              href={it.href}
              className={`admin-nav-item${active ? " active" : ""}`}
              unstable_dynamicOnHover
            >
              <Icon size={18} />
              <span>{it.label}</span>
              {/* Tıklama anında içerik alanına gösterge (prefetch bayatsa loading.tsx gelmez) */}
              <NavPending />
            </NavLink>
          );
        })}
      </nav>
      <div className="admin-foot">
        <span className="admin-role-chip">{role === "admin" ? "Yönetici" : "Destek Ekibi"}</span>
        <LogoutButton variant="nav" />
      </div>
    </aside>
  );
}
