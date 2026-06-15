// KILL SWITCH — eski service worker'ı kaldırır + tüm cache'leri temizler.
// (Açılış logosu kaldırıldı; SW + boot.html cache'i artık gereksizdi, jank kaynağıydı.)
// Kurulu cihazlar bu güncel sw.js'i otomatik çekince SW kendini kaldırır.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((c) => c.navigate(c.url));
      } catch (_) {}
    })()
  );
});
