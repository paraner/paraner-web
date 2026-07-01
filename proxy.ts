import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomain } from "./lib/supabase/cookieDomain";

// "Trafik polisi": gelen isteğin adresine (host) göre karar verir.
//  - paraner.com (pazarlama)     → dokunma, olduğu gibi geçir
//  - app.paraner.com (panel)     → oturumu kontrol et; yoksa girişe at, varsa paneli göster
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];
  // app.* öneki olan her host panel sayılır (app.paraner.com, app.localhost, preview app.*)
  const isApp = hostname.startsWith("app.");

  // Pazarlama domaini → panel yolu sadece app.* üzerinde olsun
  if (!isApp) {
    if (
      request.nextUrl.pathname.startsWith("/panel") &&
      (hostname === "paraner.com" || hostname === "www.paraner.com")
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
    error: userError,
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Girişli kullanıcı /giris veya /kayit'a gelirse panele al (tekrar giriş/OTP olmasın)
  if (user && (pathname.startsWith("/giris") || pathname.startsWith("/kayit"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    url.search = "";
    return copyCookies(NextResponse.redirect(url), response);
  }

  // Giriş/kayıt gibi herkese açık sayfalar korumadan muaf (yoksa /giris kendine döngü yapar)
  const PUBLIC_PATHS = ["/giris", "/kayit", "/sifre-sifirla"];
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // Kullanıcı yoksa: ama oturum çerezi (sb-...-auth-token) HÂLÂ varsa, bu büyük ihtimalle
  // geçici bir getUser hatası / token tazeleme gecikmesidir (ağ blibinde olur). Böyle durumda
  // kullanıcıyı ATMA — içeride bırak, sayfa kendi oturumunu tazeler. SADECE hiç oturum çerezi
  // yoksa (gerçekten çıkış yapılmış) girişe yönlendir. (Eskiden her getUser=null'da atıyordu →
  // sayfa geçişlerinde durduk yere giriş ekranına düşüyordu.)
  if (!user) {
    // KESİN silinme: getUser HTTP 403 → kullanıcı sunucuda yok (hesap kalıcı kapatılmış).
    // Çerezleri temizle + girişe at + ?closed=1 ile bildir. (Geçici ağ hatası status
    // vermez → aşağıdaki "içeride bırak" dalına düşer, ATMAZ — 23.06 kararlılık kuralı.)
    if ((userError as { status?: number } | null)?.status === 403) {
      const url = request.nextUrl.clone();
      url.hostname = hostname.replace(/^app\./, "");
      url.pathname = "/giris";
      url.searchParams.set("closed", "1");
      const redirect = copyCookies(NextResponse.redirect(url), response);
      // Auth çerezlerini sil — yoksa /giris tekrar paneli açmaya çalışıp döngü yapar.
      request.cookies.getAll().forEach((c) => {
        if (c.name.includes("-auth-token")) {
          redirect.cookies.set(c.name, "", {
            ...(domain ? { domain } : {}),
            maxAge: 0,
            path: "/",
          });
        }
      });
      return redirect;
    }
    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.includes("-auth-token") && c.value);
    if (hasAuthCookie && userError) {
      // Geçici hata + oturum çerezi var → içeride bırak (atma yok).
      return response;
    }
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
  // Statik dosyalar, görseller, açılış splash'ı (boot.html) ve service worker (sw.js) hariç.
  // boot.html + sw.js muaf → auth turu olmadan servis edilir (girişsiz kullanıcıda /giris'e atılmaz).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|boot.html|sw.js|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|webmanifest)).*)",
  ],
};
