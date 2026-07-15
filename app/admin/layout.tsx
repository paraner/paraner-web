import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffRole } from "../../lib/adminGuard";
import AdminSidebar from "./AdminSidebar";

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
      <AdminSidebar role={role} />
      <div className="admin-main">
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
