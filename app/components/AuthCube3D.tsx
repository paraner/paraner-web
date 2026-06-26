"use client";

import { useEffect, useRef } from "react";

// Sol panel — Resend tarzı interaktif 3D küp. 3×3 koyu metalik küp kümesi (yuvarlatılmış
// kenarlar), mouse ile TUT-DÖNDÜR (OrbitControls), boştayken yavaş otomatik döner.
// Three.js auth sayfasına özel (dinamik import) → panel bundle'ını etkilemez. Sol panel
// zaten ≤1024px gizli olduğundan yalnız masaüstünde çalışır; WebGL yoksa CSS arka planı kalır.
export default function AuthCube3D() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
      if (disposed || !ref.current) return;

      const el = ref.current;
      const w = el.clientWidth || 600;
      const h = el.clientHeight || 800;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block;cursor:grab;touch-action:none;";
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
      camera.position.set(5.2, 4.0, 6.6);

      // Metal yüzeyler için stüdyo yansıması (HDR dosyası olmadan)
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      // Işıklar — nötr key/fill + marka teal rim (hafif)
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(6, 9, 7);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.5);
      fill.position.set(-7, -3, -5);
      scene.add(fill);
      const teal = new THREE.PointLight(0x00bfa6, 22, 40, 1.6);
      teal.position.set(-4, 2.5, 5);
      scene.add(teal);
      scene.add(new THREE.AmbientLight(0xffffff, 0.12));

      // 3×3×3 küp kümesi (yuvarlatılmış kenar, koyu metalik)
      const group = new THREE.Group();
      const geo = new RoundedBoxGeometry(0.92, 0.92, 0.92, 4, 0.07);
      const mat = new THREE.MeshStandardMaterial({ color: 0x121315, metalness: 0.96, roughness: 0.34 });
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, y, z);
            group.add(m);
          }
      group.rotation.set(0.1, 0.5, 0);
      scene.add(group);

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.7;
      controls.autoRotate = !reduce;
      controls.autoRotateSpeed = 0.9;
      controls.target.set(0, 0, 0);

      const dom = renderer.domElement;
      const grab = () => (dom.style.cursor = "grabbing");
      const release = () => (dom.style.cursor = "grab");
      dom.addEventListener("pointerdown", grab);
      window.addEventListener("pointerup", release);

      let raf = 0;
      const animate = () => {
        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();

      const ro = new ResizeObserver(() => {
        const W = el.clientWidth;
        const H = el.clientHeight;
        if (!W || !H) return;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
      });
      ro.observe(el);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        controls.dispose();
        dom.removeEventListener("pointerdown", grab);
        window.removeEventListener("pointerup", release);
        geo.dispose();
        mat.dispose();
        pmrem.dispose();
        renderer.dispose();
        if (dom.parentElement === el) el.removeChild(dom);
      };
    })().catch(() => {
      /* WebGL yok/başarısız → CSS arka planı (degrade + glow) görünür kalır */
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={ref} className="auth-visual auth-cube" aria-hidden="true" />;
}
