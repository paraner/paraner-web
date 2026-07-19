"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/* "Şu an aktif" gerçekten CANLI görünsün diye sayfayı periyodik tazeler.
   Sunucu bileşeni kendi kendine yenilenmez; elle F5 gerekirdi ve panel "canlı" hissi vermezdi.

   ⚠️ MALİYET — 2026-07-19 (Supabase "Disk IO Budget tükenmek üzere" uyarısı):
   Bu bileşen LAYOUT'ta duruyor, yani AÇIK OLAN HANGİ ADMIN SAYFASIYSA onun TÜM sunucu
   sorguları her turda baştan çalışıyordu. 30 saniyede bir, sekme açık kaldığı sürece.
   Bir turun bedeli (o sayfa neyse):
     · her sayfa      → support_tickets exact count + getOnlineCount (user_devices taraması)
     · /admin         → 6+ exact count (seq scan) + 10.000 satırlık okuma
     · /admin/musteriler → auth listUsers (sayfalı) + profiles 10k + user_devices 10k
   Panel bir iş gününde açık kalınca bu yüzlerce tur eder; veri küçük olsa bile Free plan
   disk IO bütçesini eritir ve tükenince TÜM proje 5 MB/s tabanına düşer.

   ÇÖZÜM — canlılık İHTİYACA göre:
     · /admin/canli → gerçekten canlı ekran, 30 sn
     · /admin       → pano, 2 dk yeter (rozetler zaten üstte)
     · diğerleri (musteriler/ekip/destek/ai/denetim) → OTOMATİK YENİLEME YOK.
       Bunlar liste/kayıt ekranları; veri kendiliğinden değişmez, değiştiren zaten
       aksiyondan sonra router.refresh() tetikliyor (panel hızı kuralı 1).
   Sekme görünmezken hiçbir şey yapılmaz (eski davranış korundu). */

/** Yol → tazeleme aralığı (ms). 0 = otomatik yenileme yok. */
function araligi(pathname: string): number {
  if (pathname.startsWith("/admin/canli")) return 30_000;
  if (pathname === "/admin") return 120_000;
  return 0;
}

export default function LiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const everyMs = araligi(pathname);
    if (everyMs === 0) return; // bu sayfada otomatik yenileme yok

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
  }, [router, pathname]);

  return null;
}
