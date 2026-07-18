import { createAdminClient, hasAdminKey } from "../../../lib/supabase/admin";
import { listAuthUsers } from "../../../lib/adminUsers";
import { requireAdminPage } from "../../../lib/adminGuard";
import { createClient } from "../../../lib/supabase/server";
import AdminKeyNotice from "../AdminKeyNotice";
import EkipClient, { type StaffMember } from "./EkipClient";

export const metadata = { title: "Ekip", robots: { index: false, follow: false } };

export default async function AdminEkipPage() {
  await requireAdminPage(); // ekip yönetimi + davet yalnız yöneticide (agent 404 alır)
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  const [{ data: roleRows, error: roleErr }, { users, error: userErr }, { data: depRows, error: depErr }] =
    await Promise.all([
      admin.from("user_roles").select("user_id, role, created_at"),
      listAuthUsers(),
      admin.from("staff_departments").select("user_id, department"),
    ]);

  // Hata yutulursa "Ekip (0) · Henüz kimse yok" der → yönetici rolleri silinmiş sanır.
  if (roleErr || userErr || depErr) {
    return (
      <div>
        <h1 className="admin-h1">Ekip</h1>
        <p className="admin-sub">
          Ekip listesi yüklenemedi: {roleErr?.message ?? userErr ?? depErr?.message}
        </p>
      </div>
    );
  }

  // Kişi başına departman listesi (bir kişi birden fazla departmanda olabilir).
  const depsByUser = new Map<string, string[]>();
  for (const d of (depRows ?? []) as { user_id: string; department: string }[]) {
    depsByUser.set(d.user_id, [...(depsByUser.get(d.user_id) ?? []), d.department]);
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
      departments: depsByUser.get(r.user_id) ?? [],
      /* Davet kabul edildi mi: şifre kurup en az bir kez giren kişinin last_sign_in_at'i dolu.
         Beklemede olanı listede göstermek şart — yoksa "davet ettim ama gelmedi" sessiz kalır. */
      pending: !u?.last_sign_in_at,
    };
    entry.roles.push(r.role);
    if (r.created_at < entry.since) entry.since = r.created_at;
    byUser.set(r.user_id, entry);
  }

  const staff = [...byUser.values()].sort((a, b) => a.email.localeCompare(b.email, "tr"));
  /* Kendi satırında "Ekipten çıkar" gösterilmesin (kilitlenme). Sunucu da engelliyor;
     düğmeyi hiç göstermemek daha anlaşılır. */
  const { data: { user } } = await (await createClient()).auth.getUser();
  return <EkipClient staff={staff} selfEmail={user?.email ?? null} />;
}
