"use client";

import { useEffect, useRef } from "react";
import type { Group } from "three";

// Sol panel (masaüstü) — sıfırdan, üst düzey Three.js küp (Resend kalitesinde, ÖZGÜN).
//  • Eğimli cubie'ler + yüz-başına kakma panel: parlak lake · karbon · fırçalı gri · ızgara · satin
//  • Filmik ışık (ACES) + yumuşak düşen gölge + ortam yansıması (clearcoat lake)
//  • Hareket: yavaş döner; arada tek 90° / 180° / ALT+ÜST ters hamle (rafine easing)
//  • Mouse ile TUT-DÖNDÜR. Birkaç yüzde silik işlemeli para birimi (marka). reduced-motion → durur.
//  • ≤1024px sol panel gizli → masaüstüne özel; three dinamik import; WebGL yoksa CSS arka planı.
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
      const W0 = el.clientWidth || 600;
      const H0 = el.clientHeight || 800;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

      // ── Işık ──
      const key = new THREE.DirectionalLight(0xffffff, 3.0);
      key.position.set(6, 10, 7);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xd7e4f2, 1.7); // arka-yan rim (nötr-serin kenar, yeşil yok)
      rim.position.set(-7, 3, -8);
      scene.add(rim);
      const spec = new THREE.PointLight(0xffffff, 22, 50, 1.8);
      spec.position.set(5, -1, 6);
      scene.add(spec);
      const front = new THREE.DirectionalLight(0xffffff, 0.95); // karşıdan ince dolgu → ön yüzler kararmaz
      front.position.set(0, 1.5, 9);
      scene.add(front);
      scene.add(new THREE.AmbientLight(0xffffff, 0.14));

      // ── Dokular ──
      const tex = (n: number, rep: number, draw: (g: CanvasRenderingContext2D, n: number) => void) => {
        const c = document.createElement("canvas");
        c.width = c.height = n;
        draw(c.getContext("2d")!, n);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rep, rep);
        return t;
      };
      const carbonTex = tex(128, 3, (g, n) => {
        // 2x2 twill karbon dokusu
        const s = 8;
        for (let y = 0; y < n; y += s)
          for (let x = 0; x < n; x += s) {
            const d = ((x / s + y / s) % 2) === 0;
            g.fillStyle = d ? "#2a2a2a" : "#0a0a0a";
            g.fillRect(x, y, s, s);
            g.fillStyle = d ? "#3a3a3a" : "#161616";
            g.fillRect(x, y, s, s / 2);
          }
      });
      const brushedTex = tex(128, 2, (g, n) => {
        g.fillStyle = "#777";
        g.fillRect(0, 0, n, n);
        for (let i = 0; i < 900; i++) {
          g.strokeStyle = `rgba(${Math.random() < 0.5 ? 40 : 200},${Math.random() < 0.5 ? 40 : 200},${Math.random() < 0.5 ? 40 : 200},0.08)`;
          const y = Math.random() * n;
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(n, y + (Math.random() - 0.5) * 2);
          g.stroke();
        }
      });
      const grilleTex = tex(96, 3, (g, n) => {
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

      // ── Damga/kabartma para birimi: aynı doku hem alphaMap (şekil) hem bumpMap (kabartma)
      //    → metale basılmış, hafif taşan rölyef. Hafif blur = yumuşak kenar rampası. ──
      const symTex = (ch: string) => {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d")!;
        g.fillStyle = "#000"; // siyah = kabartmanın düz tabanı
        g.fillRect(0, 0, 256, 256);
        g.filter = "blur(1.4px)";
        g.fillStyle = "#fff"; // beyaz = yükselen (kabarık) bölge
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
          color: 0x2b2f37, // küple uyumlu metal — damga aynı metalden basılmış gibi
          metalness: 0.92,
          roughness: 0.3,
          bumpMap: t, // kabartma rölyefi → ışıkta öne çıkar
          bumpScale: 0.07,
          alphaMap: t, // yalnız sembol görünür
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
      // Giriş animasyonu başlangıcı: uzakta + küçük (reduced-motion'da direkt yerinde)
      group.scale.setScalar(reduce ? SCALE : SCALE * 0.05);
      group.position.z = reduce ? 0 : -8;
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
            const box = new THREE.Mesh(boxGeo, frameMat);
            box.castShadow = true;
            box.receiveShadow = true;
            cubie.add(box);
            faceDef.forEach((f) => {
              const panel = new THREE.Mesh(panelGeo, pick(facePool));
              panel.position.set(f.p[0] * fo, f.p[1] * fo, f.p[2] * fo);
              panel.rotation.set(...f.r);
              cubie.add(panel);
              // HER yüze para birimi (karışık)
              const sym = new THREE.Mesh(symGeo, pick(symMats));
              sym.position.set(f.p[0] * so, f.p[1] * so, f.p[2] * so);
              sym.rotation.set(...f.r);
              cubie.add(sym);
            });
            group.add(cubie);
            cubies.push(cubie);
          }

      // ── OrbitControls ──
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.rotateSpeed = 0.7;
      controls.autoRotate = !reduce;
      controls.autoRotateSpeed = 0.3; // yavaş, sürekli (hiç durmaz)
      controls.target.set(0, -0.1, 0);

      const dom = renderer.domElement;
      const grab = () => (dom.style.cursor = "grabbing");
      const release = () => (dom.style.cursor = "grab");
      dom.addEventListener("pointerdown", grab);
      window.addEventListener("pointerup", release);

      // ── Hamle motoru ──
      const AXES: Array<"x" | "y" | "z"> = ["x", "y", "z"];
      type Part = { axis: "x" | "y" | "z"; angle: number; pivot: InstanceType<typeof THREE.Group>; members: Group[] };
      let move: { dur: number; t: number; parts: Part[] } | null = null;
      let restTimer = reduce ? Infinity : 1.4;
      // easeInOutCubic — başta ve sonda yumuşak (sert/ani değil)
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
          // tek katman 90° — sakin
          parts = [makePart(axis, coin(), (coin() * Math.PI) / 2)];
          dur = 1.1 + Math.random() * 0.3;
        } else if (r < 0.68) {
          // tek katman 180° (iki kez) — daha ağır
          parts = [makePart(axis, coin(), coin() * Math.PI)];
          dur = 1.8;
        } else {
          // ALT+ÜST ters — artık sert değil, ağırdan
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

      // ── Giriş animasyonu (uzaktan/küçük → öne gelip yumuşak durur) ──
      let intro = reduce ? 1 : 0;
      const INTRO_DUR = 1.2;
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

      // ── Render ──
      let last = performance.now();
      let raf = 0;
      const animate = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (intro < 1) {
          // ekrana atılmış gibi: uzaktan küçük gelir, öne çıkar, yavaşlayarak oturur
          intro = Math.min(1, intro + dt / INTRO_DUR);
          const e = easeOut(intro);
          group.scale.setScalar(SCALE * (0.05 + 0.95 * e));
          group.position.z = -8 * (1 - e);
          group.rotation.y += dt * (1 - e) * 2.0; // girişte ekstra fırıl, sona doğru söner
        } else if (!reduce) {
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

  return <div ref={ref} className="auth-visual auth-cube" aria-hidden="true" />;
}
