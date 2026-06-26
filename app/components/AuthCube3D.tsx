"use client";

import { useEffect, useRef } from "react";
import type { Group } from "three";

// Sol panel — Resend tarzı interaktif 3D küp.
//  • 3×3 küp kümesi (yuvarlatılmış kenar, sıkı aralık), siyah + karbon + metalik gri KARIŞIM
//  • Her dış yüzde EŞİT boyutlu, kalın PARA BİRİMİ sembolü ($ € £ ₺ ¥), metalik gri/karbon ton
//  • Boştayken Rubik tarzı KATMAN DÖNÜŞÜ ile kendini çevirir (dağılmaz) + yavaş döner
//  • Mouse ile TUT-DÖNDÜR (OrbitControls). prefers-reduced-motion → morph/otomatik dönüş kapalı.
//  • three dinamik import → panel bundle'ı etkilenmez. ≤1024px sol panel gizli (masaüstüne özel).
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
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block;cursor:grab;touch-action:none;";
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(33, w / h, 0.1, 100);
      camera.position.set(6.0, 4.4, 7.4);

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(6, 9, 7);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.5);
      fill.position.set(-7, -3, -5);
      scene.add(fill);
      const teal = new THREE.PointLight(0x00bfa6, 18, 40, 1.6);
      teal.position.set(-4, 2.5, 5);
      scene.add(teal);
      scene.add(new THREE.AmbientLight(0xffffff, 0.12));

      // ── Karbon dokusu (ince nokta dokusu → bumpMap) ──
      const carbonTex = (() => {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const g = c.getContext("2d")!;
        g.fillStyle = "#000";
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = "#888";
        const step = 8;
        for (let y = 0; y < 64; y += step)
          for (let x = 0; x < 64; x += step) {
            g.beginPath();
            g.arc(x + step / 2, y + step / 2, 1.6, 0, Math.PI * 2);
            g.fill();
          }
        const tx = new THREE.CanvasTexture(c);
        tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
        tx.repeat.set(4, 4);
        return tx;
      })();

      // ── Küp malzeme havuzu: siyah parlak · karbon · metalik gri (cubie başına karışık) ──
      const matBlack = new THREE.MeshStandardMaterial({ color: 0x111214, metalness: 0.96, roughness: 0.32 });
      const matCarbon = new THREE.MeshStandardMaterial({
        color: 0x131418,
        metalness: 0.8,
        roughness: 0.55,
        bumpMap: carbonTex,
        bumpScale: 0.015,
      });
      const matGray = new THREE.MeshStandardMaterial({ color: 0x2b2e34, metalness: 0.95, roughness: 0.28 });
      const matPool = [matBlack, matBlack, matCarbon, matCarbon, matGray]; // ~ %40 siyah / %40 karbon / %20 gri

      // ── Para birimi sembolleri (eşit boyut, kalın → alphaMap) ──
      const symTex = (ch: string) => {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d")!;
        g.clearRect(0, 0, 256, 256);
        g.fillStyle = "#fff";
        g.font = "900 168px -apple-system, 'Segoe UI', Arial, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(ch, 128, 140);
        const tx = new THREE.CanvasTexture(c);
        tx.anisotropy = 4;
        return tx;
      };
      const SYMBOLS = ["$", "€", "£", "₺", "¥"];
      const symMats = SYMBOLS.map(
        (ch) =>
          new THREE.MeshStandardMaterial({
            color: 0x5a5f66, // metalik gri / karbon ton — küple uyumlu, işlemeli
            metalness: 0.8,
            roughness: 0.4,
            transparent: true,
            alphaMap: symTex(ch),
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          })
      );

      // ── Küp kümesi ──
      const SIZE = 0.97;
      const SCALE = 0.78;
      const group = new THREE.Group();
      group.scale.setScalar(SCALE);
      group.rotation.set(0.12, 0.5, 0);
      scene.add(group);

      const boxGeo = new RoundedBoxGeometry(SIZE, SIZE, SIZE, 4, 0.06);
      const planeGeo = new THREE.PlaneGeometry(SIZE * 0.6, SIZE * 0.6);
      const off = SIZE / 2 + 0.012;
      const faces: Array<{ k: "x" | "y" | "z"; s: number; pos: [number, number, number]; rot: [number, number, number] }> = [
        { k: "x", s: 1, pos: [off, 0, 0], rot: [0, Math.PI / 2, 0] },
        { k: "x", s: -1, pos: [-off, 0, 0], rot: [0, -Math.PI / 2, 0] },
        { k: "y", s: 1, pos: [0, off, 0], rot: [-Math.PI / 2, 0, 0] },
        { k: "y", s: -1, pos: [0, -off, 0], rot: [Math.PI / 2, 0, 0] },
        { k: "z", s: 1, pos: [0, 0, off], rot: [0, 0, 0] },
        { k: "z", s: -1, pos: [0, 0, -off], rot: [0, Math.PI, 0] },
      ];

      const cubies: Group[] = [];
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const cubie = new THREE.Group();
            cubie.position.set(x, y, z);
            cubie.add(new THREE.Mesh(boxGeo, matPool[(Math.random() * matPool.length) | 0]));
            const coord = { x, y, z };
            faces.forEach((f) => {
              if (coord[f.k] === f.s) {
                const pl = new THREE.Mesh(planeGeo, symMats[(Math.random() * symMats.length) | 0]);
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
      controls.autoRotateSpeed = 0.55;
      controls.target.set(0, 0, 0);

      const dom = renderer.domElement;
      const grab = () => (dom.style.cursor = "grabbing");
      const release = () => (dom.style.cursor = "grab");
      dom.addEventListener("pointerdown", grab);
      window.addEventListener("pointerup", release);

      // ── Morph: Rubik katman dönüşü (küp kendini çevirir, DAĞILMAZ) ──
      const AXES: Array<"x" | "y" | "z"> = ["x", "y", "z"];
      const pivot = new THREE.Group();
      group.add(pivot);
      let twisting = false;
      let twAxis: "x" | "y" | "z" = "x";
      let twTarget = 0;
      let twProg = 0;
      let twMembers: Group[] = [];
      let restTimer = reduce ? Infinity : 1.0;
      const TW_DUR = 0.7;
      const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

      function startTwist() {
        twAxis = AXES[(Math.random() * 3) | 0];
        const layer = Math.random() < 0.5 ? -1 : 1; // dış katman
        const dir = Math.random() < 0.5 ? 1 : -1;
        twTarget = (dir * Math.PI) / 2;
        twProg = 0;
        pivot.rotation.set(0, 0, 0);
        twMembers = cubies.filter((c) => Math.round(c.position[twAxis]) === layer);
        twMembers.forEach((c) => pivot.attach(c));
        twisting = true;
      }
      function finishTwist() {
        twMembers.forEach((c) => {
          group.attach(c);
          c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
        });
        pivot.rotation.set(0, 0, 0);
        twisting = false;
        restTimer = 0.45 + Math.random() * 0.7;
      }

      // ── Render döngüsü ──
      let last = performance.now();
      let raf = 0;
      const animate = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!reduce) {
          if (twisting) {
            twProg = Math.min(1, twProg + dt / TW_DUR);
            pivot.rotation[twAxis] = easeInOut(twProg) * twTarget;
            if (twProg >= 1) finishTwist();
          } else {
            restTimer -= dt;
            if (restTimer <= 0) startTwist();
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
        [matBlack, matCarbon, matGray].forEach((m) => m.dispose());
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
