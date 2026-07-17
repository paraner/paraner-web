"use client";

import { useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import { getWebDeviceId } from "../../lib/loginAlert";

/* Canlı aktiflik kalp atışı — panel açıkken user_devices.last_seen'i tazeler.
   Admin paneli "şu an aktif" ve "son aktiflik"i buradan okuyor (lib/lifecycle.lastActivity).

   NEDEN GEREKLİ: LoginReporter last_seen'i OTURUM BAŞINA BİR KEZ yazıyor → sekmeyi açık
   bırakan kullanıcı sabahki damgada kalıyordu.

   ⚠️ login-alert edge function'ı ÇAĞIRMIYOR: o geo sorgusu yapıp şehir değişiminde güvenlik
   MAİLİ atıyor → 5 dakikada bir çağırmak kullanıcıyı mail yağmuruna tutardı. Bunun yerine
   touch_device RPC'si (yalnız zaman damgası; supabase/touch-device-heartbeat.sql).

   Maliyet kontrolü: yalnız sekme GÖRÜNÜRken atar (arka planda/başka sekmedeyken durur) →
   açık unutulmuş sekme sonsuza kadar "aktif" görünmez ve boşuna yazma olmaz.
   Tamamen fail-soft: RPC yoksa/hata verirse panel etkilenmez. */

const BEAT_MS = 5 * 60 * 1000;

export default function Heartbeat() {
  useEffect(() => {
    const supabase = createClient();
    const deviceId = getWebDeviceId();
    let timer: ReturnType<typeof setInterval> | null = null;

    const beat = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        await supabase.rpc("touch_device", { p_device_id: deviceId });
      } catch {
        /* fail-soft: aktiflik ikincil, paneli asla etkilemesin */
      }
    };

    const start = () => {
      if (timer) return;
      void beat(); // sekmeye dönüşte hemen bir kez → "şu an aktif" anında doğru
      timer = setInterval(beat, BEAT_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, []);

  return null;
}
