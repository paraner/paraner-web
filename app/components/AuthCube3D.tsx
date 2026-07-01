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
      renderer.toneMappingExposure = 1.0;
      // Cubie'ler birbirine gölge düşürsün → küpün üstünde gerçek derinlik/AO (siyah zeminde bile görünür).
      // Sadece masaüstü: shadow map GPU yükü mobilde küpü zorluyordu.
      const enableShadows = !onMobile;
      if (enableShadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
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
      const key = new THREE.DirectionalLight(0xffffff, 2.3);
      key.position.set(6, 10, 7);
      if (enableShadows) {
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        const sc = key.shadow.camera;
        sc.near = 1;
        sc.far = 30;
        sc.left = sc.bottom = -3;
        sc.right = sc.top = 3;
        key.shadow.bias = -0.0004; // akne (self-shadow titremesi) önler
        key.shadow.normalBias = 0.03; // yuvarlatılmış kenarlarda akneyi keser
        key.shadow.radius = 4; // PCF yumuşak kenar
      }
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xcdd6e0, 1.9); // kenar/pah ışığı — siluet ayrışsın
      rim.position.set(-7, 3, -8);
      scene.add(rim);
      const spec = new THREE.PointLight(0xffffff, 8, 50, 1.8); // sıcak nokta kısıldı (B adımı ayarı)
      spec.position.set(5, -1, 6);
      scene.add(spec);
      const front = new THREE.DirectionalLight(0xffffff, 0.6);
      front.position.set(0, 1.5, 9);
      scene.add(front);
      scene.add(new THREE.AmbientLight(0xffffff, 0.2)); // eşit yumuşak dolgu

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
      // MGZR panel arka planı — referans görseldeki KOYU petek (honeycomb) delik ızgarası.
      // TEK PARÇA (repeat=1, 512px) çizilir → döşeme dikişi/ek yeri yok, hex yapısı temiz.
      // Aynı desenden iki doku: renk (map, sRGB) + kabartma (bumpMap), birebir hizalı.
      const mgzrGrid = () =>
        mkTex(512, 1, (g, n) => {
          g.fillStyle = "#1a1b1f"; // delikler arası koyu yüzey
          g.fillRect(0, 0, n, n);
          const r = 10; // delik yarıçapı → panelde ~25 delik (referansa yakın, temiz)
          const sx = r * 2.0; // yatay aralık (delikler neredeyse bitişik)
          const sy = sx * 0.866; // altıgen satır yüksekliği
          for (let row = 0, y = -sy; y < n + sy; y += sy, row++) {
            const off = row % 2 ? sx / 2 : 0;
            for (let x = -sx; x < n + sx; x += sx) {
              const cx = x + off;
              const grd = g.createRadialGradient(cx, y, 1, cx, y, r);
              grd.addColorStop(0, "#020203"); // çukur merkezi = neredeyse siyah (delik)
              grd.addColorStop(0.62, "#0a0b0d");
              grd.addColorStop(0.9, "#42454c"); // kenar = parlak rim
              grd.addColorStop(1, "#1a1b1f");
              g.fillStyle = grd;
              g.beginPath();
              g.arc(cx, y, r, 0, Math.PI * 2);
              g.fill();
            }
          }
        });
      const mgzrMapTex = mgzrGrid();
      mgzrMapTex.colorSpace = THREE.SRGBColorSpace; // renk olarak kullanılıyor → sRGB
      const mgzrBumpTex = mgzrGrid(); // kabartma (linear) → derinlik
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
      // Karbon + ince metalik parıltı — koyu karbon (grafit) zemin + çok küçük parlak glint noktaları (₿).
      const speckleTex = mkTex(512, 1, (g, n) => {
        g.fillStyle = "#0d0e12"; // karbon zemin (grafit, koyu)
        g.fillRect(0, 0, n, n);
        for (let i = 0; i < 850; i++) {
          const x = Math.random() * n;
          const y = Math.random() * n;
          const rr = Math.random() * 0.9 + 0.4; // çok küçük parıltı tanesi
          const v = Math.random() > 0.86 ? 235 : 95 + ((Math.random() * 70) | 0); // çoğu sönük gri, az sayıda parlak glint
          g.fillStyle = `rgba(${v},${v},${v + 8},${0.5 + Math.random() * 0.5})`; // hafif soğuk (mavi) ton → metalik karbon
          g.beginPath();
          g.arc(x, y, rr, 0, Math.PI * 2);
          g.fill();
        }
      });
      speckleTex.colorSpace = THREE.SRGBColorSpace; // renk (albedo) → sRGB

      // ── Her sembole ÖZEL KOYU/premium panel (titanyum · karbon · onyx). Renk değil FINISH ayrışır.
      //    Resend tarzı: koyu, parlak, ince ton/doku farkı; neredeyse monokrom. MGZR BENZERSIZ (karbon).
      const matDollar = new THREE.MeshPhysicalMaterial({ color: 0x070809, metalness: 1, roughness: 0.18, clearcoat: 0.9, clearcoatRoughness: 0.2, envMapIntensity: 1.1 }); // piyano siyahı (ayna gloss)
      const matEuro = new THREE.MeshStandardMaterial({ color: 0x1b1e23, metalness: 0.94, roughness: 0.5, roughnessMap: brushedTex, envMapIntensity: 0.85 }); // fırçalı titanyum (koyu)
      const matPound = new THREE.MeshStandardMaterial({ color: 0x121419, metalness: 0.55, roughness: 0.66, envMapIntensity: 0.85 }); // satin antrasit (mat)
      const matLira = new THREE.MeshPhysicalMaterial({ color: 0x16191e, metalness: 1, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.95 }); // koyu gunmetal (yarı parlak)
      const matBtc = new THREE.MeshStandardMaterial({ color: 0xffffff, map: speckleTex, metalness: 0.7, roughness: 0.45, envMapIntensity: 1.0 }); // karbon + ince metalik parıltı (₿)
      const matMgzr = new THREE.MeshStandardMaterial({ color: 0xffffff, map: mgzrMapTex, metalness: 0.9, roughness: 0.5, bumpMap: mgzrBumpTex, bumpScale: 0.3, envMapIntensity: 0.85 }); // KOYU petek delikli yüz (sadece MGZR arka planı)
      const matParaner = new THREE.MeshPhysicalMaterial({ color: 0x0c1310, metalness: 1, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.95 }); // koyu nötr-siyah (gloss, kısık yansıma)
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, metalness: 0.7, roughness: 0.56, bumpMap: frameXdrTex, bumpScale: 0.16, envMapIntensity: 0.9 }); // koyu premium XDR delikli kafes (MGZR arka planı gibi, mat)
      const ownedMats = [matDollar, matEuro, matPound, matLira, matBtc, matMgzr, matParaner, frameMat];

      // ── Damga/kabartma para birimi ──
      // Sembol → İKİ doku: KESKİN alpha maskesi (kenarda yarı-saydam halka/çizgi olmasın) +
      // YUMUŞAK bump (kabartma rölyefi). Eskiden tek blur'lu doku ikisini de yapıyordu →
      // yarı-saydam kenar bandı logo çevresinde "çizgi geçiyormuş gibi" görünüyordu.
      const symCanvas = (ch: string, blur: number) => {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d")!;
        g.fillStyle = "#000";
        g.fillRect(0, 0, 256, 256);
        if (blur) g.filter = `blur(${blur}px)`;
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
      const symTex = (ch: string) => ({ alpha: symCanvas(ch, 0.5), bump: symCanvas(ch, 1.6) });
      // Görsel (şeffaf PNG) → sembollerle aynı mantık: KESKİN alpha + YUMUŞAK bump.
      const imgTex = (img: HTMLImageElement | null, margin: number) => {
        if (!img) return null;
        // önce keskin beyaz siluet (en-boy korunarak kareye sığdır)
        const sil = document.createElement("canvas");
        sil.width = sil.height = 256;
        const sg = sil.getContext("2d")!;
        const r = Math.min((256 - 2 * margin) / img.width, (256 - 2 * margin) / img.height);
        const w = img.width * r, h = img.height * r;
        sg.drawImage(img, (256 - w) / 2, (256 - h) / 2, w, h);
        sg.globalCompositeOperation = "source-in";
        sg.fillStyle = "#fff";
        sg.fillRect(0, 0, 256, 256);
        // siluetten ayrı blur'larla iki doku: alpha (keskin) + bump (yumuşak)
        const render = (blur: number) => {
          const c = document.createElement("canvas");
          c.width = c.height = 256;
          const g = c.getContext("2d")!;
          g.fillStyle = "#000";
          g.fillRect(0, 0, 256, 256);
          if (blur) g.filter = `blur(${blur}px)`;
          g.drawImage(sil, 0, 0);
          g.filter = "none";
          const t = new THREE.CanvasTexture(c);
          t.anisotropy = 4;
          return t;
        };
        return { alpha: render(0.5), bump: render(1.8) };
      };

      const mkSymMat = (tex: { alpha: InstanceType<typeof THREE.CanvasTexture>; bump: InstanceType<typeof THREE.CanvasTexture> }) =>
        new THREE.MeshStandardMaterial({
          color: 0x262a31, // panel tonuna yakın → daha az "sticker", daha gömük
          metalness: 0.7,
          roughness: 0.5, // mat → ışıkta yüzeyin parçası gibi, parlak decal değil
          bumpMap: tex.bump,
          bumpScale: 0.24, // kabartma rölyefi (kenar çizgisi olmadan embossed his)
          alphaMap: tex.alpha,
          alphaTest: 0.45, // yarı-saydam kenar bandını at → logo çevresinde "çizgi/halka" kalmaz
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          envMapIntensity: 0.9,
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
      const so = SIZE / 2 + 0.008; // panele daha yakın → havada durmasın
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
            const body = new THREE.Mesh(boxGeo, frameMat);
            if (enableShadows) {
              body.castShadow = true;
              body.receiveShadow = true;
            }
            cubie.add(body);
            faceDef.forEach((f) => {
              // Her yüz = bir damga: kendi paneli (iç renk/tasarım) + üstüne kabartma sembol
              const st = pickStamp();
              const panel = new THREE.Mesh(panelGeo, st.panel);
              panel.position.set(f.p[0] * fo, f.p[1] * fo, f.p[2] * fo);
              panel.rotation.set(...f.r);
              if (enableShadows) panel.receiveShadow = true;
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

      // ── Post-processing (sadece masaüstü) — sinematik "render edilmiş" his ──
      // Sadece film grain (referanstaki ince doku/noise) kaldı. Bloom + Vignette KALDIRILDI:
      // ikisi de şeffaf (alpha:true) canvas'ta boş pikselleri kirletip küpün etrafında görünür
      // "çerçeve/hale" yapıyordu (detay aşağıda). SSAO eklemedim: gölge haritası cubie
      // aralarındaki AO'yu zaten geometri-doğru veriyor (SSAO halo riski + tekrar).
      let composer: import("three/examples/jsm/postprocessing/EffectComposer.js").EffectComposer | null = null;
      let disposePost = () => {};
      if (enableShadows) {
        const [{ EffectComposer }, { RenderPass }, { FilmPass }, { OutputPass }] =
          await Promise.all([
            import("three/examples/jsm/postprocessing/EffectComposer.js"),
            import("three/examples/jsm/postprocessing/RenderPass.js"),
            import("three/examples/jsm/postprocessing/FilmPass.js"),
            import("three/examples/jsm/postprocessing/OutputPass.js"),
          ]);
        if (disposed || !ref.current) return;
        composer = new EffectComposer(renderer);
        composer.setSize(W0, H0);
        composer.addPass(new RenderPass(scene, camera)); // sahne → HDR (tonemap en sonda)
        // Bloom KALDIRILDI: dönen metalde highlight'lar patlayıp arka plana hale yapıyordu.
        // VIGNETTE KALDIRILDI (küp "çerçeveli" görünüyordu): canvas alpha:true + premultipliedAlpha
        // ile boş pikseller (0,0,0,0) = şeffaf. Vignette bu ŞEFFAF piksellere darkness=1.12 ile
        // NEGATİF RGB yazıyordu (alpha yine 0); OutputPass'teki ACES tonemap o negatifi POZİTİFE
        // çeviriyor (~-0.07 → +0.09) → premultiplied compositor bunu sayfa zeminine EKLİYOR →
        // küp bölgesi çevresinden daha açık bir DİKDÖRTGEN oluyordu. İyi ekranda görünmez ama
        // düşük kaliteli/kalibrasyonsuz panelde (Windows dizüstü) belirgin kutu. Vignette gidince
        // boş pikseller tam (0,0,0,0) kalır → küp gerçekten şeffaf, her ekranda "boşlukta" durur.
        // (Film grain güvenli: siyaha 0 ekler — 0 + 0*noise = 0 → şeffaflığı bozmaz.)
        if (!reduce) composer.addPass(new FilmPass(0.16, false)); // ince film grain (reduced-motion'da kapalı)
        composer.addPass(new OutputPass()); // tonemap + sRGB — zincirin EN SONUNDA tek sefer
        disposePost = () => {
          composer?.dispose?.();
        };
      }
      // Post varsa composer üzerinden çiz; yoksa (mobil/WebGL) doğrudan renderer.
      const renderFrame = () => (composer ? composer.render() : renderer.render(scene, camera));

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

        renderFrame();
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
      renderFrame();
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
        composer?.setSize(Wn, Hn); // post-processing tampon boyutları da güncellensin
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
        [mgzrMapTex, mgzrBumpTex, brushedTex, frameXdrTex, speckleTex].forEach((t) => t.dispose());
        ownedMats.forEach((m) => m.dispose());
        stamps.forEach((s) => {
          s.sym.alphaMap?.dispose();
          s.sym.bumpMap?.dispose(); // alpha'dan ayrı doku → ayrıca bırak
          s.sym.dispose();
        });
        pmrem.dispose();
        disposePost(); // composer + bloom render target'larını bırak
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
