import type { Metadata } from "next";
import { preload } from "react-dom";
import AcilisRedirect from "./AcilisRedirect";

// Açılış (boot) splash'ı — STATİK sayfa: proxy'den muaf (proxy.ts matcher), veri/auth beklemez.
// PWA start_url buraya bakar → dock'a tıklayınca CDN'den anında servis edilir, logo siyah
// ekran olmadan ~anında boyanır. Ardından panele geçilir (auth + veri orada çalışır).
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Paraner",
  robots: { index: false, follow: false },
};

export default function AcilisPage() {
  // Wordmark'ı statik HTML ile birlikte preload et → logo gerçekten anında görünsün.
  preload("/paraner-wordmark.png", { as: "image" });

  return (
    <div className="splash splash-boot" aria-hidden="true">
      <div className="splash-word" />
      <AcilisRedirect />
    </div>
  );
}
