"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import StoreBadges from "./StoreBadges";
import { SEGMENTS, type SegmentMenu } from "./navData";

// Üst bar — masaüstünde banner'a gömülü; kaydırınca iOS Liquid Glass pill'e döner.
// Mobilde pill YOK: sade bar (wordmark + ☰) + ☰'a basınca tam ekran menü (Resend tarzı).
// `solid`: hero banner'ı olmayan sayfalarda en baştan pill durumu.
//
// Mega-menü (Resend deseni): İşletme/Bireysel tetikleyicisine gelince altında panel açılır —
// solda o segmentin sayfa linkleri, sağda vurgu kartları. Tetikleyiciye TIKLAMAK segment
// sayfasına götürür (/isletme, /bireysel).
export default function Nav({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(solid);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSeg, setOpenSeg] = useState<string | null>(null); // açık mega-menü
  const [mobileSeg, setMobileSeg] = useState<string | null>(null); // mobil akordeon
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  // Bulunulan sayfa parlak görünsün
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

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

  // Mobil menü açıkken arka plan kaymasın + Esc ile kapat (Esc mega-menüyü de kapatır)
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setOpenSeg(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Rota değişince açık menüler kapansın
  useEffect(() => {
    setOpenSeg(null);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // Hover kapanışında kısa gecikme: imleç tetikleyiciden panele geçerken menü kapanmasın
  const openSegNow = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenSeg(key);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenSeg(null), 160);
  };

  const close = () => setMenuOpen(false);

  return (
    <>
      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <Logo spinning active={scrolled} />

          <nav className="nav-links">
            {SEGMENTS.map((seg) => (
              <SegmentTrigger
                key={seg.key}
                seg={seg}
                open={openSeg === seg.key}
                active={isActive(seg.href)}
                onOpen={() => openSegNow(seg.key)}
                onClose={scheduleClose}
              />
            ))}
            <a href="/#ozellikler">Özellikler</a>
            <a href="/#fiyatlar">Fiyatlar</a>
            <Link
              href="/destek"
              className={isActive("/destek") ? "active" : undefined}
              aria-current={isActive("/destek") ? "page" : undefined}
            >
              Destek
            </Link>
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
            {/* Segmentler mobilde akordeon: başlığa bas → alt linkler açılır */}
            {SEGMENTS.map((seg) => {
              const open = mobileSeg === seg.key;
              return (
                <div key={seg.key} className="mm-group">
                  <button
                    className={`mm-row mm-row-btn${open ? " open" : ""}`}
                    aria-expanded={open}
                    onClick={() => setMobileSeg(open ? null : seg.key)}
                  >
                    {seg.label}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {open && (
                    <div className="mm-sub">
                      <Link href={seg.href} className="mm-sub-all" onClick={close}>
                        {seg.label} sayfasına git
                      </Link>
                      {seg.links.map((l) => (
                        <Link key={l.href} href={l.href} className="mm-sub-row" onClick={close}>
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <a href="/#ozellikler" className="mm-row" onClick={close}>
              Özellikler
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </a>
            <a href="/#fiyatlar" className="mm-row" onClick={close}>
              Fiyatlar
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </a>
            <Link
              href="/destek"
              className={`mm-row${isActive("/destek") ? " active" : ""}`}
              aria-current={isActive("/destek") ? "page" : undefined}
              onClick={close}
            >
              Destek
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          </nav>

          <div className="mm-stores">
            <StoreBadges />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Mega-menü tetikleyicisi + paneli ───
// Tetikleyici <Link>: tıklayınca segment sayfasına gider, hover'da panel açılır.
// Panel tetikleyiciyle AYNI sarmalayıcının içinde → imleç aşağı inerken mouseleave tetiklenmez.
function SegmentTrigger({
  seg,
  open,
  active,
  onOpen,
  onClose,
}: {
  seg: SegmentMenu;
  open: boolean;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="nav-seg"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onFocus={onOpen}
      onBlur={onClose}
    >
      <Link
        href={seg.href}
        className={`nav-seg-trigger${active ? " active" : ""}${open ? " open" : ""}`}
        aria-expanded={open}
        aria-current={active ? "page" : undefined}
      >
        {seg.label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </Link>

      <div className={`nav-panel${open ? " open" : ""}`} role="menu" aria-label={seg.label}>
        <div className="nav-panel-inner">
          <div className="np-links">
            {seg.links.map((l) => (
              <Link key={l.href} href={l.href} className="np-link" role="menuitem">
                <span className="np-link-label">{l.label}</span>
                <span className="np-link-desc">{l.desc}</span>
              </Link>
            ))}
          </div>

          <div className="np-cards">
            {seg.cards.map((c) => (
              <Link key={c.title} href={c.href} className="np-card" role="menuitem">
                <span className="np-card-art" aria-hidden="true" />
                <span className="np-card-title">{c.title}</span>
                <span className="np-card-desc">{c.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
