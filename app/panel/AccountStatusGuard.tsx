"use client";

import { useEffect, useRef } from "react";
import { createClient } from "../../lib/supabase/client";
import { getWebDeviceId } from "../../lib/loginAlert";

/**
 * Hesabın sunucuda KALICI silinip silinmediğini + bu tarayıcının uzaktan
 * çıkış yaptırılıp yaptırılmadığını denetler (mobildeki AccountStatusGate'in
 * web karşılığı).
 *   - getUser HTTP 403 → hesap kalıcı silinmiş → /giris?closed=1.
 *   - user_devices'taki kendi kaydım silinmiş → uzaktan çıkış → /giris?signedout=1.
 *
 * Yanlış-atma koruması (kritik): "kaydım yok → çık" kararı SADECE bu OTURUMDA
 * kaydı bir kez GÖRDÜKTEN sonra kaybolursa verilir (in-memory sawRow) + 1.5sn
 * arayla ÇİFT teyit. (Eski SecureStore/localStorage bayrağı oturumlar arası
 * bayatlayıp durduk yere atıyordu.)
 */
export default function AccountStatusGuard() {
  const handled = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const myId = getWebDeviceId();
    let sawRow = false;

    const kickRemote = async () => {
      if (handled.current) return;
      handled.current = true;
      // Rapor bekçisini temizle → tekrar giriş yapınca cihaz user_devices'a
      // YENİDEN yazılsın (sessionStorage full-reload'da silinmez; aksi halde
      // uzaktan çıkış sonrası geri girişte cihaz listede görünmez).
      try { sessionStorage.removeItem("login_reported"); } catch { /* yoksay */ }
      // Mesajı doğru ver: hesap tamamen SİLİNMİŞSE "kapatıldı", sadece bu cihaz
      // uzaktan ÇIKARILMIŞSA "uzaktan çıkış". (Çapraz-platform silmede cascade satır
      // silinmesi getUser 403'ten önce tetikleyip yanlış mesaj verebiliyordu.)
      let dest = "/giris?signedout=1";
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error && (error as { status?: number }).status === 403 && !data?.user) {
          dest = "/giris?closed=1";
        }
      } catch { /* ağ hatası → varsayılan uzaktan çıkış */ }
      try {
        // scope: 'local' — SADECE bu tarayıcıyı kapat. Varsayılan 'global' kullanıcının
        // TÜM token'larını iptal eder → "tüm cihazlardan çıkış"ı başlatan cihaz (telefon)
        // da durduk yere düşer.
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* önemsiz */
      }
      window.location.href = dest;
    };

    // "Kaydım uzaktan silindi mi" — çift teyit + sawRow ile güvenli.
    const verifyDevice = async (knownUid?: string) => {
      if (handled.current) return;
      let uid = knownUid;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return;
      const q = () =>
        supabase
          .from("user_devices")
          .select("device_id")
          .eq("user_id", uid!)
          .eq("device_id", myId)
          .maybeSingle();
      const { data: row, error } = await q();
      if (error) return;                  // ağ hatası → dokunma
      if (row) { sawRow = true; return; } // satır var → işaretle, ATMA
      if (!sawRow) return;                // bu oturumda hiç görmedik → ATMA
      await new Promise((r) => setTimeout(r, 1500));
      if (handled.current) return;
      const second = await q();
      if (second.error || second.data) return; // ikinci teyit hata/satır bulduysa → ATMA
      await kickRemote();
    };

    const check = async () => {
      if (handled.current) return;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error && (error as { status?: number }).status === 403 && !data?.user) {
          handled.current = true;
          try { sessionStorage.removeItem("login_reported"); } catch { /* yoksay */ }
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            /* önemsiz */
          }
          window.location.href = "/giris?closed=1";
          return;
        }
        if (data?.user?.id) await verifyDevice(data.user.id);
      } catch {
        /* offline / ağ hatası — yok say */
      }
    };

    // L4 — Realtime: kendi kaydım silinince teyit et (doğrudan kick YOK, verifyDevice ile).
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        try { supabase.realtime.setAuth(session.access_token); } catch { /* sessiz */ }
      }
      channel = supabase
        .channel("user_devices_kick")
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "user_devices" },
          (payload) => {
            const deletedId = (payload.old as { device_id?: string })?.device_id;
            if (!deletedId || deletedId === myId) verifyDevice();
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
