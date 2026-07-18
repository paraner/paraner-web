import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getStaffRole } from "../../lib/adminGuard";
import AdminSidebar from "./AdminSidebar";
import ToastHost from "../components/ToastHost";
import ConfirmProvider from "../components/ConfirmProvider";
import AdminTopActions from "./AdminTopActions";
import LiveRefresh from "./LiveRefresh";

export const metadata: Metadata = {
  title: "Paraner Yönetim",
  robots: { index: false, follow: false },
};

// İç ekip paneli. Rol guard LAYOUT'ta: staff (agent/admin) değilse müşteri paneline atılır.
// (Müşteri panelinin aksine burada sunucu-tarafı guard ZORUNLU — service_role veri açıyor.)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getStaffRole();
  if (!role) redirect("/panel");

  return (
    <div className="admin-shell">
      <ToastHost />
      <ConfirmProvider />
      {/* Canlı sayaç + rozetleri taze tutar (görünürken 30sn; arka planda durur).
          30sn yeterli: kalp atışı zaten 5 dk'da bir — daha sık tazelemek yeni veri getirmez. */}
      <LiveRefresh everyMs={30_000} />
      <AdminSidebar role={role} />
      <div className="admin-main">
        {/* Sağ üst küme: bekleyen talep ikonu (admin+agent) + canlı sayaç (yalnız admin —
            /admin/canli müşteri e-postalarını listeliyor). Rol ayrımı bileşenin içinde.
            Suspense: sayaç sorguları sayfanın boyanmasını BEKLETMESİN. */}
        <Suspense fallback={null}>
          <AdminTopActions role={role} />
        </Suspense>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
