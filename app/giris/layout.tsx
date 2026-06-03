import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş Yap",
  robots: { index: false, follow: true },
};

export default function GirisLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
