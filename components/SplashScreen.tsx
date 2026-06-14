"use client";

import { useEffect, useState } from "react";

// Açılış ekranı — mobil app ile aynı his: siyah zemin + teal PARANER wordmark,
// üzerinden soldan sağa beyaz ışıltı (shimmer) geçer. Panel ilk yüklenirken
// (PWA açılışı / sayfa yenileme) anında siyahı boyar → yükleme yeşilini kapatır.
// Kısa süre sonra yumuşakça kaybolur.
export default function SplashScreen() {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 900);   // solmaya başla
    const t2 = setTimeout(() => setGone(true), 1380);  // DOM'dan kaldır
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div className={`splash${hide ? " splash-hide" : ""}`} aria-hidden="true">
      <div className="splash-word" />
    </div>
  );
}
