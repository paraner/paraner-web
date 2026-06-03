import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kayıt Ol",
  robots: { index: false, follow: true },
};

export default function KayitLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
