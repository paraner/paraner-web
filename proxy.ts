import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomain } from "./lib/supabase/cookieDomain";

// "Trafik polisi": gelen isteğin adresine (host) göre karar verir.
//  - paraner.com (pazarlama)     → dokunma, olduğu gibi geçir
//  - app.paraner.com (panel)     → oturumu kontrol et; yoksa girişe at, varsa paneli göster
//  - admin.paraner.com (iç ekip) → aynı oturum kontrolü; kök → /admin. Rol guard KODA ait
//    (app/admin/layout.tsx): staff olmayan buraya girse bile müşteri paneline atılır.
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];
  // app.* öneki olan her host panel sayılır (app.paraner.com, app.localhost, preview app.*)
  const isApp = hostname.startsWith("app.");
  // admin.* → iç ekip paneli (admin.paraner.com, admin.localhost)
  const isAdmin = hostname.startsWith("admin.");
  // İkisi de oturum gerektiren "kapalı" host'lar — aşağıdaki tüm auth mantığı ortak.
  const isPrivate = isApp || isAdmin;

  // Pazarlama domaini → panel yolu sadece app.* üzerinde olsun
  if (!isPrivate) {
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

  // --- Buradan sonrası SADECE app.* / admin.* subdomain'leri için ---
  const domain = cookieDomain(host);
  // Girişli kullanıcının bu host'ta göreceği kök sayfa
  const homePath = isAdmin ? "/admin" : "/panel";
  // Girişsiz kullanıcı nereye atılır: app.* → pazarlama girişi (app.paraner.com → paraner.com),
  // admin.* → KENDİ host'unda kal (iç ekip admin.paraner.com'da giriş yapar, pazarlamaya düşmez).
  const loginHostname = isAdmin ? hostname : hostname.replace(/^app\./, "");

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

  // Oturum doğrulama — getUser() DEĞİL, getClaims().
  //
  // getUser() her istekte Supabase Auth sunucusuna GERÇEK BİR HTTP TURU atıyordu; proxy
  // panelin her isteğinde (RSC sayfa geçişleri dahil) çalıştığı için bu, her tıklamaya
  // sabit ~150-250ms ekliyordu.
  //
  // getClaims() bu projede ağ turu YAPMAZ: proje asimetrik imza anahtarı (ES256) kullanıyor
  // → JWKS bir kez çekilip önbelleğe alınır, token yerelde WebCrypto ile doğrulanır.
  // Geriye dönük güvenli: token eski simetrik (HS256) anahtarla imzalıysa auth-js kendisi
  // getUser()'a düşer (yani eski oturumlarda davranış aynen korunur). Süresi dolmuş token
  // yine tazelenir (içeride getSession → refresh → setAll ile çerezler yazılır).
  //
  // JWKS önbelleği auth-js'te MODÜL düzeyinde (GLOBAL_JWKS, storageKey ile paylaşılır) →
  // proxy her istekte yeni istemci kursa bile anahtar süreç başına 10 dakikada bir çekilir.
  //
  // Kayıp: silinmiş hesabın 403'ü artık burada görülmez (token exp'e kadar imzaca geçerli).
  // Bunu zaten AccountStatusGuard (client) yakalıyor: getUser 403 → /giris?closed=1, hem
  // açılışta hem odakta hem 30sn'de bir.
  //
  // try/catch ŞART: getClaims, AuthError olmayan istisnaları (bozuk JWK'da WebCrypto'nun
  // OperationError'ı gibi) yeniden fırlatıyor. Yakalanmazsa proxy patlar → panelin TAMAMI
  // 500 döner. Böyle bir durumda kullanıcıyı atmıyoruz: "oturum çözülemedi" gibi davranıp
  // aşağıdaki güvenlik ağına (çerez varsa içeride bırak) düşürüyoruz.
  let claims: { sub?: string } | null = null;
  let authError: { status?: number } | null = null;
  try {
    const { data, error } = await supabase.auth.getClaims();
    claims = data?.claims ?? null;
    authError = (error as { status?: number } | null) ?? null;
  } catch {
    authError = {}; // status yok → "geçici hata" dalı (aşağıda: çerez varsa ATMA)
  }
  const user = claims?.sub ? { id: claims.sub } : null;
  const userError = authError;

  const { pathname } = request.nextUrl;

  // Girişli kullanıcı /giris veya /kayit'a gelirse panele al (tekrar giriş/OTP olmasın)
  if (user && (pathname.startsWith("/giris") || pathname.startsWith("/kayit"))) {
    const url = request.nextUrl.clone();
    url.pathname = homePath;
    url.search = "";
    return copyCookies(NextResponse.redirect(url), response);
  }

  // admin.* üzerinde KAYIT yok — iç ekip hesabı davetle/elle açılır, kimse buradan üye olmaz.
  if (isAdmin && pathname.startsWith("/kayit")) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.search = "";
    return copyCookies(NextResponse.redirect(url), response);
  }

  // İki panel iki adreste: müşteri paneli admin.* üzerinden SERVİS EDİLMEZ.
  // (admin/layout.tsx staff olmayanı /panel'e atıyor → admin.paraner.com/panel'e düşerdi.)
  if (isAdmin && pathname.startsWith("/panel")) {
    const url = request.nextUrl.clone();
    url.hostname = hostname.replace(/^admin\./, "app."); // admin.paraner.com → app.paraner.com
    return copyCookies(NextResponse.redirect(url), response);
  }

  // Giriş/kayıt gibi herkese açık sayfalar korumadan muaf (yoksa /giris kendine döngü yapar)
  // /sifre-olustur = iç ekip daveti (admin.paraner.com'da açılır) — korumadan muaf OLMALI,
  // çünkü davet linkine tıklayan kişinin henüz oturumu yoktur (token URL'de gelir).
  const PUBLIC_PATHS = ["/giris", "/kayit", "/sifre-sifirla", "/sifre-olustur"];
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // Kullanıcı yoksa: ama oturum çerezi (sb-...-auth-token) HÂLÂ varsa, bu büyük ihtimalle
  // geçici bir getUser hatası / token tazeleme gecikmesidir (ağ blibinde olur). Böyle durumda
  // kullanıcıyı ATMA — içeride bırak, sayfa kendi oturumunu tazeler. SADECE hiç oturum çerezi
  // yoksa (gerçekten çıkış yapılmış) girişe yönlendir. (Eskiden her getUser=null'da atıyordu →
  // sayfa geçişlerinde durduk yere giriş ekranına düşüyordu.)
  if (!user) {
    // KESİN silinme: kullanıcı sunucuda yok (hesap kalıcı kapatılmış) → çerezleri temizle +
    // girişe at + ?closed=1 ile bildir. (Geçici hata status vermez → aşağıdaki "içeride bırak"
    // dalına düşer, ATMAZ — 23.06 kararlılık kuralı.)
    //
    // ⚠️ 403'e KÖRÜ KÖRÜNE GÜVENME: getClaims'in hatası kullanıcıdan değil ALTYAPIDAN da
    // gelebilir (ör. .well-known/jwks.json'a 403 → WAF/CDN engeli, proje duraklatma). Öyle bir
    // 403'te herkesin çerezini silip "hesabınız kapatıldı" demek olurdu. Bu yüzden çerez silme
    // kararını, KULLANICIYA ÖZGÜ bir 403 ile teyit ediyoruz: getUser (uzak tur) da 403 derse
    // hesap gerçekten silinmiştir. Bu ekstra tur sadece bu nadir dalda ödenir.
    if (userError?.status === 403 && (await isUserDeleted(supabase))) {
      const url = request.nextUrl.clone();
      url.hostname = loginHostname;
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
    url.hostname = loginHostname; // app.paraner.com → paraner.com | admin.paraner.com → kendisi
    url.pathname = "/giris";
    return copyCookies(NextResponse.redirect(url), response);
  }

  // Girişliyse: host kökü (/) → o host'un paneli (app → /panel, admin → /admin)
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = homePath;
    return copyCookies(NextResponse.rewrite(url), response);
  }

  return response;
}

// Hesap sunucuda KALICI silinmiş mi? Yalnızca 403 teyidi için çağrılır (nadir dal).
// getUser kullanıcıya özgü yanıt verir: 403 → kullanıcı yok. Ağ/altyapı hatasında false
// döner (yani "silinmiş" sayılmaz) → kullanıcı yanlışlıkla dışarı atılmaz.
async function isUserDeleted(
  supabase: ReturnType<typeof createServerClient>
): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getUser();
    return (error as { status?: number } | null)?.status === 403 && !data?.user;
  } catch {
    return false;
  }
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
