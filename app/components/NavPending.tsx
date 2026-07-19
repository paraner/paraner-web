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
/* Göstergenin ARDINDAKİ zemin rengi. Kutu opak olmak ZORUNDA — altında eski sayfanın
   içeriği durur, saydam kalırsa kullanıcı "yükleniyor" halkasını eski tablonun üstünde görür.

   ⚠️ `getComputedStyle(kabuk).backgroundColor` TEK BAŞINA YETMİYOR (bu, önceki turda
   yaptığım düzeltmenin kendi hatasıydı): `.admin-shell`'in zemini var (#08090b) ama
   `.panel-shell`'in YOK — renk `body`'de tanımlı. Orada ölçüm `rgba(0,0,0,0)` yani
   SAYDAM dönüyordu → müşteri panelinde kutu tamamen şeffaf kalırdı.
   Bu yüzden opak bir ata bulunana kadar yukarı tırmanıyoruz, en sonda body. */
function zeminBul(el: Element | null): string {
  /* ⚠️ "sonu ,0) ile bitiyorsa saydamdır" KESTİRMESİ YANLIŞ — ilk yazdığım buydu:
     `rgb(0, 0, 0)` (opak SİYAH, tam da panelin zemini) ve `rgb(255, 255, 0)` de o kalıba
     uyuyor. Doğrusu alfa BİLEŞENİNE bakmak: 3 bileşen = opak, 4. bileşen 0 = saydam. */
  const saydam = (c: string) => {
    if (!c || c === "transparent") return true;
    const m = c.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return false; // beklenmedik biçim → opak say, kutu kesinlikle boyansın
    const p = m[1].split(/[,/]/).map((s) => s.trim());
    return p.length > 3 && parseFloat(p[3]) === 0;
  };
  for (let n: Element | null = el; n; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor;
    if (!saydam(c)) return c;
  }
  const govde = getComputedStyle(document.body).backgroundColor;
  return saydam(govde) ? "#000" : govde;
}

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
    /* Konum ÖLÇÜLEREK bulunuyor, sabit sayı YOK: panel menüsü daraltılabiliyor, sürüklenerek
       yeniden boyutlanıyor, admin'de üst bar yok. Sabit değer yazmak 19.07'deki "gösterge
       69px aşağıda" hatasının aynısı olurdu.

       ⚠️ ÖLÇÜLEN ŞEY İÇERİK SÜTUNU (`.panel-main`/`.admin-main`), sol menü DEĞİL — ilk yazdığım
       "menünün sağ kenarı" MOBİLDE ÇÖKÜYORDU: `@media (max-width: 760px)` (globals.css:1911)
       `.panel-shell`i sütuna çeviriyor ve `.panel-sidebar`ı TAM GENİŞLİK yapıyor → `right` =
       ekran genişliği → kutu `left:390px, right:0` yani SIFIR GENİŞLİK olup telefonda hiç
       görünmüyordu. İçerik sütunu iki yerleşimde de doğru: masaüstünde menünün sağında,
       mobilde yığılmış menünün altında. */
    const sutun = document.querySelector(".admin-main, .panel-main");
    const bar = document.querySelector(".panel-topbar");
    const kabuk = document.querySelector(".admin-shell, .panel-shell");
    const sr = sutun?.getBoundingClientRect();
    setKutu({
      left: sr ? sr.left : 0,
      // Üst bar sütunun İÇİNDE → altından başla. Bar yoksa (admin) sütunun kendi üstü.
      top: bar ? bar.getBoundingClientRect().bottom : sr ? sr.top : 0,
      /* ⚠️ HALKA loading.tsx'inkiyle AYNI YERDE durmalı, yoksa ikisi arka arkaya çıkınca
         (kabuk prefetch'li ama veri değilse) halka gözle görülür biçimde ZIPLIYOR.
         loading.tsx panelde `margin-top: calc(var(--panel-topbar-h) / -2)` ile optik olarak
         EKRANIN ortasına çekiliyor (üst bar görsel olarak boş, göz orayı saymıyor).
         Aynı kaydırmayı burada alttan boşlukla yapıyoruz. Admin'de üst bar yok → 0. */
      kaydir: bar ? bar.getBoundingClientRect().height : 0,
      /* ⚠️ Zemin SABİT YAZILMAZ: admin kabuğu #08090b, müşteri panelinde renk body'de.
         Portal <body>'de durduğu için CSS ile kabuğa göre seçemiyoruz → ölçüyoruz. */
      zemin: zeminBul(kabuk),
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
