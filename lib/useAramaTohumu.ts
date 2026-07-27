"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/* Panel geneli aramadan (`PanelSearch`) bir kayda tıklanınca hedef modül `?q=…` ile açılır;
   bu kanca o terimi modülün KENDİ arama kutusuna tohumlar → kullanıcı aradığı kaydı
   listenin içinde ayrıca aramak zorunda kalmaz.

   ⚠️ `useState` başlangıç değeri olarak `window.location` OKUNAMAZ: sunucu HTML'i boş kutu
   üretir, istemci dolu üretir → hydration uyuşmazlığı. Bu yüzden effect ile sonradan yazılır.
   ⚠️ Bağımlılık `useSearchParams`: aynı sayfada farklı bir `?q=` ile gezinildiğinde bileşen
   yeniden MOUNT olmaz; boş `[]` bağımlılığıyla ikinci arama sessizce yok sayılırdı. */
export function useAramaTohumu(setQuery: (v: string) => void) {
  const sp = useSearchParams();
  const q = sp.get("q");
  useEffect(() => {
    if (q) setQuery(q);
  }, [q, setQuery]);
}
