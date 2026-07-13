import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter — telefon uygulamasıyla aynı font ailesi
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://paraner.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Şirketinizi ve bütçenizi Paraner ile yönetin | Gelir-Gider ve Ön Muhasebe",
    template: "%s · Paraner",
  },
  description:
    "Gelir-gider takibi, bütçe, fatura, stok ve KDV tek uygulamada. Esnaf ve KOBİ için ön muhasebe, bireyler için AI finans koçu Parla. Web ve mobilde aynı hesap — ücretsiz başlayın.",
  keywords: [
    "bütçe uygulaması",
    "harcama takip uygulaması",
    "kişisel finans uygulaması",
    "fiş tarama uygulaması",
    "para biriktirme uygulaması",
    "gelir gider takibi",
    "yapay zeka finans asistanı",
    "esnaf ön muhasebe",
    "işletme gider takibi",
    "döviz altın takip",
    "bütçe koçu",
    "Paraner",
  ],
  applicationName: "Paraner",
  authors: [{ name: "Paraner" }],
  creator: "Paraner",
  publisher: "Paraner",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: "Paraner",
    title: "Şirketinizi ve bütçenizi Paraner ile yönetin",
    description:
      "Gelir-gider, bütçe, fatura, stok ve KDV tek uygulamada. Web ve mobilde aynı hesap.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Şirketinizi ve bütçenizi Paraner ile yönetin",
    description:
      "Gelir-gider, bütçe, fatura, stok ve KDV tek uygulamada. Web ve mobilde aynı hesap.",
  },
  category: "finance",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

// Google'ın "bu bir finans uygulaması" diye anlaması için yapısal veri
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Paraner",
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Paraner",
      inLanguage: "tr-TR",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: "Paraner",
      // Web paneli (app.paraner.com) de var — eskiden yalnız iOS/Android yazıyordu
      operatingSystem: "Web, iOS, Android",
      applicationCategory: "FinanceApplication",
      description:
        "AI destekli kişisel ve işletme finans asistanı. Bütçe, birikim hedefleri, fiş tarama, döviz & altın ve esnaf ön muhasebesi.",
      url: SITE_URL,
      featureList: [
        "Gelir & gider takibi",
        "Bütçe ve birikim hedefleri",
        "Parla — AI finans asistanı",
        "Fatura ve teklif",
        "Stok & ürün takibi",
        "Çalışan & maaş",
        "KDV ve vergi raporları",
        "Cari hesaplar ve veresiye",
        "Döviz & altın portföyü",
      ],
      // AggregateOffer: tek "price: 0" Offer'ı Plus/İşletme Pro fiyatlarını Google'a hiç göstermiyordu
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "TRY",
        lowPrice: "0",
        highPrice: "349",
        offerCount: 3,
        offers: [
          { "@type": "Offer", name: "Free", price: "0", priceCurrency: "TRY" },
          { "@type": "Offer", name: "Plus", price: "129", priceCurrency: "TRY" },
          { "@type": "Offer", name: "İşletme Pro", price: "349", priceCurrency: "TRY" },
        ],
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* data-scroll-behavior="smooth": Next 16 artık geçişte scroll-behavior:smooth'u otomatik
       kapatmıyor → bu attribute olmadan sayfa geçişinde scroll tepeye ANIMASYONLU gidiyordu
       (dikey zıplama). Bu attribute ile Next geçiş anında auto'ya çevirir (anında scroll);
       in-page çapraz linkler (#ozellikler/#fiyatlar) yine smooth kalır. */
    <html lang="tr" className={inter.variable} data-scroll-behavior="smooth">
      {/* suppressHydrationWarning: bazı tarayıcı eklentileri <body>'ye attribute
          ekleyip hydration uyarısı tetikliyor; bu zararsız farkı görmezden geliriz. */}
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
