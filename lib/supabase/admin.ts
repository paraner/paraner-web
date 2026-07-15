import "server-only";
import { createClient } from "@supabase/supabase-js";

/* service_role istemcisi — RLS'i BYPASS eder (admin panelinin tüm müşterileri görmesi için).
   ⚠️ YALNIZCA SUNUCUDA. "server-only" import'u client bileşene sızarsa build patlar.
   Anahtar NEXT_PUBLIC_ DEĞİL → tarayıcıya asla gitmez. Kullanmadan önce rol guard'ından geç. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null; // key yoksa (henüz eklenmediyse) çağıran tarafta ele alınır
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const hasAdminKey = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
