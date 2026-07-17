"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* "Şu an aktif" gerçekten CANLI görünsün diye sayfayı periyodik tazeler.
   Sunucu bileşeni kendi kendine yenilenmez; elle F5 gerekirdi ve panel "canlı" hissi vermezdi.

   Maliyet kontrolü: yalnız sekme GÖRÜNÜRken tazeler (arka planda durur) → açık unutulmuş
   admin sekmesi sonsuza kadar sunucuya yük bindirmez. router.refresh() sadece sunucu
   verisini tazeler; sayfa durumu (filtre/arama/sıralama seçimin) korunur. */
export default function LiveRefresh({ everyMs = 60_000 }: { everyMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, everyMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh(); // sekmeye dönünce hemen tazele
        start();
      } else stop();
    };

    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [router, everyMs]);

  return null;
}
