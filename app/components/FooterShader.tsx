"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

/* Footer arka planı — ReactBits "Hyperspeed" (three.js + postprocessing).
   Markaya uygun monokrom titanyum renkler (teal/neon yok).
   Etkileşim: footer'a basılı tutunca yol hızlanır, bırakınca yavaşlar.
   Perf: three.js sadece footer görünüme girince lazy yüklenir + görünmezken
   sökülür (rAF durur). reduced-motion'da hiç çalışmaz. */

const Hyperspeed = dynamic(() => import("./Hyperspeed/Hyperspeed"), { ssr: false });

// Markaya uygun ayarlar — modül sabiti (stabil referans → sahne tek kez kurulur)
const EFFECT_OPTIONS = {
  distortion: "turbulentDistortion",
  colors: {
    roadColor: 0x070708,
    islandColor: 0x0a0a0b,
    background: 0x000000,
    shoulderLines: 0x3d3d3d,
    brokenLines: 0x3d3d3d,
    leftCars: [0x858585, 0xb9bdc3, 0x5a5f66], // titanyum tonları
    rightCars: [0x6d7378, 0x3d3d3d, 0x858585],
    sticks: 0x858585,
  },
};

export default function FooterShader() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    // reduced-motion → ağır sahneyi hiç yükleme
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "300px" } // biraz erken yükle, geç sök → titreme azalır
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="footer-shader" aria-hidden="true">
      {inView && <Hyperspeed effectOptions={EFFECT_OPTIONS} />}
    </div>
  );
}
