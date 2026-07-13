import Logo from "./Logo";
import FooterShader from "./FooterShader";

// Alt bilgi — logo, yasal linkler, telif
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <FooterShader />
      <div className="footer-inner">
        <div>
          <Logo />
          <p className="footer-copy">Paranı yönet, geleceğini kur.</p>
        </div>
        <div className="footer-links">
          <a href="/isletme">İşletme</a>
          <a href="/bireysel">Bireysel</a>
          <a href="/#ozellikler">Özellikler</a>
          <a href="/#fiyatlar">Fiyatlar</a>
          <a href="/destek">Destek</a>
          <a href="/giris">Giriş Yap</a>
          <a href="/kayit">Kayıt Ol</a>
          <a href="/gizlilik">Gizlilik</a>
        </div>
      </div>
      <div className="footer-inner" style={{ marginTop: 24 }}>
        <p className="footer-copy">© {year} Paraner · MGZR LLC · Tüm hakları saklıdır.</p>
      </div>
    </footer>
  );
}
