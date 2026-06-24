"use client";

import { useEffect, useRef } from "react";
import { createClient } from "../../lib/supabase/client";
import {
  getWebDeviceId,
  isWebDeviceRegistered,
  markWebDeviceRegistered,
  clearWebDeviceRegistered,
} from "../../lib/loginAlert";

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
    const myId = getWebDeviceId();

    // Uzaktan çıkış → tek-tip kick (hem foreground kontrolü hem Realtime çağırır).
    const kickRemote = async () => {
      if (handled.current) return;
      handled.current = true;
      clearWebDeviceRegistered();
      try {
        await supabase.auth.signOut();
      } catch {
        /* önemsiz */
      }
      window.location.href = "/giris?signedout=1";
    };

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
          return;
        }

        // "Diğer tüm cihazlardan çıkış" kontrolü: başka bir cihazdan bu tarayıcının
        // user_devices kaydı silindiyse → uzaktan çıkış yaptırıldı → çık.
        // Yanlış-atma koruması: sorgu başarılı + kayıt yok + bu tarayıcı daha önce kayıtlıysa.
        const uid = data?.user?.id;
        if (uid) {
          const { data: row, error: devErr } = await supabase
            .from("user_devices")
            .select("device_id")
            .eq("user_id", uid)
            .eq("device_id", myId)
            .maybeSingle();
          if (!devErr) {
            if (row) {
              markWebDeviceRegistered();
            } else if (isWebDeviceRegistered()) {
              await kickRemote();
              return;
            }
          }
        }
      } catch {
        /* offline / ağ hatası — yok say */
      }
    };

    // L4 — Realtime: KENDİ tarayıcı kaydım silinince ANINDA çıkış (sekme açıkken bile).
    // RLS gereği sadece kendi cihazlarımın olaylarını alırım; ayrıca device_id eşleşmesini
    // kontrol ederim → yalnızca benim kaydım silinince çıkar (başka cihaz silinince DEĞİL).
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      // Realtime'ı oturum token'ıyla yetkilendir — YOKSA RLS tüm olayları süzer.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        try { supabase.realtime.setAuth(session.access_token); } catch { /* sessiz */ }
      }
      const verifyAndKick = async () => {
        if (handled.current) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;
        const { data: row, error } = await supabase
          .from("user_devices")
          .select("device_id")
          .eq("user_id", user.id)
          .eq("device_id", myId)
          .maybeSingle();
        if (!error && !row && isWebDeviceRegistered()) await kickRemote();
      };
      channel = supabase
        .channel("user_devices_kick")
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "user_devices" },
          (payload) => {
            const deletedId = (payload.old as { device_id?: string })?.device_id;
            if (deletedId) {
              if (deletedId === myId) kickRemote();
            } else {
              verifyAndKick();
            }
          },
        )
        .subscribe();
    })();

    check();
    const onVisible = () => {
      if (!document.hidden) check();
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    // Güvenlik ağı: realtime çalışmasa bile sekme açıkken her 30sn'de teyit.
    const pollTimer = setInterval(check, 30_000);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(pollTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
