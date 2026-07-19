import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getStaffRoleResult, getSessionUser } from "../../lib/adminGuard";
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
  const { role, error: rolHatasi } = await getStaffRoleResult();
  /* ⚠️ HATAYI YÖNLENDİRMEYLE KARIŞTIRMA (2026-07-19 olayı): rol sorgusu patladığında
     eskiden `role` null geliyordu ve buradaki redirect yöneticiyi müşteri paneline
     atıyordu. Geçici DB hatası = "yetkin yok" DEĞİLDİR. Artık durumu söylüyoruz;
     kullanıcı yenileyince devam eder, oturumu kaybetmez. */
  if (rolHatasi) {
    return (
      <div className="admin-shell">
        <div className="admin-main">
          <div className="admin-content">
            <h1 className="admin-h1">Bağlantı sorunu</h1>
            <p className="admin-sub">
              Yetkin doğrulanamadı (veritabanı geçici olarak yanıt vermedi). Oturumun
              açık — sayfayı yenilemen yeterli.
            </p>
            <p className="admin-note">Teknik ayrıntı: {rolHatasi}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!role) redirect("/panel");

  /* Kenar çubuğunda "hangi hesapla bakıyorum" yazsın (Mehmet, 2026-07-18).
     ⚠️ Ayrı bir auth.getUser() AÇMA — getSessionUser istek başına paylaşılan tek çağrı
     (2026-07-19 disk IO ölçümü: sayfa başına 4 getUser = 16 auth sorgusu oluyordu). */
  const user = await getSessionUser();

  return (
    <div className="admin-shell">
      <ToastHost />
      <ConfirmProvider />
      {/* Canlı sayaç + rozetleri taze tutar. Aralık SAYFAYA göre (LiveRefresh içinde):
          canlı ekran 30sn · pano 2dk · liste ekranlarında otomatik yenileme YOK.
          ⚠️ Sebep: her tur, açık sayfanın TÜM sorgularını yeniden çalıştırıyor ve
          Free plan disk IO bütçesini eritiyordu (2026-07-19 Supabase uyarısı). */}
      <LiveRefresh />
      <AdminSidebar role={role} email={user?.email ?? null} />
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
