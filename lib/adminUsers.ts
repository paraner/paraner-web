import "server-only";
import { createAdminClient } from "./supabase/admin";

/* Admin panelinin "müşteri" görünümü.
   ⚠️ Şema gerçeği: e-posta `profiles`'ta YOK — kişi auth.users'ta. `profiles.auth_user_id` kişiye
   bağlar ve bir kişinin BİRDEN FAZLA profili olabilir (bireysel + işletme). Bu yüzden müşteri =
   auth kullanıcısı, profiller onun altında listelenir. */

export type AdminPersonProfile = {
  id: string;
  profile_name: string | null;
  name: string | null;
  profile_type: string | null;
  is_premium: boolean | null;
  subscription_tier: string | null;
  currency: string | null;
  created_at: string | null;
};

export type AdminPerson = {
  id: string; // auth.users.id
  email: string;
  created_at: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
  profiles: AdminPersonProfile[];
};

type AuthUser = {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  banned_until?: string;
};

const PROFILE_COLS =
  "id, auth_user_id, profile_name, name, profile_type, is_premium, subscription_tier, currency, created_at";

/* auth.users'ın tamamı — listUsers sayfalıdır ve toplam sayı DÖNMEZ; son sayfa perPage'den
   kısa gelene kadar dönülür. MAX_PAGES: bozuk yanıtta sonsuz döngü olmasın diye emniyet freni
   (10 × 1000 = 10.000 kullanıcı; aşılırsa liste sessizce kırpılmaz, çağıran truncated görür). */
export async function listAuthUsers(): Promise<{ users: AuthUser[]; truncated: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { users: [], truncated: false };

  const perPage = 1000;
  const MAX_PAGES = 10;
  const users: AuthUser[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) break;
    const batch = (data?.users ?? []) as AuthUser[];
    users.push(...batch);
    if (batch.length < perPage) return { users, truncated: false };
  }
  return { users, truncated: true };
}

/** Müşteri listesi: her kişi + altındaki profiller. En yeni kayıt üstte. */
export async function listPeople(): Promise<{ people: AdminPerson[]; truncated: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { people: [], truncated: false };

  const [{ users, truncated }, { data: profileRows }] = await Promise.all([
    listAuthUsers(),
    admin.from("profiles").select(PROFILE_COLS).limit(10000),
  ]);

  const byUser = new Map<string, AdminPersonProfile[]>();
  for (const row of (profileRows ?? []) as (AdminPersonProfile & { auth_user_id: string | null })[]) {
    if (!row.auth_user_id) continue; // yetim profil (kişisi silinmiş) → listede gösterme
    const list = byUser.get(row.auth_user_id) ?? [];
    list.push(row);
    byUser.set(row.auth_user_id, list);
  }

  const people = users.map((u) => ({
    id: u.id,
    email: u.email ?? "—",
    created_at: u.created_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    banned_until: u.banned_until ?? null,
    profiles: byUser.get(u.id) ?? [],
  }));

  people.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  return { people, truncated };
}

/** Tek kişi + profilleri. Bulunamazsa null. */
export async function getPerson(userId: string): Promise<AdminPerson | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const [{ data, error }, { data: profileRows }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("profiles").select(PROFILE_COLS).eq("auth_user_id", userId),
  ]);
  if (error || !data?.user) return null;

  const u = data.user as AuthUser;
  return {
    id: u.id,
    email: u.email ?? "—",
    created_at: u.created_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    banned_until: u.banned_until ?? null,
    profiles: (profileRows ?? []) as AdminPersonProfile[],
  };
}
