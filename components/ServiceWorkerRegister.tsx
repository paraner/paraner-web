"use client";

import { useEffect } from "react";

// Açılış service worker'ını kaydeder. boot.html'i cihaza cache'ler →
// sonraki açılışlarda dock'a basınca splash AĞ BEKLEMEDEN anında gelir.
// Yalnız boot.html cache'lenir; uygulama/veri ağdan taze gelir (bayat içerik yok).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
