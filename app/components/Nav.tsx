"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";

// Üst bar — banner'a gömülü; kullanıcı kaydırınca (scrollY > 30) iOS Liquid Glass
// pill'ine dönüşür (.scrolled). `solid`: hero banner'ı olmayan sayfalarda (ör. /gizlilik)
// en baştan pill durumunda kalsın.
export default function Nav({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(solid);

  useEffect(() => {
    if (solid) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll(); // sayfa kayıtlı pozisyonda açılırsa doğru başla
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [solid]);

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
      </div>
    </header>
  );
}
