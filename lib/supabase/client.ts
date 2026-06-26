import { createBrowserClient } from "@supabase/ssr";
import { cookieDomain } from "./cookieDomain";

// Tarayıcı (client component) tarafında kullanılan Supabase istemcisi.
// Mobil uygulamayla AYNI Supabase projesine bağlanır — ortak backend.
//
// opts.implicit: şifre sıfırlama maili için kullanılır. PKCE client ile
// resetPasswordForEmail çağrılırsa e-postadaki {{ .TokenHash }} `pkce_...` olur ve
// verifyOtp bunu kabul etmez (link "geçersiz" der + sadece aynı tarayıcıda çalışır).
// implicit flow → düz token_hash → /sifre-sifirla'da verifyOtp çalışır, farklı cihazda da.
export function createClient(opts?: { implicit?: boolean }) {
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
      ...(opts?.implicit ? { auth: { flowType: "implicit" as const } } : {}),
    }
  );
}
