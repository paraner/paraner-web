"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";

// Üst bar — masaüstünde banner'a gömülü; kaydırınca iOS Liquid Glass pill'e döner.
// Mobilde pill YOK: sade bar (wordmark + ☰) + ☰'a basınca tam ekran menü (Resend tarzı).
// `solid`: hero banner'ı olmayan sayfalarda (ör. /gizlilik) en baştan pill durumu.
export default function Nav({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(solid);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (solid) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [solid]);

  // Menü açıkken arka plan kaymasın + Esc ile kapat
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="nav-inner">
        <Logo />
        <nav className="nav-links">
          <a href="/#ozellikler">Özellikler</a>
          <a href="/#fiyatlar">Fiyatlar</a>
        </nav>
        <div className="nav-actions">
          <Link href="/giris" className="btn btn-ghost">Giriş Yap</Link>
          <Link href="/kayit" className="btn btn-primary">Kayıt Ol</Link>
        </div>
        <button
          className="nav-burger"
          aria-label="Menü"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="7" x2="21" y2="7" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="17" x2="21" y2="17" />
          </svg>
        </button>
      </div>

      {/* ─── MOBİL TAM EKRAN MENÜ ─── */}
      <div id="mobile-menu" className={`mobile-menu${menuOpen ? " open" : ""}`} role="dialog" aria-modal="true">
        <div className="mm-head">
          <Logo />
          <button className="mm-close" aria-label="Kapat" onClick={close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mm-body">
          <Link href="/kayit" className="btn btn-primary mm-cta" onClick={close}>Kayıt Ol</Link>
          <Link href="/giris" className="mm-login" onClick={close}>Giriş Yap</Link>

          <nav className="mm-links">
            <a href="/#ozellikler" className="mm-row" onClick={close}>
              Özellikler
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </a>
            <a href="/#fiyatlar" className="mm-row" onClick={close}>
              Fiyatlar
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </a>
          </nav>

          <div className="mm-stores">
            <span className="mm-store" aria-label="App Store — yakında">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M16.365 1.43c0 1.14-.49 2.27-1.18 3.08-.74.9-1.99 1.57-2.98 1.57-.12 0-.23-.02-.3-.03-.02-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.2-2.98.8-.94 2.14-1.64 3.25-1.68.03.13.05.28.05.43zM21 17.14c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8C3.6 18.4 2.57 15.6 2.57 12.95c0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.68.95 3.6.95.87 0 2.22-1.01 3.9-1.01.61 0 2.89.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.96 4.45z" /></svg>
              <span className="mm-store-txt">
                <span className="mm-store-small">İndir</span>
                <span className="mm-store-big">App Store</span>
              </span>
            </span>
            <span className="mm-store" aria-label="Google Play — yakında">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M4 3.4v17.2a.8.8 0 0 0 1.2.7l14.3-8.6a.8.8 0 0 0 0-1.4L5.2 2.7A.8.8 0 0 0 4 3.4z" /></svg>
              <span className="mm-store-txt">
                <span className="mm-store-small">İndir</span>
                <span className="mm-store-big">Google Play</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
