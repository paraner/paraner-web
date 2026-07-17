import { createAdminClient, hasAdminKey } from "../../../lib/supabase/admin";
import { listAuthUsers } from "../../../lib/adminUsers";
import AdminKeyNotice from "../AdminKeyNotice";
import EkipClient, { type StaffMember } from "./EkipClient";

export const metadata = { title: "Ekip", robots: { index: false, follow: false } };

export default async function AdminEkipPage() {
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const admin = createAdminClient()!;

  const [{ data: roleRows }, { users }] = await Promise.all([
    admin.from("user_roles").select("user_id, role, created_at"),
    listAuthUsers(),
  ]);

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
