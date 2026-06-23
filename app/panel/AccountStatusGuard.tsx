"use client";

import { useEffect, useRef } from "react";
import { createClient } from "../../lib/supabase/client";

/**
 * Hesabın sunucuda KALICI silinip silinmediğini denetler (mobildeki
 * AccountStatusGate'in web karşılığı). Panel açılışında ve sekme öne
 * geldiğinde `getUser()` ile sorar:
 *   - Kullanıcı silinmişse Supabase HTTP **403** döner → oturumu kapat +
 *     /giris?closed=1'e yönlendir ("Hesabınız kalıcı olarak kapatılmıştır").
 *   - **Sadece 403'te** aksiyon alınır. Ağ hatası / 401 / 5xx → DOKUNULMAZ
 *     (zayıf ağda kullanıcıyı atma — proxy ile aynı kural).
 *
 * proxy.ts her gezinme/yenilemede sunucuda aynı kontrolü yapar; bu bileşen
 * ek olarak AÇIK DURAN sekmeyi de yakalar (gezinme olmadan).
 */
export default function AccountStatusGuard() {
  const handled = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const check = async () => {
      if (handled.current) return;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error && (error as { status?: number }).status === 403 && !data?.user) {
          handled.current = true;
          try {
            await supabase.auth.signOut();
          } catch {
            /* signOut hatası önemsiz — yine de yönlendir */
          }
          window.location.href = "/giris?closed=1";
        }
      } catch {
        /* offline / ağ hatası — yok say */
      }
    };

    check();
    const onVisible = () => {
      if (!document.hidden) check();
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
