"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

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

type Item = {
  label: string;
  href: string;
  icon: React.ReactNode;
  enabled: boolean;
};

export default function Sidebar({ profileType }: { profileType: string | null }) {
  const pathname = usePathname();
  const isBusiness = profileType === "business";

  const items: Item[] = [
    { label: "Genel Bakış", href: "/panel", icon: icons.overview, enabled: true },
    { label: "İşlemler", href: "/panel/islemler", icon: icons.transactions, enabled: true },
    { label: "Hesaplar", href: "/panel/hesaplar", icon: icons.accounts, enabled: true },
    ...(!isBusiness
      ? [{ label: "Cüzdanım", href: "/panel/cuzdanim", icon: icons.wallet, enabled: true }]
      : []),
    ...(isBusiness
      ? [
          { label: "Faturalar", href: "/panel/faturalar", icon: icons.invoices, enabled: true },
          { label: "Cariler", href: "/panel/cariler", icon: icons.contacts, enabled: true },
        ]
      : []),
    { label: "Ayarlar", href: "/panel/ayarlar", icon: icons.settings, enabled: true },
  ];

  return (
    <aside className="panel-sidebar">
      <div className="panel-brand">
        <Image src="/paraner-logo.png" alt="Paraner" width={26} height={26} />
        <span>Paraner</span>
      </div>
      <nav className="panel-nav">
        {items.map((item) =>
          item.enabled ? (
            <Link
              key={item.href}
              href={item.href}
              className={`panel-nav-item${pathname === item.href ? " active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ) : (
            <span key={item.href} className="panel-nav-item disabled">
              {item.icon}
              {item.label}
              <span className="panel-nav-soon">yakında</span>
            </span>
          )
        )}
      </nav>
    </aside>
  );
}
