"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* Sayfa değişince içeriği başa sar.
   Kaydırma artık pencerede değil `.panel-content` kutusunda (bkz. globals.css .panel-shell notu).
   Next'in kendi "yeni sayfada başa dön" davranışı pencereyi hedefler → iç kutu, önceki sayfanın
   kaydırma konumunda kalabilir ("İşlemler'de aşağıdayken Hesaplar'a geçince ortadan başlıyor").
   Bu bileşen o boşluğu kapatır. */
export default function ContentScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".panel-content");
    if (el) el.scrollTop = 0;
  }, [pathname]);

  return null;
}
