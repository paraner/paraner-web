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
    // İstemci önbelleği (client segment cache). Panel sayfaları çerez okuduğu için hepsi
    // DİNAMİK sayılır ve dinamikte varsayılan TTL 0'dır → aynı sayfaya geri dönmek bile
    // sunucuya tam tur atıyordu. 30sn: menüde gidip gelmek anında olur.
    //
    // ÖN KOŞUL SAĞLANDI (bu olmadan AÇMA): panelde veri yazan TÜM handler'lar artık başarı
    // yolunda router.refresh() çağırıyor (23 dosya / ~60 handler). Next 16'da tek refresh
    // TÜM segment önbelleğini geçersiz kılıyor (cache.js: currentSegmentCacheVersion++ —
    // global sürüm sayacı), yani bir sayfada yapılan yazma diğer sayfaların önbelleğini de
    // düşürüyor: "işlem ekledim, Hesaplar'da bakiye eski" sınıfı hatalar oluşmuyor.
    // Kalan tek bayatlık penceresi: BAŞKA cihazdan (mobil) yapılan değişiklik en fazla 30sn
    // geç görünür — kabul edilebilir.
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
