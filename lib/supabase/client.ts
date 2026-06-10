import { createBrowserClient } from "@supabase/ssr";
import { cookieDomain } from "./cookieDomain";

// Tarayıcı (client component) tarafında kullanılan Supabase istemcisi.
// Mobil uygulamayla AYNI Supabase projesine bağlanır — ortak backend.
export function createClient() {
  const domain =
    typeof window !== "undefined"
      ? cookieDomain(window.location.host)
      : undefined;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Oturum cookie'si .paraner.com'a yazılır → paraner.com ve app.paraner.com paylaşır
      cookieOptions: domain ? { domain } : undefined,
    }
  );
}
