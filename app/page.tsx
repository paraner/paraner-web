import Link from "next/link";
import Background from "./components/Background";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import AuthCube3D from "./components/AuthCube3D";
import HeroTitle from "./components/HeroTitle";
import Beams from "./components/Beams";
import BeamInput from "./components/BeamInput";
import StoreBadges from "./components/StoreBadges";
import GoogleOneTap from "./components/GoogleOneTap";

// ─── İçerik verisi (kolay düzenlenebilsin diye dosyanın başında) ───

const FEATURES = [
  { icon: "📊", title: "Gelir & Gider Takibi", desc: "Her kuruşu kategorilere ayır, nereye gittiğini anında gör." },
  { icon: "🎯", title: "Birikim Hedefleri", desc: "Ev, araba, tatil… Hedef koy, ilerlemeni takip et." },
  { icon: "🤖", title: "Parla — AI Asistan", desc: "“Bu ay ne kadar harcadım?” diye sor, yapay zeka cevaplasın." },
  { icon: "🧾", title: "Fiş Tarama", desc: "Fişin fotoğrafını çek, tutar ve kategori otomatik dolsun." },
  { icon: "💱", title: "Döviz & Altın", desc: "Canlı kurlar, hesap makinesi ve çevirici cebinde." },
  { icon: "🏢", title: "İşletme Modülü", desc: "Fatura, stok, çalışan, KDV — esnaf işleri tek yerde." },
];

const PLANS = [
  {
    name: "Free",
    tag: "Uygulamayı tanımak ve başlangıç bütçesi için.",
    amount: "₺0",
    period: "sonsuza dek ücretsiz",
    featured: false,
    features: ["Sınırsız gelir/gider", "20 hazır kategori", "1 birikim hedefi", "5 fiş tarama / ay"],
  },
  {
    name: "Plus",
    tag: "Bütçesini kontrol altına almak isteyen bireyler için.",
    amount: "₺129",
    period: "/ay · 7 gün ücretsiz deneme",
    featured: true,
    features: ["Sınırsız hedef & bütçe", "AI chat asistanı", "Sınırsız fiş tarama", "Detaylı raporlar"],
  },
  {
    name: "İşletme Pro",
    tag: "Esnaf ve KOBİ'ler için tam finans yönetimi.",
    amount: "₺349",
    period: "/ay · 7 gün ücretsiz deneme",
    featured: false,
    features: ["Fatura & teklif", "Stok & ürün takibi", "Çalışan & maaş", "KDV & vergi raporları"],
  },
];

export default function Home() {
  return (
    <>
      <GoogleOneTap />
      <Background />
      <Nav />

      {/* ─── HERO / BANNER ─── */}
      <section className="hero-banner">
      <div className="hero-fx">
        <Beams
          beamWidth={1}
          beamHeight={15}
          beamNumber={12}
          lightColor="#9aa0a6"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
        />
      </div>
      <div className="hero wrap">
        <div className="hero-text">
          <span className="eyebrow">AI Destekli Finans Asistanı</span>
          <HeroTitle />
          <p className="hero-sub">
            Kişisel ve işletme finanslarını tek yerden yönet. Bütçe yap, hedef koy,
            yapay zeka koçun Parla ile akıllı kararlar al.
          </p>
          <div className="hero-cta">
            <BeamInput />
          </div>

          <StoreBadges />
        </div>

        <div className="hero-visual">
          <AuthCube3D className="hero-cube" playIntro zoom={1.28} />
        </div>
      </div>
      </section>

      {/* ─── ÖZELLİKLER ─── */}
      <section id="ozellikler" className="section wrap">
        <div className="section-head">
          <h2>Tek uygulama, her şey kontrol altında</h2>
          <p>Günlük harcamadan işletme faturasına kadar finansının tamamı.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-ico">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FİYATLAR ─── */}
      <section id="fiyatlar" className="section wrap">
        <div className="section-head">
          <h2>Sana uygun bir plan var</h2>
          <p>Ücretsiz başla, ihtiyacın büyüdükçe yükselt. Taahhüt yok.</p>
        </div>
        <div className="price-grid">
          {PLANS.map((p) => (
            <div className={`price-card${p.featured ? " featured" : ""}`} key={p.name}>
              {p.featured && <span className="price-badge">En Popüler</span>}
              <div className="price-name">{p.name}</div>
              <div className="price-tag">{p.tag}</div>
              <div className="price-amount">{p.amount}</div>
              <div className="price-period">{p.period}</div>
              <ul className="price-features">
                {p.features.map((feat) => (
                  <li key={feat}>{feat}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA BAND ─── */}
      <section className="wrap">
        <div className="cta-band">
          <h2>Bugün başla, geleceğini yönet</h2>
          <p>Dakikalar içinde hesabını oluştur, paranı kontrol altına al.</p>
          <Link href="/kayit" className="btn btn-primary btn-lg">Ücretsiz Hesap Oluştur</Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
