"use client";

import { useEffect, useRef } from "react";
import type { Group } from "three";

// Sol panel (masaüstü) — sıfırdan, üst düzey Three.js küp (ÖZGÜN).
//  • Eğimli cubie'ler + yüz-başına kakma panel: parlak lake · karbon · fırçalı gri · ızgara · satin
//  • Filmik ışık (ACES) + önden dolgu + ortam yansıması; her yüzde damga para birimi
//  • Giriş: tam ortadan uzaktan gelir, oturmaya yakın dönmeye başlar
//  • Sürükle → küp itilen yöne döner (momentumlu); boşta yavaş çok-eksenli tumble
//  • reduced-motion → durur. ≤1024px sol panel gizli; three dinamik import; WebGL yoksa CSS arka planı.
export default function AuthCube3D({ className, playIntro = true, zoom = 1 }: { className?: string; playIntro?: boolean; zoom?: number } = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let started = false;
    let cleanup = () => {};

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Küp mobilde CSS ile gizli (display:none). Görünmezken three.js'i YÜKLEME:
    // mobil tarayıcıda gereksiz WebGL context + sonsuz render döngüsü sekmeyi
    // çökertip "sayfa açılmıyor"a yol açıyordu. Sadece container gerçekten görünürse başlat.
    const visible = () => {
      const el = ref.current;
      return !!el && el.offsetParent !== null && el.clientWidth > 0 && el.clientHeight > 0;
    };

    const init = async () => {
      const THREE = await import("three");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
      if (disposed || !ref.current) return;

      // Marka görselleri (şeffaf PNG) — bazı küp yüzlerinde para sembolü yerine kabartma işlenir.
      const loadImg = (src: string) =>
        new Promise<HTMLImageElement | null>((res) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = () => res(null);
          im.src = src;
        });
      const [logoImg, pImg] = await Promise.all([loadImg("/mgzr-icon.png"), loadImg("/paraner-p.png")]);
      if (disposed || !ref.current) return;

      const el = ref.current;
      const W0 = el.clientWidth || 600;
      const H0 = el.clientHeight || 800;

      // preserveDrawingBuffer: buffer present sonrası temizlenmez → compositor
      // canvas'ı ne zaman okursa son çizilen küp orada olur; boş/beyaz kare okunmaz
      // (harici monitör/Windows compositor zamanlama yarışı için ek güvence).
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      // Mobilde pixelRatio'yu düşük tut → bellek/GPU yükü azalır (mobilde küpü oynatabilmek için)
      const onMobile = window.matchMedia("(max-width: 900px)").matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, onMobile ? 1.5 : 2));
      renderer.setSize(W0, H0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      // opacity:0 başla → boş canvas'ın ilk paint'indeki beyaz flaş görünmez;
      // ilk kare render olunca yumuşakça belirir (aşağıda style.opacity="1").
      renderer.domElement.style.cssText =
        "width:100%;height:100%;display:block;cursor:grab;touch-action:none;opacity:0;transition:opacity .5s ease;";
      // NOT: canvas'ı DOM'a burada EKLEMEYİZ — ilk kare çizildikten sonra eklenir
      // (aşağıda). Böylece boş/şeffaf WebGL katmanı hiç compositlenmez → beyaz flaş yok.

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, W0 / H0, 0.1, 100);
      camera.position.set(5.6, 4.2, 7.2);
      camera.position.multiplyScalar(1 / zoom); // zoom>1 → kamera yakınlaşır → küp büyür
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
      // Apple Pro Display XDR arkası: hex dizilimli yarım-küre delik kafesi (bump map) — sadece MGZR
      const xdrTex = mkTex(256, 2, (g, n) => {
        g.fillStyle = "#9a9a9a"; // düz yüzey = orta yükseklik
        g.fillRect(0, 0, n, n);
        const r = 13; // delik yarıçapı
        const sx = r * 2.15; // yatay aralık (delikler neredeyse bitişik)
        const sy = sx * 0.866; // altıgen satır yüksekliği
        for (let row = 0, y = -sy; y < n + sy; y += sy, row++) {
          const off = row % 2 ? sx / 2 : 0;
          for (let x = -sx; x < n + sx; x += sx) {
            const cx = x + off;
            const grd = g.createRadialGradient(cx, y, 1, cx, y, r);
            grd.addColorStop(0, "#101010"); // çukur merkezi = en alçak
            grd.addColorStop(0.55, "#4a4a4a");
            grd.addColorStop(0.86, "#d0d0d0"); // kenar = parlak rim (en yüksek)
            grd.addColorStop(1, "#7a7a7a");
            g.fillStyle = grd;
            g.beginPath();
            g.arc(cx, y, r, 0, Math.PI * 2);
            g.fill();
          }
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
      // Çerçeve (cubie gövdesi) için AYRI, daha sık XDR delikli kafes dokusu (MGZR arka planı gibi).
      // matMgzr ile aynı teknik; kendi repeat'i (4) → ince çerçeve şeritlerinde delikler net görünür.
      const frameXdrTex = mkTex(256, 4, (g, n) => {
        g.fillStyle = "#9a9a9a";
        g.fillRect(0, 0, n, n);
        const r = 13;
        const sx = r * 2.15;
        const sy = sx * 0.866;
        for (let row = 0, y = -sy; y < n + sy; y += sy, row++) {
          const off = row % 2 ? sx / 2 : 0;
          for (let x = -sx; x < n + sx; x += sx) {
            const cx = x + off;
            const grd = g.createRadialGradient(cx, y, 1, cx, y, r);
            grd.addColorStop(0, "#101010");
            grd.addColorStop(0.55, "#4a4a4a");
            grd.addColorStop(0.86, "#d0d0d0");
            grd.addColorStop(1, "#7a7a7a");
            g.fillStyle = grd;
            g.beginPath();
            g.arc(cx, y, r, 0, Math.PI * 2);
            g.fill();
          }
        }
      });
      // ── Her sembole ÖZEL KOYU/premium panel (titanyum · karbon · onyx). Renk değil FINISH ayrışır.
      //    Resend tarzı: koyu, parlak, ince ton/doku farkı; neredeyse monokrom. MGZR BENZERSIZ (karbon).
      const matDollar = new THREE.MeshPhysicalMaterial({ color: 0x08090b, metalness: 1, roughness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.16, envMapIntensity: 1.4 }); // piyano siyahı (ayna gloss)
      const matEuro = new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.96, roughness: 0.4, roughnessMap: brushedTex, envMapIntensity: 1.2 }); // fırçalı titanyum (gri)
      const matPound = new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: 0.55, roughness: 0.66, envMapIntensity: 0.9 }); // satin antrasit (mat)
      const matLira = new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, metalness: 1, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 1.25 }); // koyu gunmetal (yarı parlak)
      const matBtc = new THREE.MeshStandardMaterial({ color: 0x20242b, metalness: 1, roughness: 0.26, envMapIntensity: 1.35 }); // nötr cilalı çelik (soğuk monokrom)
      const matMgzr = new THREE.MeshStandardMaterial({ color: 0x141619, metalness: 0.85, roughness: 0.42, bumpMap: xdrTex, bumpScale: 0.12, envMapIntensity: 1.1 }); // XDR delikli titanyum kafes (sadece MGZR)
      const matParaner = new THREE.MeshPhysicalMaterial({ color: 0x06140f, metalness: 1, roughness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 1.3 }); // koyu teal-siyah (marka fısıltısı, gloss)
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, metalness: 0.7, roughness: 0.56, bumpMap: frameXdrTex, bumpScale: 0.16, envMapIntensity: 0.9 }); // koyu premium XDR delikli kafes (MGZR arka planı gibi, mat)
      const ownedMats = [matDollar, matEuro, matPound, matLira, matBtc, matMgzr, matParaner, frameMat];

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
      // Görsel (şeffaf PNG) → para sembolleriyle aynı kabartma dokusu (beyaz siluet · blur · siyah zemin)
      const imgTex = (img: HTMLImageElement | null, margin: number) => {
        if (!img) return null;
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d")!;
        const sil = document.createElement("canvas");
        sil.width = sil.height = 256;
        const sg = sil.getContext("2d")!;
        // en-boy oranını koru, kareye sığdır → beyaz siluet
        const r = Math.min((256 - 2 * margin) / img.width, (256 - 2 * margin) / img.height);
        const w = img.width * r, h = img.height * r;
        sg.drawImage(img, (256 - w) / 2, (256 - h) / 2, w, h);
        sg.globalCompositeOperation = "source-in";
        sg.fillStyle = "#fff";
        sg.fillRect(0, 0, 256, 256);
        // siyah zemine kabartma için blur'lu bas
        g.fillStyle = "#000";
        g.fillRect(0, 0, 256, 256);
        g.filter = "blur(1.4px)";
        g.drawImage(sil, 0, 0);
        g.filter = "none";
        const t = new THREE.CanvasTexture(c);
        t.anisotropy = 4;
        return t;
      };

      const mkSymMat = (t: InstanceType<typeof THREE.CanvasTexture>) =>
        new THREE.MeshStandardMaterial({
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

      // 7 damga (EŞİT dağılım): her damga = sembol (kabartma) + KENDİ paneli (iç renk/tasarım)
      type SymMat = InstanceType<typeof THREE.MeshStandardMaterial>;
      type Stamp = { sym: SymMat; panel: InstanceType<typeof THREE.Material> };
      const stamps: Stamp[] = [
        { sym: mkSymMat(symTex("$")), panel: matDollar },
        { sym: mkSymMat(symTex("€")), panel: matEuro },
        { sym: mkSymMat(symTex("£")), panel: matPound },
        { sym: mkSymMat(symTex("₺")), panel: matLira },
        { sym: mkSymMat(symTex("₿")), panel: matBtc },
      ];
      const mgzrTex = imgTex(logoImg, 30);
      if (mgzrTex) stamps.push({ sym: mkSymMat(mgzrTex), panel: matMgzr });
      const pTex = imgTex(pImg, 52);
      if (pTex) stamps.push({ sym: mkSymMat(pTex), panel: matParaner });

      // Dengeli torba: her tur tüm damgaları bir kez içerir (karıştırılmış) → eşit dağılım, tutarsızlık yok
      const bag: Stamp[] = [];
      const pickStamp = (): Stamp => {
        if (!bag.length) {
          bag.push(...stamps);
          for (let i = bag.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [bag[i], bag[j]] = [bag[j], bag[i]];
          }
        }
        return bag.pop()!;
      };

      // ── Küp kümesi ──
      const SIZE = 0.98;
      const RAD = 0.08;
      const SCALE = 0.8;
      const group = new THREE.Group();
      group.rotation.set(0.32, 0.62, 0.06);
      const noIntro = reduce || !playIntro;
      group.scale.setScalar(noIntro ? SCALE : SCALE * 0.04); // giriş: küçük (uzakta) başla
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

      const cubies: Group[] = [];
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const cubie = new THREE.Group();
            cubie.position.set(x, y, z);
            cubie.add(new THREE.Mesh(boxGeo, frameMat));
            faceDef.forEach((f) => {
              // Her yüz = bir damga: kendi paneli (iç renk/tasarım) + üstüne kabartma sembol
              const st = pickStamp();
              const panel = new THREE.Mesh(panelGeo, st.panel);
              panel.position.set(f.p[0] * fo, f.p[1] * fo, f.p[2] * fo);
              panel.rotation.set(...f.r);
              cubie.add(panel);
              const sym = new THREE.Mesh(symGeo, st.sym);
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
      let firstMove = true; // oturur oturmaz: garantili 180° tek-kenar hamlesi (bekleme yok)
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const coin = () => (Math.random() < 0.5 ? 1 : -1);
      function makePart(axis: "x" | "y" | "z", layer: number, angle: number): Part {
        const pivot = new THREE.Group();
        group.add(pivot);
        const members = cubies.filter((c) => Math.round(c.position[axis]) === layer);
        members.forEach((c) => pivot.attach(c));
        return { axis, angle, pivot, members };
      }
      function pickMove(first = false) {
        const axis = AXES[(Math.random() * 3) | 0];
        if (first) {
          // Oturur oturmaz ilk hamle: bir kenarı 2 kez (180°) döndür
          move = { dur: 1.2, t: 0, parts: [makePart(axis, coin(), coin() * Math.PI)] };
          return;
        }
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
      // Giriş: küp uzaktan (küçük) HIZLI döne döne büyüyerek gelir; yerine oturunca dönüş BİR ANDA idle'a iner.
      let intro = noIntro ? 1 : 0;
      const INTRO_DUR = 1.1; // hızlı gelip oturma süresi
      const SPIN_FAST = 13; // giriş anındaki hızlı dönme (rad/s)
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      let last = performance.now();
      let raf = 0;
      let paused = false;
      let shown = false; // ilk kare render olunca canvas'ı görünür yap (flaş önleme)
      const animate = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        if (intro < 1) {
          // tam ortadan (orijin) uzaktan gelir, büyüyerek oturur
          intro = Math.min(1, intro + dt / INTRO_DUR);
          group.scale.setScalar(SCALE * (0.04 + 0.96 * easeOut(intro)));
        }

        if (!reduce) {
          // "Yerine oturdu" = küp görünür şekilde tam boyuta ulaştı (ölçek ~%92). Fren tam BU AN başlar →
          // oturur oturmaz bir anda yavaşlar; büyümenin matematiksel bitişini (intro=1) BEKLEMEZ.
          const seated = easeOut(intro) >= 0.92;
          if (!dragging) {
            if (!seated) {
              // GİRİŞ: hızlı dön (döne döne gel)
              velY = SPIN_FAST;
              velX = SPIN_FAST * 0.45;
            } else {
              // OTURDU: dönüş hızını BİR ANDA idle'a indir (sert sönüm ~0.25s)
              velY += (SPIN_Y - velY) * (1 - Math.exp(-dt * 12));
              velX += (SPIN_X - velX) * (1 - Math.exp(-dt * 12));
            }
            group.rotateOnWorldAxis(WORLD_Y, velY * dt);
            group.rotateOnWorldAxis(WORLD_X, velX * dt);
          }
          // Hamleler küp OTURUR OTURMAZ başlar (intro=1 büyüme bitişini beklemez):
          // ilk hamle anında 180° tek-kenar, sonrası restTimer'lı normal akış.
          if (seated) {
            if (move) {
              move.t = Math.min(1, move.t + dt / move.dur);
              const e = ease(move.t);
              move.parts.forEach((p) => (p.pivot.rotation[p.axis] = e * p.angle));
              if (move.t >= 1) finishMove();
            } else if (firstMove) {
              firstMove = false;
              pickMove(true);
            } else {
              restTimer -= dt;
              if (restTimer <= 0) pickMove();
            }
          }
        }

        renderer.render(scene, camera);
        if (!shown) {
          shown = true;
          renderer.domElement.style.opacity = "1";
        }
        if (!paused) raf = requestAnimationFrame(animate);
      };

      // ── Görünmezken render'ı duraklat (CPU/GPU/pil tasarrufu) ──
      // Sekme arka plana geçince (visibilitychange) VEYA küp ekrandan çıkınca
      // (IntersectionObserver) döngü durur; geri görününce kaldığı yerden devam eder.
      const resume = () => {
        if (!paused) return;
        paused = false;
        last = performance.now(); // dt sıçramasın
        raf = requestAnimationFrame(animate);
      };
      const pause = () => {
        if (paused) return;
        paused = true;
        cancelAnimationFrame(raf);
      };
      let tabVisible = !document.hidden;
      let onScreen = true;
      const updateRunning = () => {
        if (tabVisible && onScreen) resume();
        else pause();
      };
      const onVisibility = () => {
        tabVisible = !document.hidden;
        updateRunning();
      };
      document.addEventListener("visibilitychange", onVisibility);
      const io = new IntersectionObserver(
        (entries) => {
          onScreen = entries[0]?.isIntersecting ?? true;
          updateRunning();
        },
        { threshold: 0 }
      );
      io.observe(el);

      // İlk kareyi DOM dışında çiz, sonra canvas'ı ekle → ekrana girdiğinde
      // içinde küp var; boş/beyaz WebGL katmanı hiç görünmez (ara sıra beyaz flaş fix).
      renderer.render(scene, camera);
      el.appendChild(renderer.domElement);

      animate();
      updateRunning(); // yüklenince görünür değilse hemen duraklat

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
        document.removeEventListener("visibilitychange", onVisibility);
        io.disconnect();
        ro.disconnect();
        dom.removeEventListener("pointerdown", onDown);
        dom.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        boxGeo.dispose();
        panelGeo.dispose();
        symGeo.dispose();
        [xdrTex, brushedTex, frameXdrTex].forEach((t) => t.dispose());
        ownedMats.forEach((m) => m.dispose());
        stamps.forEach((s) => {
          s.sym.alphaMap?.dispose();
          s.sym.dispose();
        });
        pmrem.dispose();
        renderer.dispose();
        if (dom.parentElement === el) el.removeChild(dom);
      };
    };

    const tryStart = () => {
      if (started || disposed || !visible()) return;
      started = true;
      window.removeEventListener("resize", tryStart);
      init().catch(() => {
        /* WebGL yok → CSS arka planı görünür kalır */
      });
    };

    // Görünürse hemen başlat; değilse (mobilde gizli) görünür olana dek (yön/boyut
    // değişimi) bekle — three.js böylece mobilde HİÇ yüklenmez.
    tryStart();
    if (!started) window.addEventListener("resize", tryStart);

    return () => {
      disposed = true;
      window.removeEventListener("resize", tryStart);
      cleanup();
    };
  }, []);

  return (
    <div className={className ?? "auth-visual auth-cube"} aria-hidden="true">
      <div ref={ref} className="cube-stage" />
    </div>
  );
}
