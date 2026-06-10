// Oturum cookie'sinin hangi domain'e yazılacağını belirler.
// paraner.com ile app.paraner.com AYNI oturumu paylaşsın diye cookie '.paraner.com'a yazılır:
// kullanıcı paraner.com/giris'te giriş yapınca app.paraner.com'da da oturumu açık olur.
// localhost'ta domain verilmez (tarayıcı reddeder) — orada tek host üzerinden çalışır.
export function cookieDomain(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const hostname = host.split(":")[0]; // varsa portu at
  if (hostname === "paraner.com" || hostname.endsWith(".paraner.com")) {
    return ".paraner.com";
  }
  return undefined;
}
