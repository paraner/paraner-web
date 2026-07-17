"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, LifeBuoy, UsersRound, Radio, ScrollText } from "lucide-react";
import LogoutButton from "../panel/LogoutButton";
import type { StaffRole } from "../../lib/adminGuard";

const ITEMS: { href: string; label: string; icon: typeof Users; exact?: boolean; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  // Müşteri e-postalarını listeliyor → yalnız yönetici (sayfa da requireAdminPage ile korunuyor)
  { href: "/admin/canli", label: "Canlı Görünüm", icon: Radio, adminOnly: true },
  { href: "/admin/musteriler", label: "Müşteriler", icon: Users, adminOnly: true },
  { href: "/admin/destek", label: "Destek", icon: LifeBuoy },
  { href: "/admin/ekip", label: "Ekip", icon: UsersRound, adminOnly: true },
  // Kim neyi değiştirdi — müşteri e-postaları görünür → yalnız yönetici
  { href: "/admin/denetim", label: "Denetim Kaydı", icon: ScrollText, adminOnly: true },
];

export default function AdminSidebar({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const items = ITEMS.filter((it) => !it.adminOnly || role === "admin");

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        PARANER<span>Yönetim</span>
      </div>
      <nav className="admin-nav">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} className={`admin-nav-item${active ? " active" : ""}`}>
              <Icon size={18} />
              <span>{it.label}</span>
            </Link>
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
