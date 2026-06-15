import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomain } from "./lib/supabase/cookieDomain";

// "Trafik polisi": gelen isteğin adresine (host) göre karar verir.
//  - paraner.com (pazarlama)     → dokunma, olduğu gibi geçir
//  - app.paraner.com (panel)     → oturumu kontrol et; yoksa girişe at, varsa paneli göster
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const isApp = hostname === "app.paraner.com" || hostname === "app.localhost";

  // Pazarlama domaini → panel yolu sadece app.* üzerinde olsun
  if (!isApp) {
    if (
      request.nextUrl.pathname.startsWith("/panel") &&
      hostname.endsWith("paraner.com")
    ) {
      const url = request.nextUrl.clone();
      url.hostname = "app." + hostname; // paraner.com/panel → app.paraner.com/panel
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- Buradan sonrası SADECE app.* subdomain'i için ---
  const domain = cookieDomain(host);

  // Supabase oturumunu cookie üzerinden tazele
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              ...(domain ? { domain } : {}),
            })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Giriş/kayıt gibi herkese açık sayfalar korumadan muaf (yoksa /giris kendine döngü yapar)
  const PUBLIC_PATHS = ["/giris", "/kayit"];
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // Giriş yoksa → pazarlama domainindeki giriş sayfasına yönlendir
  if (!user) {
    const url = request.nextUrl.clone();
    url.hostname = hostname.replace(/^app\./, ""); // app.paraner.com → paraner.com
    url.pathname = "/giris";
    return copyCookies(NextResponse.redirect(url), response);
  }

  // Girişliyse: app kökü (/) → paneli göster
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    return copyCookies(NextResponse.rewrite(url), response);
  }

  return response;
}

// Tazelenen oturum cookie'lerini yeni yanıta (redirect/rewrite) taşır
function copyCookies(target: NextResponse, from: NextResponse) {
  from.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export const config = {
  // Statik dosyalar, görseller ve açılış splash'ı (/acilis) hariç tüm yollarda çalış.
  // /acilis muaf → auth turu olmadan CDN'den anında servis edilir (dock'ta logo siyahsız anında gelir).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|acilis|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|webmanifest)).*)",
  ],
};
