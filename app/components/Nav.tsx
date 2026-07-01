"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import StoreBadges from "./StoreBadges";

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
    <>
      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <Logo spinning />
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
              <line x1="3" y1="6.5" x2="21" y2="6.5" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17.5" x2="21" y2="17.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* ─── MOBİL TAM EKRAN MENÜ — .nav DIŞINDA (backdrop-filter ata sorunu olmasın) ─── */}
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
            <StoreBadges />
          </div>
        </div>
      </div>
    </>
  );
}
