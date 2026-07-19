"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/* Sol menü rotalarını TEKRAR ısıtır.

   ⚠️ NEDEN GEREKLİ (2026-07-19): iki ayar birbiriyle çelişiyordu —
     · Sidebar prefetch'i `useEffect(..., [router, role])` ile MOUNT'TA BİR KEZ çalışıyor
     · `next.config.ts` → `staleTimes.dynamic: 30` o yükü 30 SANİYEDE bayatlatıyor
   Yani panel 30 saniyeden uzun süre açık kaldığında ısıtma tamamen boşa gidiyordu:
   tıklama = soğuk tur (ölçüm 14.07: ısıtılmış 14-26 ms · ısıtılmamış 1554 ms) ve üstüne
   `loading.tsx` de prefetch yüküyle geldiği için EKRANDA HİÇBİR ŞEY görünmüyordu.

   ⚠️ NEDEN PERİYODİK DEĞİL: her tur, ısıtılan HER rotanın sunucu render'ını (dolayısıyla
   tüm sorgularını) yeniden çalıştırır. Admin'de bu 7 rota demek ve İKİSİ (`/admin/musteriler`,
   `/admin/destek`) `listPeople()` ile auth.users + profiles + user_devices TAM TABLOSUNU
   tarıyor. 19.07'de LiveRefresh'i tam bu yüzden seyrelttik — Supabase Free planında disk IO
   bütçesi erimişti. Bu yüzden ısıtma TALEP ÜZERİNE:
     1) sekme öne geldiğinde (Mehmet'in senaryosu: panel arkada unutuldu, sonra tıklandı)
     2) fare sol menüye girdiğinde (tıklamadan hemen önce — masaüstü)
   ve `ARA` ile boğazlanır, art arda tetiklenirse bir kez çalışır.

   ⚠️ SEKME GEÇİŞİNDE EK KOŞUL — ilk hâlinde YOKTU ve pahalı bir hataydı: her öne gelişte
   ısıtıyordu, cache HÂLÂ TAZEYKEN bile. 5 saniyeliğine başka sekmeye bakıp dönmek 7 sunucu
   render'ı + 2 tam tablo taraması tetikliyordu; günde onlarca sekme geçişiyle 19.07'de
   kazanılan disk IO tasarrufu geri yanardı. Artık yalnız sekme `staleTimes.dynamic`ten
   UZUN süre gizli kaldıysa ısıtılıyor — kısa gizlenmede zaten ısıtılacak bir şey yok. */
const ARA = 15_000; // ms — bundan sık ısıtma yapma
/* next.config.ts `staleTimes.dynamic: 30` (saniye) ile AYNI olmalı: bundan kısa süre gizli
   kalan sekmede prefetch hâlâ geçerlidir, tekrar ısıtmak saf israftır.
   ⚠️ next.config'teki değeri değiştirirsen BURAYI da güncelle. */
const BAYATLAMA_MS = 30_000;

export function useRewarmPrefetch(hrefs: string[]) {
  const router = useRouter();
  const sonRef = useRef(0);
  const gizlendiRef = useRef(0); // sekmenin gizlenme anı (0 = hiç gizlenmedi)
  // hrefs her render'da yeni dizi olabilir → efektin bağımlılığı olarak ref kullan
  const hrefsRef = useRef(hrefs);
  // ⚠️ Render sırasında ref YAZMA (React saflık kuralı, StrictMode'da iki kez çalışır) → efektte.
  useEffect(() => {
    hrefsRef.current = hrefs;
  });

  const isit = useCallback(() => {
    const simdi = Date.now();
    if (simdi - sonRef.current < ARA) return;
    sonRef.current = simdi;
    hrefsRef.current.forEach((href) => {
      try {
        router.prefetch(href, { kind: "full" as never });
      } catch {
        /* prefetch başarısızsa sayfa yine normal açılır — sessiz geçilir */
      }
    });
  }, [router]);

  useEffect(() => {
    // İlk ısıtma: ilk boyamayı bloklamasın diye kısa gecikme (eski davranış korunuyor).
    const t = setTimeout(() => {
      sonRef.current = 0; // ilk ısıtmayı boğazlama
      isit();
    }, 300);

    const gorunurluk = () => {
      if (document.visibilityState === "hidden") {
        gizlendiRef.current = Date.now();
        return;
      }
      // Kısa süre gizlenmişse prefetch hâlâ geçerli → ısıtma (ve sunucu yükü) GEREKSİZ.
      const gizliKaldi = gizlendiRef.current ? Date.now() - gizlendiRef.current : Infinity;
      if (gizliKaldi < BAYATLAMA_MS) return;
      isit();
    };
    document.addEventListener("visibilitychange", gorunurluk);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", gorunurluk);
    };
  }, [isit]);

  return isit; // menüye `onMouseEnter`/`onFocus` ile bağlanır
}
