"use client";

import { useEffect, useState } from "react";

// Açılış ekranı — mobil app ile aynı his: ince cam (blur) + teal PARANER wordmark + shimmer.
// Panel layout'ta render edilir (yalnız /panel için) → panel ilk yüklenince (PWA açılışı /
// yenileme) görünür, kısa süre sonra yumuşakça kaybolur. Panel-içi soft navigasyonda
// layout kalıcı olduğu için tekrar tetiklenmez.
export default function SplashScreen() {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 850);   // solmaya başla
    const t2 = setTimeout(() => setGone(true), 1320);  // DOM'dan kaldır
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
