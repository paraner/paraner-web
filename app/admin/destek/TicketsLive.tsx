"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

/* Destek gelen kutusunu CANLI tutar (2026-07-20).
   Önce: yeni talep listeye düşmüyordu, personel sayfayı yenilemek zorundaydı.
   `LiveRefresh` bu rota için 0 (kapalı) döndürüyor — periyodik yoklama disk IO
   maliyeti yüzünden bilinçli kapalıydı. Çözüm yoklama DEĞİL, olay: satır değişince
   bir kez `router.refresh()`.

   ⚠️ ÖN KOŞUL: sql/destek/destek-talep-realtime.sql çalışmış olmalı — `support_tickets`
   yayında değilse burası sessizce hiçbir olay almaz (hata da vermez).

   Neden `refresh()` (satırı elle eklemek yerine): liste satırı yalnız talebi değil
   müşteri bağlamını da taşıyor (e-posta, üyelik, plan — service_role'lü `listPeople`).
   Realtime yükü sadece ticket satırını verir; müşteri bilgisi olmadan satır çizmek
   "müşteri kaydı bulunamadı" yalanı üretirdi. Sunucuya tazeletmek doğru olan.

   INSERT + UPDATE ikisi de dinleniyor: yeni talep INSERT, yeni mesaj/durum değişimi
   UPDATE (trg_touch_ticket `last_message_at` + `status` yazıyor) → sıralama ve
   "Yanıt bekleyen" sayacı ikisinde de değişir. */
export default function TicketsLive() {
  const router = useRouter();
  const sonRef = useRef(0);
  const zamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let iptal = false;

    /* Art arda gelen olaylarda (talep + ilk mesaj aynı anda yazılıyor) tek tazeleme yeter.
       En fazla 3 sn'de bir; aradaki olaylar sonda tek çağrıya toplanır. */
    const tazele = () => {
      const simdi = Date.now();
      const gecen = simdi - sonRef.current;
      if (zamanlayiciRef.current) return; // zaten kuyrukta
      if (gecen >= 3000) {
        sonRef.current = simdi;
        router.refresh();
        return;
      }
      zamanlayiciRef.current = setTimeout(() => {
        zamanlayiciRef.current = null;
        sonRef.current = Date.now();
        router.refresh();
      }, 3000 - gecen);
    };

    (async () => {
      // Sıra: önce token, SONRA subscribe — token'sız kanalda RLS hiçbir satırı geçirmez
      // ve olay HATA VERMEDEN düşer (aynı tuzağa lib/support.ts'te düşülmüştü).
      const { data: { session } } = await supabase.auth.getSession();
      if (iptal) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel("admin_tickets")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, tazele)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets" }, tazele)
        .subscribe();
    })();

    return () => {
      iptal = true;
      if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
