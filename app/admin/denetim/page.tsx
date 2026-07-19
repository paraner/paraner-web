import { requireAdminPage } from "../../../lib/adminGuard";
import { createAdminClient, hasAdminKey } from "../../../lib/supabase/admin";
import AdminKeyNotice from "../AdminKeyNotice";
import DenetimClient, { type AuditRow } from "./DenetimClient";

export const metadata = { title: "Denetim Kaydı", robots: { index: false, follow: false } };

/* İç ekip aksiyonlarının kaydı (admin_audit_log).
   ⚠️ Bu tabloya BAŞINDAN BERİ yazıyorduk ama okuyacak ekran yoktu → 17.07'de bir hesap
   silindiğinde "kim sildi" sorusunu cevaplayamadık. Ekran bunu kapatıyor.
   Tablo RLS'li ve INSERT/UPDATE/DELETE politikası YOK → yalnız service_role yazar,
   kimse (admin dahil) client üzerinden izini silemez (sql/admin/admin-audit-log.sql). */
export default async function DenetimPage() {
  await requireAdminPage(); // müşteri e-postaları görünüyor → agent göremez
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  const { data, error } = await admin
    .from("admin_audit_log")
    .select("id, actor_email, action, target_email, target_user_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    // Tablo yoksa (SQL çalıştırılmadıysa) veya sorgu patlarsa: sessiz boş liste ÇİZME.
    return (
      <div>
        <h1 className="admin-h1">Denetim Kaydı</h1>
        <p className="admin-sub">
          Kayıtlar okunamadı: {error.message}
          {error.message.includes("admin_audit_log") && " — sql/admin/admin-audit-log.sql çalıştırıldı mı?"}
        </p>
      </div>
    );
  }

  return <DenetimClient rows={(data ?? []) as AuditRow[]} now={Date.now()} />;
}
