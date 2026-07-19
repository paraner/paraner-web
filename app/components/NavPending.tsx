"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLinkStatus } from "next/link";

/* Menüye tıklandığı ANDA gösterge — `loading.tsx` YETMEDİĞİ için var.

   ⚠️ SORUN (Mehmet, 2026-07-19): "panel arkada açıktı, sonra Destek'e bastım, 8-9 saniye
   HİÇBİR tepki vermedi." Suçlu sunucu değildi: Next 16'da `loading.tsx` ekranı PREFETCH
   YÜKÜYLE geliyor (docs/01-app/01-getting-started/04-linking-and-navigating.md:231 —
   "prefetch bitmemişse loading.js fallback'i hemen görünmeyebilir, çünkü henüz prefetch
   edilmemiştir"). Sol menü prefetch'i mount'ta BİR KEZ çalışıyor, `staleTimes.dynamic: 30`
   ise onu 30 saniyede bayatlatıyor → sekme arkada bekleyince istemcinin elinde gösterecek
   HİÇBİR ŞEY kalmıyor. Yani en çok gerektiği anda (uzun bekleme) gösterge kayboluyordu.

   `useLinkStatus` prefetch'ten BAĞIMSIZ: geçiş başlar başlamaz `pending` true olur.

   ⚠️ Neden portal: hook'un çalışması için bileşen <Link>'in İÇİNDE olmak ZORUNDA, ama
   gösterge sol menüde DEĞİL içerik alanının ortasında durmalı (Mehmet 19.07'de menüdeki
   dönen halkayı eledi). Portal ikisini uzlaştırıyor.

   ⚠️ `pointer-events: none` (CSS): gösterge sol menüyü ASLA bloklamamalı — kullanıcı
   fikrini değiştirip başka sayfaya geçebilmeli (loading.tsx'in de kuralı bu). */
export default function NavPending() {
  const { pending } = useLinkStatus();
  const [kutu, setKutu] = useState<{
    left: number;
    top: number;
    kaydir: number;
    zemin: string;
  } | null>(null);

  useEffect(() => {
    if (!pending) {
      setKutu(null);
      return;
    }
    /* Sol menünün sağ kenarı + (varsa) üst barın altı ÖLÇÜLEREK bulunuyor; sabit sayı YOK.
       Sebep: panel menüsü daraltılabiliyor ve sürüklenerek yeniden boyutlanıyor, admin'de
       üst bar yok. Sabit değer yazmak 19.07'deki "gösterge 69px aşağıda" hatasının aynısı olurdu. */
    const yan = document.querySelector(".admin-sidebar, .panel-sidebar");
    const bar = document.querySelector(".panel-topbar");
    const kabuk = document.querySelector(".admin-shell, .panel-shell");
    setKutu({
      left: yan ? yan.getBoundingClientRect().right : 0,
      top: bar ? bar.getBoundingClientRect().bottom : 0,
      /* ⚠️ HALKA loading.tsx'inkiyle AYNI YERDE durmalı, yoksa ikisi arka arkaya çıkınca
         (kabuk prefetch'li ama veri değilse) halka gözle görülür biçimde ZIPLIYOR.
         loading.tsx panelde `margin-top: calc(var(--panel-topbar-h) / -2)` ile optik olarak
         EKRANIN ortasına çekiliyor (üst bar görsel olarak boş, göz orayı saymıyor).
         Aynı kaydırmayı burada alttan boşlukla yapıyoruz. Admin'de üst bar yok → 0. */
      kaydir: bar ? bar.getBoundingClientRect().height : 0,
      /* ⚠️ Zemin SABİT YAZILMAZ: admin kabuğu #08090b, müşteri paneli var(--bg) (#000000).
         `var(--bg)` yazdığımda admin'de saf siyah kutu sayfadan renk olarak ayrılıyordu.
         Portal <body>'de durduğu için CSS ile kabuğa göre seçemiyoruz → ölçüp uyguluyoruz. */
      zemin: kabuk ? getComputedStyle(kabuk).backgroundColor : "var(--bg)",
    });
  }, [pending]);

  if (!pending || !kutu) return null;

  return createPortal(
    <div
      className="nav-pending"
      style={{
        left: kutu.left,
        top: kutu.top,
        paddingBottom: kutu.kaydir,
        background: kutu.zemin,
      }}
      aria-busy="true"
      aria-label="Yükleniyor"
    >
      {/* loading.tsx ile AYNI görünüm — kullanıcı iki farklı "yükleniyor" görmemeli */}
      <span className="page-loading-ring" />
      <span className="page-loading-text">Yükleniyor…</span>
    </div>,
    document.body,
  );
}
