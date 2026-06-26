import type { Metadata } from "next";
import ResetPasswordClient from "../components/ResetPasswordClient";

export const metadata: Metadata = {
  title: "Şifre Sıfırla — Paraner",
  robots: { index: false, follow: false },
};

// Şifre sıfırlama bağlantısının (e-posta) açıldığı sayfa. Tüm mantık client'ta.
export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
