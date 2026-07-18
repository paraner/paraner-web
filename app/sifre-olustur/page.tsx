import type { Metadata } from "next";
import ResetPasswordClient from "../components/ResetPasswordClient";

export const metadata: Metadata = {
  title: "Şifre Oluştur — Paraner",
  robots: { index: false, follow: false },
};

/* İÇ EKİP DAVETİNİN indiği sayfa (admin.paraner.com/sifre-olustur).
   ⚠️ /sifre-sifirla'dan AYRI bir ROTA olması bilinçli: davet edilen kişi şifresini
   SIFIRLAMIYOR, ilk kez OLUŞTURUYOR. Aynı URL'i kullanmak hem kullanıcıya yanlış şey
   söylüyordu hem de Supabase Redirect URLs listesine anlamsız bir adres yazdırıyordu.
   Bileşen ortak — yalnız mod farklı (metinler + yönlendirme hedefi). */
export default function CreatePasswordPage() {
  return <ResetPasswordClient mode="invite" />;
}
