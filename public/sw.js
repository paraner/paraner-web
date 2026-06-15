// Paraner açılış service worker — SADECE boot.html'i cache'ler (anında açılış).
// Uygulama sayfaları / API / veri CACHE'LENMEZ → bayat içerik riski yok, güvenli.
const CACHE = "paraner-boot-v2";
const BOOT = "/boot.html";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.add(BOOT)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Yalnız boot.html: önce cache'den ver (anında), arkadan ağdan tazele. Gerisi normal ağ.
  if (e.request.mode === "navigate" && url.pathname === BOOT) {
    e.respondWith(
      caches.match(BOOT).then((cached) => {
        const fromNet = fetch(e.request)
          .then((res) => {
            caches.open(CACHE).then((c) => c.put(BOOT, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || fromNet;
      })
    );
  }
});
