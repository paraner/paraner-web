import { createAdminClient, hasAdminKey } from "../../../lib/supabase/admin";
import { listAuthUsers } from "../../../lib/adminUsers";
import { requireAdminPage } from "../../../lib/adminGuard";
import AdminKeyNotice from "../AdminKeyNotice";
import EkipClient, { type StaffMember } from "./EkipClient";

export const metadata = { title: "Ekip", robots: { index: false, follow: false } };

export default async function AdminEkipPage() {
  await requireAdminPage(); // ekip yönetimi + davet yalnız yöneticide
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  const [{ data: roleRows, error: roleErr }, { users, error: userErr }] = await Promise.all([
    admin.from("user_roles").select("user_id, role, created_at"),
    listAuthUsers(),
  ]);

  // Hata yutulursa "Ekip (0) · Henüz kimse yok" der → yönetici rolleri silinmiş sanır.
  if (roleErr || userErr) {
    return (
      <div>
        <h1 className="admin-h1">Ekip</h1>
        <p className="admin-sub">Ekip listesi yüklenemedi: {roleErr?.message ?? userErr}</p>
      </div>
    );
  }

  // Aynı kişinin birden fazla rolü olabilir (ör. hem agent hem admin) → tek satırda topla.
  const byUser = new Map<string, StaffMember>();
  for (const r of (roleRows ?? []) as { user_id: string; role: "admin" | "agent"; created_at: string }[]) {
    const u = users.find((x) => x.id === r.user_id);
    const entry = byUser.get(r.user_id) ?? {
      id: r.user_id,
      email: u?.email ?? "(kullanıcı bulunamadı)",
      roles: [],
      since: r.created_at,
    };
    entry.roles.push(r.role);
    if (r.created_at < entry.since) entry.since = r.created_at;
    byUser.set(r.user_id, entry);
  }

  const staff = [...byUser.values()].sort((a, b) => a.email.localeCompare(b.email, "tr"));
  return <EkipClient staff={staff} />;
}
