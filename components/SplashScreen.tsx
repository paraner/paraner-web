"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Açılış ekranı — mobil app ile aynı his: ince cam (blur) + teal PARANER wordmark + shimmer.
// Kök layout'ta render edilir (veri beklemez) → panel cold load'unda logo ANINDA belirir,
// veriler arkadan akarken üstte durur, kısa süre sonra yumuşakça kaybolur.
// Yalnız /panel yolunda gösterilir (pazarlama sayfalarında değil).
export default function SplashScreen() {
  const pathname = usePathname();
  const onPanel = !!pathname?.startsWith("/panel");
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!onPanel) return;
    const t1 = setTimeout(() => setHide(true), 850);   // solmaya başla
    const t2 = setTimeout(() => setGone(true), 1320);  // DOM'dan kaldır
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onPanel]);

  if (gone || !onPanel) return null;

  return (
    <div className={`splash${hide ? " splash-hide" : ""}`} aria-hidden="true">
      <div className="splash-word" />
    </div>
  );
}
