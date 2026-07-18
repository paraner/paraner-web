"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, LifeBuoy, UsersRound, Radio, ScrollText, Sparkles } from "lucide-react";
import LogoutButton from "../panel/LogoutButton";
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

export default function AdminSidebar({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = ITEMS.filter((it) => !it.adminOnly || role === "admin");

  /* ⚠️ ADMIN YAVAŞLIĞININ SEBEBİ BUYDU (2026-07-18, Mehmet: "sayfalar arası geçiş yavaş").
     Müşteri panelinde 14.07'de çözülen mekanizma admin'e HİÇ uygulanmamıştı: menü düz
     <Link> kullanıyordu. next.config'teki dynamicOnHover + staleTimes AÇIK ama ikisi de
     LINK TARAFINDA OPT-IN ister — bayrak tek başına yetmiyor.

     Next 16'da <Link> DİNAMİK rotalarda yalnız loading sınırına kadar prefetch eder, SAYFA
     VERİSİNİ GETİRMEZ → tıklamada veri turu sıfırdan başlar (panelde ölçüm: 1554 ms + iskelet;
     ısıtılmış rota 14-26 ms). Admin sayfaları daha da ağır (listPeople auth API + profiller).

     İki katman birlikte:
     1) router.prefetch(kind:"full") → menüdeki TÜM admin rotaları peşin ısıtılır. Panelde
        "çekirdek 6 rota" seçmiştik çünkü orada 30+ link var; admin'de en fazla 7 rota var,
        hepsini ısıtmak ucuz ve dokunmatikte hover olmadığı için ŞART.
     2) unstable_dynamicOnHover → hover'da tam yüke yükselt (peşin ısıtma kaçarsa yedek).
     ⚠️ Prefetch DEV'de kapalıdır → etki yalnız prod'da ölçülür. */
  useEffect(() => {
    const t = setTimeout(() => {
      items.forEach((it) => {
        try {
          router.prefetch(it.href, { kind: "full" as never });
        } catch { /* prefetch başarısızsa sayfa yine normal açılır */ }
      });
    }, 300); // ilk boyamayı bloklamasın
    return () => clearTimeout(t);
    // items rol'e göre türüyor; role değişmedikçe referans değişse de içerik aynı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, role]);

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
            <NavLink
              key={it.href}
              href={it.href}
              className={`admin-nav-item${active ? " active" : ""}`}
              prefetch
              unstable_dynamicOnHover
            >
              <Icon size={18} />
              <span>{it.label}</span>
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
