"use client";

import { useEffect, useRef } from "react";
import type { Group } from "three";

// Sol panel — Resend tarzı interaktif 3D küp.
//  • 3×3 koyu metalik küp kümesi (yuvarlatılmış kenar, sıkı aralık)
//  • Her dış yüzde EŞİT boyutlu, küp rengiyle uyumlu "işlemeli" Paraner harfi (P A R N E, karışık)
//  • Boştayken küp kendi kendini DAĞITIP yeniden toplar (Resend gibi şekilden şekile) + yavaş döner
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
      const teal = new THREE.PointLight(0x00bfa6, 20, 40, 1.6);
      teal.position.set(-4, 2.5, 5);
      scene.add(teal);
      scene.add(new THREE.AmbientLight(0xffffff, 0.12));

      // ── Harf dokuları (eşit boyut, beyaz harf → alphaMap) ──
      const letterTex = (ch: string) => {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d")!;
        g.clearRect(0, 0, 256, 256);
        g.fillStyle = "#fff";
        g.font = "bold 150px Arial, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(ch, 128, 138);
        const tx = new THREE.CanvasTexture(c);
        tx.anisotropy = 4;
        return tx;
      };
      const LETTERS = ["P", "A", "R", "N", "E"];
      const letterMats = LETTERS.map(
        (ch) =>
          new THREE.MeshStandardMaterial({
            color: 0x3c4046, // küple uyumlu, hafif açık metal → işlemeli görünüm
            metalness: 0.7,
            roughness: 0.45,
            transparent: true,
            alphaMap: letterTex(ch),
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          })
      );

      // ── Küp kümesi ──
      const SIZE = 0.97; // 1.0 aralıkta → ince derz (kareler birbirine yakın)
      const SCALE = 0.78; // genel küçültme
      const group = new THREE.Group();
      group.scale.setScalar(SCALE);
      group.rotation.set(0.12, 0.5, 0);
      scene.add(group);

      const boxGeo = new RoundedBoxGeometry(SIZE, SIZE, SIZE, 4, 0.06);
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x121315, metalness: 0.96, roughness: 0.34 });
      const planeGeo = new THREE.PlaneGeometry(SIZE * 0.55, SIZE * 0.55);
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
      const homes: InstanceType<typeof THREE.Vector3>[] = [];
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const cubie = new THREE.Group();
            cubie.position.set(x, y, z);
            cubie.add(new THREE.Mesh(boxGeo, metalMat));
            const coord = { x, y, z };
            faces.forEach((f) => {
              if (coord[f.k] === f.s) {
                const pl = new THREE.Mesh(planeGeo, letterMats[(Math.random() * letterMats.length) | 0]);
                pl.position.set(...f.pos);
                pl.rotation.set(...f.rot);
                cubie.add(pl);
              }
            });
            group.add(cubie);
            cubies.push(cubie);
            homes.push(new THREE.Vector3(x, y, z));
          }

      // ── OrbitControls ──
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.7;
      controls.autoRotate = !reduce;
      controls.autoRotateSpeed = 0.6;
      controls.target.set(0, 0, 0);

      const dom = renderer.domElement;
      const grab = () => (dom.style.cursor = "grabbing");
      const release = () => (dom.style.cursor = "grab");
      dom.addEventListener("pointerdown", grab);
      window.addEventListener("pointerup", release);

      // ── Morph: dağıt ↔ topla (Resend tarzı) ──
      const targPos = homes.map((h) => h.clone());
      const targQuat = cubies.map(() => new THREE.Quaternion());
      const rnd = (a: number) => (Math.random() - 0.5) * 2 * a;
      let assembled = true;
      let phaseTimer = 1.6;
      function scatter() {
        cubies.forEach((_, i) => {
          const h = homes[i];
          const exp = 1.5 + Math.random() * 0.7; // dışa doğru aç
          targPos[i].set(h.x * exp + rnd(0.6), h.y * exp + rnd(0.6), h.z * exp + rnd(0.6));
          targQuat[i].setFromEuler(new THREE.Euler(rnd(Math.PI), rnd(Math.PI), rnd(Math.PI)));
        });
        assembled = false;
        phaseTimer = 2.6;
      }
      function assemble() {
        cubies.forEach((_, i) => {
          targPos[i].copy(homes[i]);
          targQuat[i].identity();
        });
        assembled = true;
        phaseTimer = 2.2;
      }

      // ── Render döngüsü ──
      let last = performance.now();
      let raf = 0;
      const animate = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!reduce) {
          phaseTimer -= dt;
          if (phaseTimer <= 0) (assembled ? scatter : assemble)();
          const a = 1 - Math.exp(-dt * 2.6); // yumuşak yaklaşma
          cubies.forEach((c, i) => {
            c.position.lerp(targPos[i], a);
            c.quaternion.slerp(targQuat[i], a);
          });
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
        metalMat.dispose();
        letterMats.forEach((m) => {
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
