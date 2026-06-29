"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

/* Footer arka planı — ReactBits "Splash Cursor" (imleci takip eden WebGL akışkan).
   Footer'a hapsedildi: konteyner footer'ı doldurur, koordinatlar canvas'a göreceli.
   Markaya uygun monokrom titanyum renk (RAINBOW_MODE kapalı; açmak istersen tek bayrak).
   Perf/sorunsuzluk: three.js yok (vanilla WebGL). Footer görünüme girince BİR KEZ
   yüklenir ve sökülmez (bileşende cleanup yok → unmount sızıntı yapardı).
   reduced-motion'da hiç yüklenmez. */

const SplashCursor = dynamic(() => import("./SplashCursor/SplashCursor"), { ssr: false });

export default function FooterShader() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true); // bir kez aç, kapatma (unmount cleanup'ı yok)
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="footer-shader" aria-hidden="true">
      {show && (
        <SplashCursor
          SIM_RESOLUTION={128}
          DYE_RESOLUTION={1440}
          DENSITY_DISSIPATION={3.5}
          VELOCITY_DISSIPATION={2}
          PRESSURE={0.1}
          CURL={10}
          SPLAT_RADIUS={0.25}
          SPLAT_FORCE={6000}
          COLOR_UPDATE_SPEED={10}
          TRANSPARENT={true}
          BACK_COLOR={{ r: 0, g: 0, b: 0 }}
          RAINBOW_MODE={false}
          COLOR={"#9aa0a6"}
        />
      )}
    </div>
  );
}
