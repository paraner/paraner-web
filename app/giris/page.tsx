import { headers } from "next/headers";
import AuthForm from "../components/AuthForm";
import ToastHost from "../components/ToastHost";
import AdminLogin from "../admin/AdminLogin";

export default async function GirisPage() {
  // admin.* host'unda müşteri formu YOK (kayıt switcher'ı + Google/Apple + mağaza rozetleri
  // iç ekip girişinde istenmiyor). Proxy zaten admin.*/kayit'ı buraya yönlendiriyor.
  // x-forwarded-host: Vercel'de gerçek istek host'u burada gelir; host yereldeki fallback.
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  if (host.split(":")[0].startsWith("admin.")) return <AdminLogin />;

  return (
    <div className="auth-page">
      <ToastHost />
      <div className="auth-card">
        <div className="auth-visual auth-cube" aria-hidden="true" />
        <div className="auth-card-form">
          <AuthForm initialMode="giris" />
        </div>
      </div>
    </div>
  );
}
