import Link from "next/link";
import Logo from "./Logo";

// Üst menü — logo + bölüm linkleri + giriş/kayıt butonları
export default function Nav() {
  return (
    <header className="nav">
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
