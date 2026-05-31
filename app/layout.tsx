import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter — telefon uygulamasıyla aynı font ailesi
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paraner — Finans & Bütçe Koçun",
  description:
    "Paranı yönet, geleceğini kur. AI destekli kişisel ve işletme finans asistanı.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
