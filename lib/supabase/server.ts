import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomain } from "./cookieDomain";

// Sunucu (server component / route handler) tarafında kullanılan Supabase istemcisi.
// Oturumu cookie üzerinden okur; RLS otomatik devrede (kullanıcı sadece kendi verisini görür).
export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const domain = cookieDomain(headerStore.get("host"));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(domain ? { domain } : {}),
              })
            );
          } catch {
            // Server Component içinden çağrıldığında set engellenebilir —
            // oturum yenileme proxy.ts'te yapıldığı için bu güvenle yutulur.
          }
        },
      },
    }
  );
}
