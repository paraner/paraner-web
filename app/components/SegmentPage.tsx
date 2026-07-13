import Link from "next/link";
import Background from "./Background";
import Nav from "./Nav";
import Footer from "./Footer";
import StoreBadges from "./StoreBadges";

// /isletme ve /bireysel ortak şablonu. Her bölümün id'si nav mega-menüsündeki
// çapalarla eşleşir (navData.ts) — alt sayfalar açıldıkça oraya taşınacak.
export type Section = {
  id: string;
  title: string;
  body: string;
  bullets: string[];
};

export default function SegmentPage({
  eyebrow,
  title,
  lead,
  sections,
  ctaTitle,
  ctaText,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  sections: Section[];
  ctaTitle: string;
  ctaText: string;
}) {
  return (
    <>
      <Background />
      <Nav />

      <main className="segment">
        <header className="segment-head">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="segment-lead">{lead}</p>
          <div className="segment-cta">
            <Link href="/kayit" className="btn btn-primary btn-lg">Ücretsiz Başla</Link>
            <span className="segment-note">Kredi kartı gerekmez</span>
          </div>
          <StoreBadges />
        </header>

        <div className="segment-sections">
          {sections.map((s) => (
            <section id={s.id} key={s.id} className="seg-card">
              <h2>{s.title}</h2>
              <p>{s.body}</p>
              <ul>
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="cta-band segment-foot">
          <h2>{ctaTitle}</h2>
          <p>{ctaText}</p>
          <Link href="/kayit" className="btn btn-primary btn-lg">Ücretsiz Hesap Oluştur</Link>
        </section>
      </main>

      <Footer />
    </>
  );
}
