"use client";

import { useEffect, useRef } from "react";

/* Sağdaki paneller TEK olmalı — biri açılınca diğeri kapanır.
   Panelde sağ kenarı paylaşan iki şey var: işlem/fatura DETAY çekmecesi (`.tx-drawer`) ve
   Parla sohbeti (`.parla-drawer`). İkisi aynı yerde durduğu için üstteki alttakini örtüyordu:
   Parla açıkken bir işleme tıklayınca detay açılıyor ama görünmüyordu (Mehmet, 2026-07-24).

   Çözüm merkezi bir yönetici değil, küçük bir haberleşme: bir panel açılırken "ben açıldım"
   diye duyurur, diğerleri duyup kendini kapatır. Yeni bir sağ panel eklenirse aynı iki satırı
   ekle — birbirlerini tanımaları gerekmez. */

const EVT = "paraner:right-panel";

/** "Ben açıldım" duyurusu — açılış anında (state'i set ederken) çağır. */
export function announceRightPanel(id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT, { detail: id }));
}

/** Başka bir sağ panel açılınca kendini kapat.
    `close` her render'da yeniden yazılabilir (satır içi ok fonksiyonu olabilir) — ref'te
    tutuluyor, o yüzden dinleyici bir kez bağlanır, her render'da sökülüp takılmaz. */
export function useCloseOnOtherRightPanel(id: string, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const onOpen = (e: Event) => {
      const who = (e as CustomEvent<string>).detail;
      if (who !== id) closeRef.current();
    };
    window.addEventListener(EVT, onOpen);
    return () => window.removeEventListener(EVT, onOpen);
  }, [id]);
}

/* ─── "Parla veri değiştirdi" duyurusu ────────────────────────────────────────
   `router.refresh()` SUNUCU verisini tazeler; ama sayfaların kendi istemci-tarafı
   listeleri (ör. özel kategoriler) ondan habersiz kalır. Parla bir kategori oluşturup
   işlemi onunla kaydettiğinde İşlemler sayfası etiketi çözemiyor, ham kimlik
   ("custom_ev_gideri") gösteriyordu (Mehmet, 24.07 canlı).
   Parla değişiklikten sonra duyurur; ilgilenen sayfa kendi verisini yeniler. */
const VERI_EVT = "paraner:veri-degisti";

export function announceDataChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(VERI_EVT));
}

export function useOnDataChanged(handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const fn = () => ref.current();
    window.addEventListener(VERI_EVT, fn);
    return () => window.removeEventListener(VERI_EVT, fn);
  }, []);
}
