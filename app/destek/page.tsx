import type { Metadata } from "next";
import Link from "next/link";
import Background from "../components/Background";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Destek",
  description:
    "Paraner destek merkezi: sıkça sorulan sorular, WhatsApp ve e-posta desteği. Hesap, abonelik, işletme paneli ve veri güvenliği hakkında yanıtlar.",
  alternates: { canonical: "/destek" },
};

// SSS — mobil app/help.tsx ile aynı dili konuşur (oradaki 6 soru + web'e özgü olanlar).
// Değişirse mobil tarafı da gözden geçir. Yanıtlar DÜRÜST olmalı: yapmadığımız şeyi vaat etme.
const FAQ = [
  {
    q: "Paraner nedir, kimler için uygun?",
    a: "Paraner; gelir-gider takibi, bütçe, birikim hedefleri ve yapay zeka finans koçu Parla'yı tek yerde sunar. Bireysel kullanıcıların yanında esnaf ve KOBİ'ler için fatura, teklif, stok, çalışan ve KDV takibi içeren bir işletme paneli de vardır.",
  },
  {
    q: "Web ve mobil aynı hesap mı?",
    a: "Evet. Web panelinde (app.paraner.com) yaptığınız her kayıt mobil uygulamada, mobilde yaptığınız her kayıt web'de görünür. Tek hesap, tek veri.",
  },
  {
    q: "Ücretsiz kullanabilir miyim?",
    a: "Evet. Free planda sınırsız gelir-gider kaydı, hazır kategoriler ve bir birikim hedefi süresiz ücretsizdir. Plus ve İşletme Pro planları 7 gün ücretsiz denemeyle başlar.",
  },
  {
    q: "İşletme panelinde neler var?",
    a: "Fatura ve teklif, cari hesaplar, stok ve ürün, çalışan ve maaş, çek-senet, veresiye, bütçe, KDV ve vergi takvimi, nakit akışı ile kâr-zarar raporları. Ayrıca Cüzdanım ile altın ve döviz varlıklarınızı canlı kurlarla takip edebilirsiniz.",
  },
  {
    q: "e-Fatura / e-Arşiv gönderebilir miyim?",
    a: "Şu anda Paraner fatura ve teklif oluşturmayı, KDV takibini ve raporlamayı destekliyor. GİB e-Fatura/e-Arşiv entegrasyonu yol haritamızda; hazır olduğunda buradan duyuracağız.",
  },
  {
    q: "Parla nasıl çalışır?",
    a: "Parla, harcama alışkanlıklarınızı analiz edip size özel öneriler sunar. Ücretsiz planda günde 5 mesaj, Plus planda sınırsız mesaj hakkınız vardır.",
  },
  {
    q: "Verilerim güvenli mi?",
    a: "Tüm verileriniz şifreli olarak saklanır ve iletişim SSL/TLS ile korunur. Verileriniz üçüncü taraflarla pazarlama amacıyla paylaşılmaz. Ayrıntı için Gizlilik Politikası sayfamıza bakabilirsiniz.",
  },
  {
    q: "Aboneliğimi nasıl iptal ederim?",
    a: "Mobil uygulamada Profil › Hesabım › Plan Detay sayfasından iptal edebilirsiniz. İptal, içinde bulunduğunuz dönemin sonunda geçerli olur; dönem bitene kadar kullanmaya devam edersiniz.",
  },
  {
    q: "Hesabımı nasıl silerim?",
    a: "Web panelinde Ayarlar › Hesap & Güvenlik bölümünden, mobilde Profil sayfasından hesabınızı kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz ve tüm verileriniz silinir.",
  },
];

const WHATSAPP = "905322379909";
const WHATSAPP_LABEL = "+90 532 237 99 09";
const EMAIL = "destek@paraner.com";

const SOCIAL = [
  { label: "LinkedIn", url: "https://linkedin.com/company/paraner" },
  { label: "Instagram", url: "https://instagram.com/paranerapp" },
  { label: "TikTok", url: "https://tiktok.com/@paranercom" },
  { label: "Facebook", url: "https://facebook.com/paranercom" },
];

// Google'ın SSS'yi arama sonucunda akordeon olarak göstermesi için yapısal veri
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Destek() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Background />
      <Nav />

      <main className="support">
        <header className="support-head">
          <span className="eyebrow">Destek</span>
          <h1>Nasıl yardımcı olabiliriz?</h1>
          <p className="support-lead">
            Aşağıdaki sorularda aradığınızı bulamazsanız bize doğrudan yazın — gerçek bir
            insan yanıtlar.
          </p>
        </header>

        {/* ─── SSS (JS'siz akordeon: <details>) ─── */}
        <section className="support-faq" aria-labelledby="sss">
          <h2 id="sss">Sıkça sorulan sorular</h2>
          {FAQ.map((f) => (
            <details className="faq-item" key={f.q}>
              <summary>
                {f.q}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        {/* ─── İLETİŞİM ─── */}
        <section className="support-contact" aria-labelledby="iletisim">
          <h2 id="iletisim">Hâlâ sorunuz mu var?</h2>
          <div className="contact-grid">
            <a className="contact-card" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
              <span className="contact-kind">WhatsApp</span>
              <span className="contact-value">{WHATSAPP_LABEL}</span>
              <span className="contact-note">En hızlı yanıt — yazın, dönelim.</span>
            </a>
            <a className="contact-card" href={`mailto:${EMAIL}`}>
              <span className="contact-kind">E-posta</span>
              <span className="contact-value">{EMAIL}</span>
              <span className="contact-note">Ayrıntılı sorular ve ekran görüntüleri için.</span>
            </a>
          </div>

          <div className="support-social">
            <span>Bizi takip edin:</span>
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            ))}
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="cta-band support-cta">
          <h2>Paraner&apos;ı ücretsiz deneyin</h2>
          <p>Dakikalar içinde hesabınızı oluşturun. Kredi kartı gerekmez.</p>
          <Link href="/kayit" className="btn btn-primary btn-lg">Ücretsiz Hesap Oluştur</Link>
        </section>
      </main>

      <Footer />
    </>
  );
}
