"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import StoreBadges from "./StoreBadges";
import { SEGMENTS, type SegmentMenu } from "./navData";

// Üst bar — masaüstünde banner'a gömülü; kaydırınca iOS Liquid Glass pill'e döner.
// Mobilde pill YOK: sade bar (wordmark + ☰) + tam ekran menü.
// `solid`: hero banner'ı olmayan sayfalarda en baştan pill durumu.
//
// MEGA-MENÜ (Resend deseni — ölçülerek kopyalandı):
// TEK panel var, her tetikleyicinin ayrı paneli YOK. Menüler arası geçerken panel
// kapanmaz: konumu (left) ve boyutu (width/height) içeriğe göre ANİMASYONLA değişir,
// içerik ise geliş yönüne göre kayarak yer değiştirir. Resend bunu --positioner-width/
// --positioner-height + transition:all ile yapıyor; aynı yaklaşım.
export default function Nav({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(solid);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSeg, setOpenSeg] = useState<string | null>(null);
  const [mobileSeg, setMobileSeg] = useState<string | null>(null);

  // Panel geometrisi: sadece ölçülen içerik boyutları (konum sabit — ortada)
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const [morph, setMorph] = useState(false); // panel zaten açıkken geçiş → animasyonlu

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linksRef = useRef<HTMLElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const openIdx = openSeg ? SEGMENTS.findIndex((s) => s.key === openSeg) : -1;

  // İçerik kutularının doğal boyutunu bir kez ölç (panel bunlara göre büyüyüp küçülecek)
  useLayoutEffect(() => {
    const next: Record<string, { w: number; h: number }> = {};
    for (const seg of SEGMENTS) {
      const el = contentRefs.current[seg.key];
      if (el) next[seg.key] = { w: el.scrollWidth, h: el.scrollHeight };
    }
    setSizes(next);
  }, []);

  // Panel KONUMU SABİT: her zaman ekranın ortasında durur, tetikleyiciye göre KAYMAZ.
  // (Resend ölçüldü: 1440px ekranda panel merkezi tetikleyici 469'da da 915'te de
  // hep 720 = ekran ortası. Yalnızca genişlik/yükseklik değişiyor, merkeze simetrik.)
  // Ortalama CSS'te: .nav-panel { left:50%; transform: translateX(-50%) } — .nav-links
  // zaten ekran ortasında hizalı olduğundan referans doğru.

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

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      closeNow();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Rota değişince açık menüler kapansın
  useEffect(() => {
    closeNow();
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  function openSegNow(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    // Panel zaten açıksa geçiş morph olsun (kapanıp açılmasın); kapalıysa yerinde belirsin
    setMorph((prev) => (openSeg !== null ? true : prev === true ? true : false));
    if (openSeg !== null && openSeg !== key) setMorph(true);
    else if (openSeg === null) setMorph(false);
    setOpenSeg(key);
  }
  function closeNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenSeg(null);
    setMorph(false);
  }
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => closeNow(), 160);
  }

  const close = () => setMenuOpen(false);
  const size = openSeg ? sizes[openSeg] : undefined;

  return (
    <>
      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <Logo spinning active={scrolled} />

          <nav
            className="nav-links"
            ref={linksRef}
            onMouseLeave={scheduleClose}
          >
            {SEGMENTS.map((seg) => (
              <Link
                key={seg.key}
                href={seg.href}
                ref={(el) => { triggerRefs.current[seg.key] = el; }}
                className={`nav-seg-trigger${isActive(seg.href) ? " active" : ""}${openSeg === seg.key ? " open" : ""}`}
                aria-expanded={openSeg === seg.key}
                aria-current={isActive(seg.href) ? "page" : undefined}
                onMouseEnter={() => openSegNow(seg.key)}
                onFocus={() => openSegNow(seg.key)}
              >
                {seg.label}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </Link>
            ))}

            <a href="/#ozellikler" onMouseEnter={scheduleClose}>Özellikler</a>
            <a href="/#fiyatlar" onMouseEnter={scheduleClose}>Fiyatlar</a>
            <Link
              href="/destek"
              className={isActive("/destek") ? "active" : undefined}
              aria-current={isActive("/destek") ? "page" : undefined}
              onMouseEnter={scheduleClose}
            >
              Destek
            </Link>

            {/* ─── TEK PANEL (positioner): konum + boyut animasyonlu ─── */}
            <div
              className={`nav-panel${openSeg ? " open" : ""}${morph ? " morph" : ""}`}
              style={size ? { width: size.w, height: size.h } : undefined}
              onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
              onMouseLeave={scheduleClose}
            >
              <div className="nav-panel-surface">
                {SEGMENTS.map((seg, i) => {
                  const active = openSeg === seg.key;
                  // KAYDIRMA (Resend ölçüldü): solma yok. İmleç sağa giderse eski içerik
                  // tamamen sola süzülür, yeni içerik sağdan girer. Aktif olanın solundaki
                  // içerik -%100'de (panel dışı sol), sağındaki +%100'de bekler; panel
                  // overflow:hidden ile kırpar.
                  const offset = active ? 0 : openIdx < 0 ? (i === 0 ? 0 : 100) : i < openIdx ? -100 : 100;
                  return (
                    <div
                      key={seg.key}
                      ref={(el) => { contentRefs.current[seg.key] = el; }}
                      className={`np-content${active ? " active" : ""}`}
                      style={{ transform: `translateX(${offset}%)` }}
                      aria-hidden={!active}
                    >
                      <PanelContent seg={seg} tabbable={active} />
                    </div>
                  );
                })}
              </div>
            </div>
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

// Panel içeriği: solda linkler (2 sütun), sağda vurgu kartları
function PanelContent({ seg, tabbable }: { seg: SegmentMenu; tabbable: boolean }) {
  const tab = tabbable ? undefined : -1;
  return (
    <div className="np-inner">
      <div className="np-links">
        {seg.links.map((l) => (
          <Link key={l.href} href={l.href} className="np-link" tabIndex={tab}>
            <span className="np-link-label">{l.label}</span>
            <span className="np-link-desc">{l.desc}</span>
          </Link>
        ))}
      </div>
      <div className="np-cards">
        {seg.cards.map((c) => (
          <Link key={c.title} href={c.href} className="np-card" tabIndex={tab}>
            <span className="np-card-art" aria-hidden="true" />
            <span className="np-card-title">{c.title}</span>
            <span className="np-card-desc">{c.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
