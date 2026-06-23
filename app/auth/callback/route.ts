import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

// Google OAuth dönüş noktası: ?code'u oturuma çevirir, sonra panele yönlendirir.
// Canlıda panel app.paraner.com'da (oturum .paraner.com cookie ile paylaşılır).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { hostname } = new URL(origin);
      if (hostname.endsWith("paraner.com")) {
        return NextResponse.redirect("https://app.paraner.com/");
      }
      return NextResponse.redirect(`${origin}/panel`);
    }
    // Takas başarısız (genelde eksik/eşleşmeyen PKCE verifier çerezi) — gerçek sebebi logla.
    console.error("[auth/callback] exchangeCodeForSession başarısız:", error.message, error.status);
  } else {
    console.error("[auth/callback] code parametresi yok:", request.url);
  }

  return NextResponse.redirect(`${origin}/giris?error=oauth`);
}
