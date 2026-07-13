import type { Metadata } from "next";
import SegmentPage, { type Section } from "../components/SegmentPage";

export const metadata: Metadata = {
  title: "İşletme — Esnaf ve KOBİ için ön muhasebe",
  description:
    "Fatura, cari, stok, çalışan, çek-senet ve KDV tek panelde. Esnaf ve KOBİ'ler için ön muhasebe: web ve mobilde aynı hesap. Ücretsiz başlayın.",
  alternates: { canonical: "/isletme" },
};

// Bölüm id'leri navData.ts'teki çapalarla eşleşir — değiştirirsen orayı da güncelle.
const SECTIONS: Section[] = [
  {
    id: "fatura",
    title: "Fatura & Teklif",
    body: "Faturayı dakikalar içinde kesin, teklifi müşteriye gönderin, tahsilatı takip edin. Numaralandırma otomatik ilerler, KDV kendiliğinden hesaplanır.",
    bullets: ["Satış ve alış faturası", "Taslak, gönderildi, ödendi durumları", "Vadesi geçenler tek bakışta", "Düzenli (abonelik) faturaları", "CSV dışa aktarma"],
  },
  {
    id: "cari",
    title: "Cari & Veresiye",
    body: "Müşteri ve tedarikçi bakiyelerini tek listede görün. Kim size, siz kime borçlusunuz — hep güncel.",
    bullets: ["Müşteri ve tedarikçi kartları", "Veresiye defteri", "Borç-alacak takibi", "Vade takibi ve mutabakat"],
  },
  {
    id: "stok",
    title: "Stok & Ürün",
    body: "Ürün kataloğunuzu bir kez tanımlayın; faturada ve teklifte tekrar yazmayın. Kritik stoğa düşen ürünler panoda işaretlenir.",
    bullets: ["Ürün ve hizmet kataloğu", "Kritik stok uyarısı", "Alış-satış fiyatı", "Stok hareketleri"],
  },
  {
    id: "calisan",
    title: "Çalışan & Maaş",
    body: "Personel özlük bilgisi, maaş ödemeleri ve izinler tek modülde. Ödeme yaptığınızda kasa/banka hareketine bağlanır.",
    bullets: ["Özlük kartları", "Maaş ve avans ödemeleri", "İzin & devamsızlık"],
  },
  {
    id: "cek",
    title: "Çek & Senet",
    body: "Aldığınız ve verdiğiniz çekleri vadesine göre izleyin. Hangi çek ne zaman, kime — nakit planınız şaşmaz.",
    bullets: ["Alınan ve verilen çekler", "Vade takvimi", "Tahsil, iade ve karşılıksız durumları"],
  },
  {
    id: "kdv",
    title: "KDV & Vergi",
    body: "Dönem KDV'nizi otomatik hesaplayın, vergi takvimini kaçırmayın. Hangi beyanname ne zaman — hep önünüzde.",
    bullets: ["Dönemsel KDV raporu", "Hesaplanan ve indirilecek KDV", "Vergi takvimi"],
  },
  {
    id: "rapor",
    title: "Raporlar",
    body: "Kâr mı ediyorsunuz, nakit ne zaman biter — tahmin etmeyin, görün.",
    bullets: ["Kâr-zarar", "Nakit akışı", "Gelir-gider raporu", "Bütçe takibi", "CSV dışa aktarma"],
  },
  {
    id: "kasa",
    title: "Kasa & Banka",
    body: "Banka hesapları ve kasa tek listede. Hesaplar arası transfer, çoklu para birimi desteğiyle.",
    bullets: ["Sınırsız hesap", "Hesaplar arası transfer", "30 para birimi", "Gerçek kart görselleri"],
  },
  {
    id: "cuzdan",
    title: "Cüzdanım — Altın & Döviz",
    body: "İşletmenin altın ve döviz varlıklarını canlı kurlarla takip edin. Kâr-zarar ve günlük değişim otomatik hesaplanır.",
    bullets: ["Canlı altın ve döviz kurları", "Ağırlıklı ortalama maliyet", "Portföy dağılımı", "Alış-satış hareketleri"],
  },
];

export default function Isletme() {
  return (
    <SegmentPage
      eyebrow="İşletme"
      title="Ön muhasebeniz tek panelde"
      lead="Fatura, cari, stok, çalışan, çek-senet ve KDV — esnaf ve KOBİ'nin bütün işi aynı yerde. Web'de yaptığınız her kayıt mobilde de sizinle."
      sections={SECTIONS}
      ctaTitle="İşletmenizi Paraner ile yönetin"
      ctaText="Dakikalar içinde hesabınızı oluşturun. Kredi kartı gerekmez."
    />
  );
}
