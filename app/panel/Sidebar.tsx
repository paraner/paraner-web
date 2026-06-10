"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { profileAvatarUrl, type ActiveProfile } from "../../lib/supabase/profileShared";
import Avatar from "../../components/ui/Avatar";

const COLLAPSE_KEY = "paraner-sidebar-collapsed";

// Basit, çizgisel ikonlar (harici kütüphane yok)
const icons = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
  ),
  transactions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h13M7 7l3-3M7 7l3 3"/><path d="M17 17H4m13 0-3-3m3 3-3 3"/></svg>
  ),
  accounts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/></svg>
  ),
  invoices: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21z"/><path d="M14 2.5V7h4M9 13h6M9 17h6"/></svg>
  ),
  contacts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><path d="M16 5.5a3 3 0 0 1 0 6M18 20c0-2.4-1-4.3-2.5-5.2"/></svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 13.4H4a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V6.6c.3.7 1 1.2 1.7 1.2H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.1z"/></svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v.5"/><path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 11h-4a2 2 0 0 0 0 4h4z"/></svg>
  ),
};

type Item = { label: string; href: string; icon: React.ReactNode };
type Group = { label: string | null; items: Item[] };

export default function Sidebar({ profiles }: { profiles: ActiveProfile[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const active = profiles.find((p) => p.is_active) ?? profiles[0] ?? null;
  const isBusiness = active?.profile_type === "business";

  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Daralt/genişlet tercihini hatırla (localStorage). Sunucu hep "açık" render eder,
  // tarayıcıda okunur → hydration uyumlu.
  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
    setMenuOpen(false);
  }

  const typeLabel = (t: string | null | undefined) =>
    t === "business" ? "İşletme" : "Bireysel";

  async function switchTo(p: ActiveProfile) {
    if (p.is_active || switching) return;
    setSwitching(true);
    setMenuOpen(false);
    const ids = profiles.map((x) => x.id);
    await supabase.from("profiles").update({ is_active: false }).in("id", ids);
    await supabase.from("profiles").update({ is_active: true }).eq("id", p.id);
    router.push("/panel");
    router.refresh();
  }

  // Menü grupları (profil tipine göre)
  const groups: Group[] = [
    {
      label: null,
      items: [
        { label: "Genel Bakış", href: "/panel", icon: icons.overview },
        { label: "İşlemler", href: "/panel/islemler", icon: icons.transactions },
        { label: "Hesaplar", href: "/panel/hesaplar", icon: icons.accounts },
        ...(!isBusiness
          ? [{ label: "Cüzdanım", href: "/panel/cuzdanim", icon: icons.wallet }]
          : []),
      ],
    },
    ...(isBusiness
      ? [
          {
            label: "İŞLETME",
            items: [
              { label: "Faturalar", href: "/panel/faturalar", icon: icons.invoices },
              { label: "Cariler", href: "/panel/cariler", icon: icons.contacts },
            ],
          },
        ]
      : []),
  ];

  const canSwitch = profiles.length > 1;

  return (
    <aside className={`panel-sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="panel-brand">
        {/* Açık: tam PARANER wordmark · Daraltılmış: aynı wordmark'tan kırpılmış temiz P.
            P birebir aynı (aynı kaynak), A sızması/kesilme olmaz. */}
        <Image
          src="/paraner-wordmark.png"
          alt="Paraner"
          width={118}
          height={24}
          className="brand-full"
          priority
        />
        <Image
          src="/paraner-p.png"
          alt="Paraner"
          width={19}
          height={24}
          className="brand-mini"
          priority
        />
      </div>

      {/* Profil değiştirici */}
      {active && (
        <div className="profile-switch">
          <button
            type="button"
            className="profile-switch-btn"
            onClick={() => canSwitch && setMenuOpen((o) => !o)}
            disabled={!canSwitch || switching}
            aria-expanded={menuOpen}
            title={collapsed ? active.profile_name ?? "Profil" : undefined}
          >
            <Avatar name={active.profile_name} url={profileAvatarUrl(active)} />
            <span className="profile-switch-info">
              <span className="profile-switch-name">
                {active.profile_name ?? "Profil"}
              </span>
              <span className="profile-switch-type">
                {typeLabel(active.profile_type)}
              </span>
            </span>
            {canSwitch && (
              <svg className="profile-switch-chev" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1.5 6 6.5l5-5" />
              </svg>
            )}
          </button>

          {menuOpen && canSwitch && (
            <div className="profile-switch-menu">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`profile-switch-opt${p.is_active ? " active" : ""}`}
                  onClick={() => switchTo(p)}
                >
                  <Avatar name={p.profile_name} url={profileAvatarUrl(p)} small />
                  <span className="profile-switch-info">
                    <span className="profile-switch-name">
                      {p.profile_name ?? "Profil"}
                    </span>
                    <span className="profile-switch-type">
                      {typeLabel(p.profile_type)}
                    </span>
                  </span>
                  {p.is_active && <span className="profile-switch-dot" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className="panel-nav">
        {groups.map((g, gi) => (
          <div key={gi} className="nav-group">
            {g.label && <div className="nav-group-label">{g.label}</div>}
            {g.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`panel-nav-item${pathname === item.href ? " active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}

        {/* Ayarlar — en altta sabit */}
        <Link
          href="/panel/ayarlar"
          className={`panel-nav-item nav-bottom${pathname === "/panel/ayarlar" ? " active" : ""}`}
          title={collapsed ? "Ayarlar" : undefined}
        >
          {icons.settings}
          <span className="nav-label">Ayarlar</span>
        </Link>
      </nav>

      {/* Daralt / genişlet */}
      <button
        type="button"
        className="sidebar-toggle"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        title={collapsed ? "Genişlet" : "Daralt"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        <span className="nav-label">Menüyü daralt</span>
      </button>
    </aside>
  );
}

