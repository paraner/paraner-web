"use client";

import { useRealtimeRefresh } from "../../lib/useRealtimeRefresh";

/* Görünmez dinleyici — sunucu bileşeni sayfalarına (ör. Genel Bakış) canlı tazeleme eklemek
   için. İstemci hook'u doğrudan server component'te çağrılamaz; bu ince sarmalayıcı köprü olur. */
export default function RealtimeRefresher({ table, profileId }: { table: string; profileId: string | null }) {
  useRealtimeRefresh(table, profileId);
  return null;
}
