"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase/client";

/* Bir tablodaki değişikliği CANLI dinler ve sayfayı tazeler.
 *
 * NEDEN (Mehmet, 25.07): telefondan (ya da başka sekmeden) eklenen işlem, açık duran web
 * panelinde kendiliğinden görünmüyordu — yenilemek gerekiyordu. `transactions` realtime
 * yayınına eklendi (parla/sql/islemler-realtime.sql); bu hook o olayı alıp `router.refresh()`
 * çağırır → sunucu verisi yeniden çekilir, useServerSynced ekranı eşitler.
 *
 * ⚠️ FİLTRE = aktif profil id: yalnız kullanıcının kendi olayları gelir (RLS zaten
 *    koruyor; filtre ayrıca gereksiz trafiği keser).
 * ⚠️ router.refresh() KISILIR (debounce): art arda 5 işlem tek tazelemeye iner — toplu
 *    içe aktarımda sunucuyu 5 kez dövmesin.
 */
export function useRealtimeRefresh(table: string, profileId: string | null) {
  const router = useRouter();

  useEffect(() => {
    if (!profileId) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let alive = true;

    const tazele = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 350);
    };

    (async () => {
      // Realtime, RLS'i istemcinin oturum token'ıyla uygular → auth'u set etmek şart
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`rt_${table}_${profileId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `user_id=eq.${profileId}` },
          tazele,
        )
        .subscribe();
    })();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [table, profileId, router]);
}
