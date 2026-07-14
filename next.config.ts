import type { NextConfig } from "next";

// Tüm rotalara uygulanan HTTP güvenlik header'ları.
// - X-Frame-Options + CSP frame-ancestors: clickjacking (panel iframe'e gömülüp
//   "Hesabı Sil" gibi eylemlerin tıklatılması) engellenir.
// - HSTS: sonraki ziyaretlerde tarayıcı doğrudan HTTPS'e gider.
// - X-Content-Type-Options: MIME-sniffing kapatılır.
// - Referrer-Policy: çapraz-origin'e tam URL sızmaz.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Bu klasörü proje kökü olarak sabitle (ev dizinindeki başka lockfile'lar karışmasın)
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // İstemci önbelleği (client cache) — panel sayfaları çerez okuduğu için hepsi DİNAMİK,
    // dinamikte varsayılan TTL 0'dır (Next 15'te 30sn'den 0'a düştü) → aynı sayfaya geri
    // dönmek bile sunucuya tam tur atıyordu. 30sn'ye çekildi: menüde gidip gelmek anında olur.
    // Veri bayatlaması riski yok — ekleme/silme yapan client bileşenleri router.refresh()
    // çağırıyor, bu da önbelleği tazeler.
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
