import type { Metadata } from "next";
import Background from "../components/Background";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "Paraner gizlilik politikası: verilerinizin nasıl toplandığı, kullanıldığı ve korunduğu, Parla'nın veri işlemesi ve KVKK kapsamındaki haklarınız.",
  alternates: { canonical: "/gizlilik" },
};

// Gizlilik metnini tek yerde tut — mobil app/privacy.tsx ile eşleşmeli (değişirse ikisi de güncellenir).
const SECTIONS = [
  {
    title: "Toplanan Veriler",
    body: "Paraner, hesap oluşturma sırasında verdiğiniz ad, e-posta ve finansal bilgilerinizi toplar. Harcama, gelir ve birikim verileriniz yalnızca size özel analizler sunmak için kullanılır.",
  },
  {
    title: "Verilerin Kullanımı",
    body: "Toplanan veriler yalnızca uygulama içerisindeki hizmetleri sunmak, Parla önerilerini kişiselleştirmek ve uygulama deneyimini iyileştirmek amacıyla kullanılır. Verileriniz üçüncü taraflarla pazarlama amacıyla paylaşılmaz.",
  },
  {
    title: "Veri Güvenliği",
    body: "Tüm verileriniz Supabase altyapısı üzerinde şifreli olarak saklanır. İletişim SSL/TLS ile korunur. Ödeme bilgileri doğrudan RevenueCat tarafından işlenir, sunucularımızda saklanmaz.",
  },
  {
    title: "Parla ve Veri İşleme",
    body: "Parla, harcama verilerinizi analiz etmek için Google Gemini ve Anthropic Claude API hizmetlerini kullanır. Gönderilen veriler anonim olarak işlenir ve bu hizmetler tarafından model eğitimi için kullanılmaz.",
  },
  {
    title: "Çerezler ve Analitik",
    body: "Mobil uygulama, kullanıcı deneyimini iyileştirmek için cihazda yerel depolama (AsyncStorage) kullanır. Web sitemiz yalnızca oturumunuzu açık tutmak için zorunlu güvenlik çerezleri kullanır; üçüncü taraf reklam veya analitik araçları kullanmaz.",
  },
  {
    title: "Haklarınız",
    body: "Verilerinize erişim talep edebilir, düzeltme isteyebilir veya hesabınızı silerek tüm verilerinizin kalıcı olarak silinmesini sağlayabilirsiniz. Hesap silme işlemi uygulama içindeki Profil sayfasından yapılabilir.",
  },
];

export default function GizlilikPage() {
  return (
    <>
      <Background />
      <Nav solid />

      <main className="legal">
        <div className="legal-head">
          <h1>Gizlilik Politikası</h1>
          <p className="legal-updated">Son güncelleme: 19.06.2026</p>
          <p className="legal-lead">
            Paraner olarak gizliliğinize önem veriyoruz. Bu politika, verilerinizin
            nasıl toplandığı, kullanıldığı ve korunduğuyla ilgili bilgiler içerir.
          </p>
        </div>

        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}

        <section>
          <h2>KVKK — Türkiye'deki Kullanıcılar</h2>
          <p>
            Türkiye'den eriştiyseniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu
            (KVKK) kapsamında haklarınız saklıdır. Veri sorumlusu MGZR LLC'dir. KVKK
            m.11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, bilgi talep
            etme, düzeltilmesini, silinmesini veya yok edilmesini isteme ve işlemenin
            yalnızca otomatik sistemlerle analizine itiraz etme haklarına sahipsiniz.
            Hizmetin sunulması için verileriniz Supabase (altyapı) ve Google Gemini /
            Anthropic Claude (yapay zekâ) aracılığıyla yurt dışında işlenebilir; bu
            veriler model eğitimi için kullanılmaz. Taleplerinizi{" "}
            <a href="mailto:destek@paraner.com">destek@paraner.com</a> adresine
            iletebilirsiniz.
          </p>
        </section>

        <section>
          <h2>İletişim</h2>
          <p>
            Gizlilik ile ilgili sorularınız için{" "}
            <a href="mailto:destek@paraner.com">destek@paraner.com</a> adresinden bize
            ulaşabilirsiniz.
          </p>
        </section>

        <p className="legal-foot">MGZR LLC · destek@paraner.com</p>
      </main>

      <Footer />
    </>
  );
}
