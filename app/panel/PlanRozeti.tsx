"use client";

/* ÜST BAR — PLAN / DENEME ROZETİ
 *
 * Panel kullanıcıya planını hiçbir yerde söylemiyordu; denemesi biterken de haberi olmuyordu
 * (uyarı yalnız telefonda vardı). Rozet her sayfada görünür, tıklayınca Ayarlar > Abonelik.
 *
 * ⚠️ KAPATILAMAZ (Mehmet, 27.07: "o bildirim kaldırılmasın üstten, çarpı işaretini kaldır").
 * Önceki hâlinde × vardı ve `sessionStorage` ile o oturumluk gizleniyordu; kaldırıldı —
 * kalan gün bilgisi sürekli görünsün isteniyor. Bu karar değişirse gizleme mantığı
 * sıfırdan yazılmayacak kadar küçük, ama DB'ye YAZMAMALI: mobildeki kalıcı kapatma
 * (`trial_notified_day5`) AYRI bir şeydir, oraya dokunulmaz.
 *
 * ⚠️ Durum SUNUCUDAN geliyor (`lib/abonelik`), burada gün hesabı YAPILMAZ: istemcide
 * `Date.now()` cihazın saatidir.
 */

import Link from "next/link";
import type { AbonelikDurum } from "../../lib/abonelik";

/* ─── ROZET KURALLARI (Mehmet, 27.07) ───────────────────────────────────────
   Ücretli                        → rozet YOK (satacak bir şey yok)
   Deneme, kalan > 7 gün          → rozet YOK (ilk günlerde rahatsız etme)
   Deneme, kalan 4-7 gün          → "Deneme · N gün"  (nötr)
   Deneme, kalan ≤ 3 gün          → "Deneme · N gün"  (KIRMIZI)
   Bireysel, denemesi yok/bitmiş  → "Daha fazla özellik için yükselt"
   İşletme,  denemesi bitmiş      → "Denemen bitti · Plan seç"
   İşletme,  hiç deneme yok       → "Planını seç"   ← "denemen bitti" demek YALAN olurdu

   ⚠️ İşletmede ÜCRETSİZ PLAN YOK (mobil plan-detail.tsx:103 ile aynı gerçek): denemesi
   biten işletme DB'de `individual_free`'e düşüyor ama ürün olarak "ücretsiz işletme"
   diye bir şey yok → ona asla "Ücretsiz plan" yazma.
   ⚠️ Bugün hiçbir özellik KİLİTLİ DEĞİL (web'de tek gate yok, denetlendi) → "daha fazla
   özellik" bir söz; ödeme+kilitler gelince gerçek olur. */

const GOSTERIM_ESIGI = 7; // kaç gün kala sayaç görünsün
const ACIL_ESIGI = 3; // kaç günden itibaren kırmızı

export default function PlanRozeti({
  durum,
  isletmeMi,
}: {
  durum: AbonelikDurum;
  isletmeMi: boolean;
}) {
  if (durum.tur === "paid") return null;

  if (durum.tur === "trial") {
    if (durum.kalanGun > GOSTERIM_ESIGI) return null;
    const acil = durum.kalanGun <= ACIL_ESIGI;
    return (
      <Rozet
        acil={acil}
        uzun={`Deneme · ${durum.kalanGun} gün`}
        kisa={`${durum.kalanGun} gün`}
        ipucu={`Deneme sürenin bitmesine ${durum.kalanGun} gün kaldı`}
      />
    );
  }

  // Buradan sonrası: ücretsiz ya da denemesi bitmiş (zombie dahil — kullanıcı için aynı şey)
  if (isletmeMi) {
    const bitti = durum.denemeKullanildi;
    return (
      <Rozet
        acil
        uzun={bitti ? "Denemen bitti · Plan seç" : "Planını seç"}
        kisa="Plan seç"
        ipucu={
          bitti
            ? "Deneme süren doldu — devam etmek için bir plan seç"
            : "İşletme hesabında ücretsiz plan yok — bir plan seç"
        }
      />
    );
  }

  return (
    <Rozet
      uzun="Daha fazla özellik için yükselt"
      kisa="Yükselt"
      ipucu="Daha fazla özellik için planını yükselt"
    />
  );
}

/* Telefonda üst barda yer yok (hamburger + arama + 2 ikon) → aynı rozet KISA metinle
   çiziliyor; hangisinin görüneceğine CSS karar veriyor (iki ayrı bileşen yok). */
function Rozet({
  uzun,
  kisa,
  ipucu,
  acil = false,
}: {
  uzun: string;
  kisa: string;
  ipucu: string;
  acil?: boolean;
}) {
  return (
    <Link
      href="/panel/ayarlar?tab=abonelik"
      className={`plan-rozet${acil ? " acil" : ""}`}
      title={ipucu}
    >
      <span className="pr-uzun">{uzun}</span>
      <span className="pr-kisa">{kisa}</span>
    </Link>
  );
}
