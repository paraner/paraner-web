"use client";

import { useEffect, useRef } from "react";
import type { Group } from "three";

// Sol panel (masaüstü) — sıfırdan, üst düzey Three.js küp (ÖZGÜN).
//  • Eğimli cubie'ler + yüz-başına kakma panel: parlak lake · karbon · fırçalı gri · ızgara · satin
//  • Filmik ışık (ACES) + önden dolgu + ortam yansıması; her yüzde damga para birimi
//  • Giriş: tam ortadan uzaktan gelir, oturmaya yakın dönmeye başlar
//  • Sürükle → küp itilen yöne döner (momentumlu); boşta yavaş çok-eksenli tumble
//  • reduced-motion → durur. ≤1024px sol panel gizli; three dinamik import; WebGL yoksa CSS arka planı.
export default function AuthCube3D({ className }: { className?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      const THREE = await import("three");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
      if (disposed || !ref.current) return;

      const el = ref.current;
      const W0 = el.clientWidth || 600;
      const H0 = el.clientHeight || 800;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W0, H0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block;cursor:grab;touch-action:none;";
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, W0 / H0, 0.1, 100);
      camera.position.set(5.6, 4.2, 7.2);
      camera.lookAt(0, -0.1, 0);

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

      // ── Işık ──
      const key = new THREE.DirectionalLight(0xffffff, 3.0);
      key.position.set(6, 10, 7);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xd7e4f2, 1.7);
      rim.position.set(-7, 3, -8);
      scene.add(rim);
      const spec = new THREE.PointLight(0xffffff, 22, 50, 1.8);
      spec.position.set(5, -1, 6);
      scene.add(spec);
      const front = new THREE.DirectionalLight(0xffffff, 0.95);
      front.position.set(0, 1.5, 9);
      scene.add(front);
      scene.add(new THREE.AmbientLight(0xffffff, 0.14));

      // ── Dokular ──
      const mkTex = (n: number, rep: number, draw: (g: CanvasRenderingContext2D, n: number) => void) => {
        const c = document.createElement("canvas");
        c.width = c.height = n;
        draw(c.getContext("2d")!, n);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rep, rep);
        return t;
      };
      const carbonTex = mkTex(128, 3, (g, n) => {
        const s = 8;
        for (let y = 0; y < n; y += s)
          for (let x = 0; x < n; x += s) {
            const d = (x / s + y / s) % 2 === 0;
            g.fillStyle = d ? "#2a2a2a" : "#0a0a0a";
            g.fillRect(x, y, s, s);
            g.fillStyle = d ? "#3a3a3a" : "#161616";
            g.fillRect(x, y, s, s / 2);
          }
      });
      const brushedTex = mkTex(128, 2, (g, n) => {
        g.fillStyle = "#777";
        g.fillRect(0, 0, n, n);
        for (let i = 0; i < 900; i++) {
          const v = Math.random() < 0.5 ? 40 : 200;
          g.strokeStyle = `rgba(${v},${v},${v},0.08)`;
          const y = Math.random() * n;
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(n, y + (Math.random() - 0.5) * 2);
          g.stroke();
        }
      });
      const grilleTex = mkTex(96, 3, (g, n) => {
        g.fillStyle = "#bbb";
        g.fillRect(0, 0, n, n);
        g.fillStyle = "#000";
        for (let y = 0; y < n; y += 12)
          for (let x = 0; x < n; x += 12) {
            g.beginPath();
            g.arc(x + 6, y + 6, 3.6, 0, Math.PI * 2);
            g.fill();
          }
      });

      // ── Yüz panel malzemeleri ──
      const pGloss = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, metalness: 1.0, roughness: 0.13, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 1.35 });
      const pCarbon = new THREE.MeshStandardMaterial({ color: 0x121317, metalness: 0.62, roughness: 0.52, bumpMap: carbonTex, bumpScale: 0.03, envMapIntensity: 0.95 });
      const pBrushed = new THREE.MeshStandardMaterial({ color: 0x3a4047, metalness: 0.96, roughness: 0.34, roughnessMap: brushedTex, envMapIntensity: 1.2 });
      const pGrille = new THREE.MeshStandardMaterial({ color: 0x0e1013, metalness: 0.82, roughness: 0.48, bumpMap: grilleTex, bumpScale: 0.045, envMapIntensity: 0.9 });
      const pSatin = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, metalness: 0.5, roughness: 0.64 });
      const facePool = [pGloss, pGloss, pGloss, pCarbon, pCarbon, pBrushed, pBrushed, pGrille, pSatin];
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x070708, metalness: 0.9, roughness: 0.4 });
      const ownedMats = [pGloss, pCarbon, pBrushed, pGrille, pSatin, frameMat];

      // ── Damga/kabartma para birimi ──
      const symTex = (ch: string) => {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d")!;
        g.fillStyle = "#000";
        g.fillRect(0, 0, 256, 256);
        g.filter = "blur(1.4px)";
        g.fillStyle = "#fff";
        g.font = "800 156px -apple-system, 'Segoe UI', Arial, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(ch, 128, 142);
        g.filter = "none";
        const t = new THREE.CanvasTexture(c);
        t.anisotropy = 4;
        return t;
      };
      const symMats = ["$", "€", "£", "₺", "¥"].map((ch) => {
        const t = symTex(ch);
        return new THREE.MeshStandardMaterial({
          color: 0x2b2f37,
          metalness: 0.92,
          roughness: 0.3,
          bumpMap: t,
          bumpScale: 0.07,
          alphaMap: t,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          envMapIntensity: 1.1,
        });
      });

      // ── Küp kümesi ──
      const SIZE = 0.98;
      const RAD = 0.08;
      const SCALE = 0.8;
      const group = new THREE.Group();
      group.rotation.set(0.32, 0.62, 0.06);
      group.scale.setScalar(reduce ? SCALE : SCALE * 0.05); // giriş: küçük başla (konum ORİJİN = ortadan)
      scene.add(group);

      const boxGeo = new RoundedBoxGeometry(SIZE, SIZE, SIZE, 5, RAD);
      const flat = SIZE - 2 * RAD - 0.04;
      const panelGeo = new THREE.PlaneGeometry(flat, flat);
      const symGeo = new THREE.PlaneGeometry(flat * 0.55, flat * 0.55);
      const fo = SIZE / 2 + 0.004;
      const so = SIZE / 2 + 0.012;
      const faceDef: Array<{ p: [number, number, number]; r: [number, number, number] }> = [
        { p: [1, 0, 0], r: [0, Math.PI / 2, 0] },
        { p: [-1, 0, 0], r: [0, -Math.PI / 2, 0] },
        { p: [0, 1, 0], r: [-Math.PI / 2, 0, 0] },
        { p: [0, -1, 0], r: [Math.PI / 2, 0, 0] },
        { p: [0, 0, 1], r: [0, 0, 0] },
        { p: [0, 0, -1], r: [0, Math.PI, 0] },
      ];
      const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];

      const cubies: Group[] = [];
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const cubie = new THREE.Group();
            cubie.position.set(x, y, z);
            cubie.add(new THREE.Mesh(boxGeo, frameMat));
            faceDef.forEach((f) => {
              const panel = new THREE.Mesh(panelGeo, pick(facePool));
              panel.position.set(f.p[0] * fo, f.p[1] * fo, f.p[2] * fo);
              panel.rotation.set(...f.r);
              cubie.add(panel);
              const sym = new THREE.Mesh(symGeo, pick(symMats));
              sym.position.set(f.p[0] * so, f.p[1] * so, f.p[2] * so);
              sym.rotation.set(...f.r);
              cubie.add(sym);
            });
            group.add(cubie);
            cubies.push(cubie);
          }

      // ── Sürükle → küp itilen yöne döner (momentumlu) ──
      const WORLD_Y = new THREE.Vector3(0, 1, 0);
      const WORLD_X = new THREE.Vector3(1, 0, 0);
      const SPIN_Y = 0.36; // boşta yatay (yavaşlatıldı)
      const SPIN_X = 0.22; // boşta dikey takla
      const SENS = 0.006;
      let dragging = false;
      let lx = 0;
      let ly = 0;
      let velY = SPIN_Y;
      let velX = SPIN_X;
      const dom = renderer.domElement;
      const onDown = (e: PointerEvent) => {
        dragging = true;
        lx = e.clientX;
        ly = e.clientY;
        dom.setPointerCapture?.(e.pointerId);
        dom.style.cursor = "grabbing";
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lx;
        const dy = e.clientY - ly;
        lx = e.clientX;
        ly = e.clientY;
        group.rotateOnWorldAxis(WORLD_Y, dx * SENS);
        group.rotateOnWorldAxis(WORLD_X, dy * SENS);
        velY = dx * SENS * 60; // bırakınca momentum bu yönde sürer
        velX = dy * SENS * 60;
      };
      const onUp = () => {
        dragging = false;
        dom.style.cursor = "grab";
      };
      dom.addEventListener("pointerdown", onDown);
      dom.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      // ── Hamle motoru ──
      const AXES: Array<"x" | "y" | "z"> = ["x", "y", "z"];
      type Part = { axis: "x" | "y" | "z"; angle: number; pivot: InstanceType<typeof THREE.Group>; members: Group[] };
      let move: { dur: number; t: number; parts: Part[] } | null = null;
      let restTimer = 1.4;
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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
        if (r < 0.46) {
          parts = [makePart(axis, coin(), (coin() * Math.PI) / 2)];
          dur = 1.1 + Math.random() * 0.3;
        } else if (r < 0.68) {
          parts = [makePart(axis, coin(), coin() * Math.PI)];
          dur = 1.8;
        } else {
          const a = Math.random() < 0.5 ? Math.PI / 2 : Math.PI;
          parts = [makePart(axis, 1, a), makePart(axis, -1, -a)];
          dur = a > Math.PI / 2 ? 1.6 : 1.0;
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
        restTimer = Math.random() < 0.2 ? 0.14 : 0.9 + Math.random() * 1.9;
      }

      // ── Giriş + render ──
      let intro = reduce ? 1 : 0;
      const INTRO_DUR = 1.25;
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      let last = performance.now();
      let raf = 0;
      const animate = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        if (intro < 1) {
          // tam ortadan (orijin) uzaktan gelir, büyüyerek oturur
          intro = Math.min(1, intro + dt / INTRO_DUR);
          group.scale.setScalar(SCALE * (0.05 + 0.95 * easeOut(intro)));
        }

        if (!reduce) {
          // oturmaya yakın dönmeye başla (giriş %55'inden sonra rampa)
          const spinF = Math.max(0, Math.min(1, (intro - 0.55) / 0.45));
          if (!dragging) {
            velY += (SPIN_Y - velY) * (1 - Math.exp(-dt * 1.2));
            velX += (SPIN_X - velX) * (1 - Math.exp(-dt * 1.2));
            group.rotateOnWorldAxis(WORLD_Y, velY * dt * spinF);
            group.rotateOnWorldAxis(WORLD_X, velX * dt * spinF);
          }
          if (intro >= 1) {
            if (move) {
              move.t = Math.min(1, move.t + dt / move.dur);
              const e = ease(move.t);
              move.parts.forEach((p) => (p.pivot.rotation[p.axis] = e * p.angle));
              if (move.t >= 1) finishMove();
            } else {
              restTimer -= dt;
              if (restTimer <= 0) pickMove();
            }
          }
        }

        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();

      const ro = new ResizeObserver(() => {
        const Wn = el.clientWidth;
        const Hn = el.clientHeight;
        if (!Wn || !Hn) return;
        camera.aspect = Wn / Hn;
        camera.updateProjectionMatrix();
        renderer.setSize(Wn, Hn);
      });
      ro.observe(el);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        dom.removeEventListener("pointerdown", onDown);
        dom.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        boxGeo.dispose();
        panelGeo.dispose();
        symGeo.dispose();
        [carbonTex, brushedTex, grilleTex].forEach((t) => t.dispose());
        ownedMats.forEach((m) => m.dispose());
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

  return (
    <div className={className ?? "auth-visual auth-cube"} aria-hidden="true">
      <div ref={ref} className="cube-stage" />
    </div>
  );
}
