import type { Metadata } from "next";
import SegmentPage, { type Section } from "../components/SegmentPage";

export const metadata: Metadata = {
  title: "Bireysel — Gelir-gider takibi, bütçe ve AI finans koçu",
  description:
    "Harcamalarınızı kategorilere ayırın, bütçe yapın, birikim hedefi koyun. Fiş tarama, döviz & altın takibi ve AI koçunuz Parla. Ücretsiz başlayın.",
  alternates: { canonical: "/bireysel" },
};

// Bölüm id'leri navData.ts'teki çapalarla eşleşir — değiştirirsen orayı da güncelle.
const SECTIONS: Section[] = [
  {
    id: "gelir-gider",
    title: "Gelir & Gider Takibi",
    body: "Her kuruşu kategorisine ayırın; paranızın nereye gittiğini tahmin etmeyi bırakın.",
    bullets: ["Hazır kategoriler + kendi kategoriniz", "Fiş ve fatura ekleyebilme", "Hesaplar arası transfer", "Aylık filtre ve arama"],
  },
  {
    id: "butce",
    title: "Bütçe",
    body: "Kategori bazlı limit koyun; sınıra yaklaştığınızda görün. Ay sonunda sürpriz olmasın.",
    bullets: ["Kategori bazlı bütçe", "Harcanan / kalan gösterimi", "Dönemsel takip"],
  },
  {
    id: "hedef",
    title: "Birikim Hedefleri",
    body: "Ev, araba, tatil… Hedefi koyun, ne kadar kaldığını görün. İlerleme sizi motive etsin.",
    bullets: ["Sınırsız hedef (Plus)", "İlerleme takibi", "Hedefe katkı kaydı"],
  },
  {
    id: "parla",
    title: "Parla — AI finans koçunuz",
    body: "“Bu ay ne kadar harcadım?”, “nerede tasarruf edebilirim?” diye sorun; Parla harcama alışkanlıklarınızı analiz edip yanıtlasın.",
    bullets: ["Doğal dille soru-cevap", "Kişiye özel tasarruf önerileri", "Ücretsiz planda günde 5 mesaj, Plus'ta sınırsız"],
  },
  {
    id: "fis",
    title: "Fiş Tarama",
    body: "Fişin fotoğrafını çekin; tutar ve kategori kendiliğinden dolsun. Elle giriş derdi bitsin.",
    bullets: ["Fotoğraftan otomatik doldurma", "Fiş ve belge saklama", "Ücretsiz planda 5 tarama / ay"],
  },
  {
    id: "doviz",
    title: "Döviz & Altın",
    body: "Altın ve döviz varlıklarınızı canlı kurlarla izleyin. Kâr-zararınız her an güncel.",
    bullets: ["Canlı kurlar", "Portföy değeri ve K/Z", "Ağırlıklı ortalama maliyet", "Alış-satış hareketleri"],
  },
  {
    id: "rapor",
    title: "Raporlar",
    body: "Nereye gitti sorusunun cevabı grafiklerde: kategori dağılımı, aylık trend, gelir-gider dengesi.",
    bullets: ["Kategori dağılımı", "Aylık trend grafiği", "Gelir-gider özeti"],
  },
  {
    id: "mobil",
    title: "Mobil uygulama",
    body: "iOS ve Android'de aynı hesap. Telefonda kaydettiğiniz harcama web'de, web'de yaptığınız kayıt telefonda.",
    bullets: ["iOS ve Android", "Web ile anlık senkron", "Tek hesap, tek veri"],
  },
];

export default function Bireysel() {
  return (
    <SegmentPage
      eyebrow="Bireysel"
      title="Paranızı yönetin, geleceğinizi kurun"
      lead="Gelir-gider takibi, bütçe, birikim hedefleri ve AI finans koçunuz Parla — hepsi tek uygulamada. Ücretsiz başlayın."
      sections={SECTIONS}
      ctaTitle="Bütçenizi kontrol altına alın"
      ctaText="Dakikalar içinde hesabınızı oluşturun. Kredi kartı gerekmez."
    />
  );
}
