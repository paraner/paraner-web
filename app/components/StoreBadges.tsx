// Üç mağaza indirme rozeti — referans görsele göre: Google Play · App Store · AppGallery.
// Koyu (siyah) zemin, site butonlarıyla aynı köşe yuvarlatma (14px). Logolar inline SVG.
// Uygulamalar yayınlanınca rozetlere href eklenecek (şimdilik görsel).

const GooglePlayIcon = (
  <svg className="store-svg" viewBox="0 0 512 512" aria-hidden="true">
    <path fill="#00C3FF" d="M48 59.49v393a4.33 4.33 0 0 0 7.37 3.07L290 256 55.37 56.42A4.33 4.33 0 0 0 48 59.49z" />
    <path fill="#00F076" d="M345.8 174 89.22 25.85c-3.76-2.17-8.66 3.43-5 7L290 256z" />
    <path fill="#FF3A44" d="M84.22 479.15c-3.66 3.57 1.24 9.17 5 7L345.8 338 290 256z" />
    <path fill="#FFCE00" d="M345.8 174 290 256l55.8 82 84.21-48.57c12.52-7.22 12.52-25.64 0-32.86z" />
  </svg>
);

const AppleIcon = (
  <svg className="store-svg" viewBox="0 0 384 512" aria-hidden="true">
    <path
      fill="#fff"
      d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
    />
  </svg>
);

const AppGalleryIcon = (
  <svg className="store-svg" viewBox="0 0 512 512" aria-hidden="true">
    <rect width="512" height="512" rx="112" fill="#C30A14" />
    {/* 4 yapraklı çiçek (AppGallery markası — sadeleştirilmiş) */}
    <g fill="#fff">
      <ellipse cx="256" cy="172" rx="42" ry="74" />
      <ellipse cx="256" cy="340" rx="42" ry="74" />
      <ellipse cx="172" cy="256" rx="74" ry="42" />
      <ellipse cx="340" cy="256" rx="74" ry="42" />
    </g>
    <circle cx="256" cy="256" r="34" fill="#C30A14" />
  </svg>
);

const BADGES = [
  { icon: GooglePlayIcon, big: "Google Play", small: "'DEN ALIN" },
  { icon: AppleIcon, big: "App Store'dan", small: "İNDİR" },
  { icon: AppGalleryIcon, big: "AppGallery", small: "İLE KEŞFEDİN" },
];

export default function StoreBadges() {
  return (
    <div className="stores">
      {BADGES.map((b) => (
        <span className="store-badge" key={b.big}>
          <span className="store-logo">{b.icon}</span>
          <span className="store-txt">
            <span className="store-big">{b.big}</span>
            <span className="store-small">{b.small}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
