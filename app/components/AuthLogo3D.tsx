"use client";

import { useEffect, useRef } from "react";

// Auth (giriş/kayıt) formunun üstünde dönen 3B TİTANYUM "P" (Paraner P harfi).
//  • public/paraner-p.svg (potrace ile P PNG'sinden) → ExtrudeGeometry (hacim + pah)
//  • Titanyum PBR (metalness 1) + RoomEnvironment yansıması → krom/titanyum parlaklık
//  • Y ekseninde yavaş döner; sekme gizliyken/görünmezken durur; reduced-motion → sabit açı
//  • three dinamik import; WebGL yoksa sessizce boş kalır (fallback wordmark zaten var)
export default function AuthLogo3D({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      const THREE = await import("three");
      const { SVGLoader } = await import("three/examples/jsm/loaders/SVGLoader.js");
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );
      if (disposed || !ref.current) return;

      const svgText = await fetch("/paraner-p.svg").then((r) => r.text());
      if (disposed || !ref.current) return;

      const el = ref.current;
      const size = el.clientWidth || 104;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(size, size); // updateStyle=true → canvas CSS boyutu container'a eşit (2x büyümez)
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.set(0, 0.35, 4.2);
      camera.lookAt(0, 0, 0);

      // Ortam yansıması (stüdyo) — titanyumun "aynalı" hissi buradan gelir
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      // Işıklar — env üstüne tanım için key + rim
      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xbfc6cf, 1.3);
      rim.position.set(-4, -2, -3);
      scene.add(rim);
      scene.add(new THREE.AmbientLight(0xffffff, 0.25));

      // SVG → şekiller → extrude
      const loader = new SVGLoader();
      const parsed = loader.parse(svgText);
      const shapes: InstanceType<typeof THREE.Shape>[] = [];
      parsed.paths.forEach((p) => {
        SVGLoader.createShapes(p).forEach((s) => shapes.push(s));
      });

      const geo = new THREE.ExtrudeGeometry(shapes, {
        depth: 120,
        bevelEnabled: true,
        bevelThickness: 22,
        bevelSize: 16,
        bevelSegments: 4,
        curveSegments: 14,
      });
      geo.center();

      // Boyutu normalize et + SVG y-aşağı olduğundan Y'yi çevir (scale.y negatif)
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const maxDim = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
      const k = 2.0 / maxDim;

      // Gunmetal-titanyum: beyaz auth formunda da okunur (açık titanyum beyazda kaybolur),
      // koyu mobil formda yansımalarla parlar.
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x9aa1a9,
        metalness: 1,
        roughness: 0.3,
        clearcoat: 0.55,
        clearcoatRoughness: 0.28,
        envMapIntensity: 1.15,
        side: THREE.DoubleSide, // Y-flip normalleri çevirdiğinden çift taraf
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(k, -k, k);
      scene.add(mesh);

      let running = true;
      const clock = new THREE.Clock();

      const renderOnce = () => renderer.render(scene, camera);

      if (reduce) {
        mesh.rotation.y = -0.5;
        renderOnce();
      } else {
        // Vitrin dönüşü: hız açının fonksiyonu. Ön yüz (rotation.y ≈ 0, 2π…) tam
        // görünürken YAVAŞ (FRONT_FLOOR), dönüp arkaya (π) giderken HIZLANIR,
        // sonra yumuşakça yavaşlayıp yine öne oturur. Asla durmaz, sürekli akış.
        const FRONT_FLOOR = 0.12; // ön yüzdeki hız oranı (0=durur, 1=tam) — otururken yavaş
        const PEAK = 3.4; // arka tepe açısal hız (rad/s) — dönüşte belirgin hızlanma
        const TWO_PI = Math.PI * 2;
        const loop = () => {
          if (disposed) return;
          raf = requestAnimationFrame(loop);
          if (!running) return;
          let dt = clock.getDelta();
          if (dt > 0.05) dt = 0.05; // sekme geri gelince sıçrama olmasın
          const a = mesh.rotation.y % TWO_PI;
          // 0 → FRONT_FLOOR (ön, yavaş) · π → 1 (arka, hızlı) — cos ile yumuşak
          const factor = FRONT_FLOOR + (1 - FRONT_FLOOR) * (0.5 - 0.5 * Math.cos(a));
          mesh.rotation.y += PEAK * factor * dt;
          renderOnce();
        };
        raf = requestAnimationFrame(loop);
      }

      // Görünmez/sekme gizliyken duraklat (CPU/GPU tasarrufu)
      const onVis = () => {
        running = !document.hidden;
        if (running && !reduce) clock.getDelta();
      };
      document.addEventListener("visibilitychange", onVis);

      const io = new IntersectionObserver(
        ([e]) => {
          running = e.isIntersecting && !document.hidden;
          if (running && !reduce) clock.getDelta();
        },
        { threshold: 0.01 }
      );
      io.observe(el);

      cleanup = () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVis);
        io.disconnect();
        geo.dispose();
        mat.dispose();
        pmrem.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
