"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/* Üst bardaki hızlı ekleme adasından ("Gelir ekle", "Fatura oluştur" …) gelindiğinde
   hedef modülün KENDİ ekleme formunu açar: `/panel/islemler?ekle=gelir`.

   ⚠️ NEDEN İKİNCİ BİR FORM YAZMIYORUZ: ekleme formları modüllerin içinde yaşıyor
   (openNew/openAdd). Üst bara kopyasını çıkarmak iki ayrı form demek olurdu — biri
   düzelir öteki unutulur. Ada yalnızca "o sayfayı aç ve formu aç" der.

   ⚠️ Parametre İŞLENDİKTEN SONRA URL'den silinir: yoksa kullanıcı sayfayı yenilediğinde
   ya da geri gelince form kendi kendine tekrar açılır.
   ⚠️ `islendi` bekçisi şart: `ac` her render'da yeni bir fonksiyon olabilir; bekçi olmadan
   effect tekrar çalışıp kullanıcının kapattığı formu yeniden açardı. */
export function useEkleTohumu(ac: (deger: string) => void) {
  const sp = useSearchParams();
  const deger = sp.get("ekle");
  const islendi = useRef<string | null>(null);

  useEffect(() => {
    if (!deger || islendi.current === deger) return;
    islendi.current = deger;
    ac(deger);
    const u = new URL(window.location.href);
    u.searchParams.delete("ekle");
    window.history.replaceState(null, "", u.toString());
  }, [deger, ac]);
}
