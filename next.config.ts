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
  // ⚠️ experimental.staleTimes (istemci önbelleği) BİLEREK KAPALI.
  // Bir tur açıldı (dynamic: 30) ve geri alındı: panel CRUD ekranlarının HİÇBİRİ
  // mutasyondan sonra router.refresh() çağırmıyor (yalnız Ayarlar + Sidebar profil işlemleri
  // çağırıyor). Sunucu verisi Client'a initialX prop'u olarak geçip useState'e tohumlandığı
  // için, önbellek açıkken sayfadan çıkıp 30sn içinde geri dönmek yerel state'i siler ve
  // BAYAT RSC payload'unu geri getirir → "eklediğim işlem kayboldu", "bakiye güncellenmedi",
  // "transfer listede yok". Para ekranında kabul edilemez.
  // Geri açmanın ön koşulu: her mutasyondan sonra router.refresh() (Next 16'da tek çağrı
  // TÜM segment önbelleğini geçersiz kılar → çapraz sayfa bayatlığını da çözer).
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
