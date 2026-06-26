"use client";

import { useEffect, useRef } from "react";
import type { Group } from "three";

// Sol panel — Resend tarzı interaktif 3D küp (üst düzey).
//  • 3×3 küp, YÜZ-BAŞINA malzeme karışımı: parlak siyah · karbon · metalik gri · delikli ızgara
//  • Bazı yüzlerde kalın PARA BİRİMİ sembolü ($ € £ ₺ ¥), metalik gri (işlemeli)
//  • Hareket: yavaş döner; arada ANİ hamle — tek 90°, 180° (iki kez), veya ALT+ÜST ters yön (kesme)
//  • Mouse ile TUT-DÖNDÜR. Filmik ışık (ACES tonemap + rim highlight). reduced-motion → durur.
//  • three dinamik import; ≤1024px sol panel gizli (masaüstüne özel); WebGL yoksa CSS arka planı.
export default function AuthCube3D() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (disposed || !ref.current) return;

      const el = ref.current;
      const w = el.clientWidth || 600;
      const h = el.clientHeight || 800;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.toneMapping = THREE.ACESFilmicToneMapping; // filmik highlight'lar
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block;cursor:grab;touch-action:none;";
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(33, w / h, 0.1, 100);
      camera.position.set(6.0, 4.4, 7.4);

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.045).texture;

      // ── Işık: filmik, küplere güçlü vuruş + rim kenar parlaması ──
      const key = new THREE.DirectionalLight(0xffffff, 3.2);
      key.position.set(6, 9, 7);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xbfe9e0, 2.0); // arka-yan rim → kenarlar parlar (hafif teal)
      rim.position.set(-7, 4, -8);
      scene.add(rim);
      const spec = new THREE.PointLight(0xffffff, 26, 50, 1.8); // ön specular pop
      spec.position.set(5, -1.5, 6);
      scene.add(spec);
      const teal = new THREE.PointLight(0x00bfa6, 14, 40, 1.6); // marka dokunuşu
      teal.position.set(-4, 2.5, 5);
      scene.add(teal);
      scene.add(new THREE.AmbientLight(0xffffff, 0.14));

      // ── Dokular ──
      const makeTex = (draw: (g: CanvasRenderingContext2D, n: number) => void, n: number, rep: number) => {
        const c = document.createElement("canvas");
        c.width = c.height = n;
        draw(c.getContext("2d")!, n);
        const tx = new THREE.CanvasTexture(c);
        tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
        tx.repeat.set(rep, rep);
        return tx;
      };
      const carbonTex = makeTex((g, n) => {
        g.fillStyle = "#000";
        g.fillRect(0, 0, n, n);
        g.fillStyle = "#999";
        for (let y = 0; y < n; y += 6)
          for (let x = 0; x < n; x += 6) {
            g.beginPath();
            g.arc(x + 3, y + 3, 1.1, 0, Math.PI * 2);
            g.fill();
          }
      }, 96, 3);
      const grilleTex = makeTex((g, n) => {
        g.fillStyle = "#aaa";
        g.fillRect(0, 0, n, n);
        g.fillStyle = "#000";
        for (let y = 0; y < n; y += 12)
          for (let x = 0; x < n; x += 12) {
            g.beginPath();
            g.arc(x + 6, y + 6, 3.4, 0, Math.PI * 2);
            g.fill();
          }
      }, 96, 3);

      // ── Yüz malzeme havuzu (yüz-başına rastgele) ──
      const mGloss = new THREE.MeshStandardMaterial({ color: 0x0e0f12, metalness: 0.98, roughness: 0.16, envMapIntensity: 1.25 });
      const mGloss2 = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, metalness: 0.7, roughness: 0.5 }); // satin siyah
      const mCarbon = new THREE.MeshStandardMaterial({ color: 0x141619, metalness: 0.72, roughness: 0.5, bumpMap: carbonTex, bumpScale: 0.02, envMapIntensity: 0.95 });
      const mGray = new THREE.MeshStandardMaterial({ color: 0x363b43, metalness: 0.95, roughness: 0.3, envMapIntensity: 1.15 });
      const mGrille = new THREE.MeshStandardMaterial({ color: 0x101216, metalness: 0.85, roughness: 0.46, bumpMap: grilleTex, bumpScale: 0.03, envMapIntensity: 0.9 });
      const facePool = [mGloss, mGloss, mGloss2, mCarbon, mCarbon, mGray, mGrille];
      const allFaceMats = [mGloss, mGloss2, mCarbon, mGray, mGrille];

      // ── Para birimi sembolleri (kalın, eşit boyut → alphaMap) ──
      const symTex = (ch: string) => {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d")!;
        g.clearRect(0, 0, 256, 256);
        g.fillStyle = "#fff";
        g.font = "900 170px -apple-system, 'Segoe UI', Arial, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(ch, 128, 142);
        const tx = new THREE.CanvasTexture(c);
        tx.anisotropy = 4;
        return tx;
      };
      const SYMBOLS = ["$", "€", "£", "₺", "¥"];
      const symMats = SYMBOLS.map(
        (ch) =>
          new THREE.MeshStandardMaterial({
            color: 0x6b7077,
            metalness: 0.85,
            roughness: 0.36,
            transparent: true,
            alphaMap: symTex(ch),
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          })
      );

      // ── Küp kümesi (BoxGeometry → yüz-başına materyal dizisi) ──
      const SIZE = 0.97;
      const SCALE = 0.78;
      const group = new THREE.Group();
      group.scale.setScalar(SCALE);
      group.rotation.set(0.12, 0.5, 0);
      scene.add(group);

      const boxGeo = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
      const planeGeo = new THREE.PlaneGeometry(SIZE * 0.62, SIZE * 0.62);
      const off = SIZE / 2 + 0.012;
      // BoxGeometry yüz sırası: [+x, -x, +y, -y, +z, -z]
      const faces: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [
        { pos: [off, 0, 0], rot: [0, Math.PI / 2, 0] },
        { pos: [-off, 0, 0], rot: [0, -Math.PI / 2, 0] },
        { pos: [0, off, 0], rot: [-Math.PI / 2, 0, 0] },
        { pos: [0, -off, 0], rot: [Math.PI / 2, 0, 0] },
        { pos: [0, 0, off], rot: [0, 0, 0] },
        { pos: [0, 0, -off], rot: [0, Math.PI, 0] },
      ];
      const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];

      const cubies: Group[] = [];
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const cubie = new THREE.Group();
            cubie.position.set(x, y, z);
            const faceMats = [0, 1, 2, 3, 4, 5].map(() => pick(facePool));
            cubie.add(new THREE.Mesh(boxGeo, faceMats));
            // bazı yüzlere para birimi (her yüz değil → doku ile harman)
            faces.forEach((f) => {
              if (Math.random() < 0.32) {
                const pl = new THREE.Mesh(planeGeo, pick(symMats));
                pl.position.set(...f.pos);
                pl.rotation.set(...f.rot);
                cubie.add(pl);
              }
            });
            group.add(cubie);
            cubies.push(cubie);
          }

      // ── OrbitControls ──
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.7;
      controls.autoRotate = !reduce;
      controls.autoRotateSpeed = 0.5;
      controls.target.set(0, 0, 0);

      const dom = renderer.domElement;
      const grab = () => (dom.style.cursor = "grabbing");
      const release = () => (dom.style.cursor = "grab");
      dom.addEventListener("pointerdown", grab);
      window.addEventListener("pointerup", release);

      // ── Hamle motoru (Resend tarzı: tek 90°, 180°, alt+üst ters) ──
      const AXES: Array<"x" | "y" | "z"> = ["x", "y", "z"];
      type Part = { axis: "x" | "y" | "z"; angle: number; pivot: InstanceType<typeof THREE.Group>; members: Group[] };
      let move: { dur: number; t: number; parts: Part[] } | null = null;
      let restTimer = reduce ? Infinity : 1.0;
      const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const coin = () => (Math.random() < 0.5 ? 1 : -1);

      function makePart(axis: "x" | "y" | "z", layer: number, angle: number): Part {
        const pivot = new THREE.Group();
        group.add(pivot);
        const members = cubies.filter((c) => Math.round(c.position[axis]) === layer);
        members.forEach((c) => pivot.attach(c));
        return { axis, angle, pivot, members };
      }
      function pickMove() {
        const axis = AXES[(Math.random() * 3) | 0];
        const r = Math.random();
        let parts: Part[];
        let dur: number;
        if (r < 0.45) {
          // tek dış katman 90°
          parts = [makePart(axis, coin(), (coin() * Math.PI) / 2)];
          dur = 0.5 + Math.random() * 0.2;
        } else if (r < 0.68) {
          // tek katman 180° (iki kez döner)
          parts = [makePart(axis, coin(), coin() * Math.PI)];
          dur = 0.8;
        } else {
          // ALT + ÜST ters yön, ANİ/HIZLI (çarpıcı kesme)
          const a = Math.random() < 0.5 ? Math.PI / 2 : Math.PI;
          parts = [makePart(axis, 1, a), makePart(axis, -1, -a)];
          dur = 0.42;
        }
        move = { dur, t: 0, parts };
      }
      function finishMove() {
        if (!move) return;
        move.parts.forEach((p) => {
          p.members.forEach((c) => {
            group.attach(c);
            c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
          });
          group.remove(p.pivot);
        });
        move = null;
        // çoğunlukla sakin; bazen art arda hızlı seri
        restTimer = Math.random() < 0.22 ? 0.12 : 0.7 + Math.random() * 1.7;
      }

      // ── Render döngüsü ──
      let last = performance.now();
      let raf = 0;
      const animate = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!reduce) {
          if (move) {
            move.t = Math.min(1, move.t + dt / move.dur);
            const e = easeInOut(move.t);
            move.parts.forEach((p) => (p.pivot.rotation[p.axis] = e * p.angle));
            if (move.t >= 1) finishMove();
          } else {
            restTimer -= dt;
            if (restTimer <= 0) pickMove();
          }
        }
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
        boxGeo.dispose();
        planeGeo.dispose();
        carbonTex.dispose();
        grilleTex.dispose();
        allFaceMats.forEach((m) => m.dispose());
        symMats.forEach((m) => {
          m.alphaMap?.dispose();
          m.dispose();
        });
        pmrem.dispose();
        renderer.dispose();
        if (dom.parentElement === el) el.removeChild(dom);
      };
    })().catch(() => {
      /* WebGL yok → CSS arka planı görünür kalır */
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={ref} className="auth-visual auth-cube" aria-hidden="true" />;
}
