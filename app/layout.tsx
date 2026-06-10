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
    default: "Paraner — Finans & Bütçe Koçun",
    template: "%s · Paraner",
  },
  description:
    "Paranı yönet, geleceğini kur. AI destekli kişisel ve işletme finans asistanı. Gelir-gider takibi, bütçe, birikim hedefleri, fiş tarama, döviz & altın ve esnaf için ön muhasebe tek uygulamada.",
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
    title: "Paraner — Finans & Bütçe Koçun",
    description:
      "Paranı yönet, geleceğini kur. AI destekli kişisel ve işletme finans asistanı.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Paraner — Finans & Bütçe Koçun",
    description:
      "Paranı yönet, geleceğini kur. AI destekli kişisel ve işletme finans asistanı.",
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
      operatingSystem: "iOS, Android",
      applicationCategory: "FinanceApplication",
      description:
        "AI destekli kişisel ve işletme finans asistanı. Bütçe, birikim hedefleri, fiş tarama, döviz & altın ve esnaf ön muhasebesi.",
      url: SITE_URL,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "TRY",
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
    <html lang="tr" className={inter.variable}>
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
