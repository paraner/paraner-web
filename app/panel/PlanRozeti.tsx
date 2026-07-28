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
    const g = durum.kalanGun;
    return (
      <Rozet
        acil={g <= ACIL_ESIGI}
        tam={`Denemenin bitmesine ${g} gün kaldı`}
        orta={`Denemene ${g} gün kaldı`}
        kisa={`${g} gün`}
      />
    );
  }

  // Buradan sonrası: ücretsiz ya da denemesi bitmiş (zombie dahil — kullanıcı için aynı şey)
  if (isletmeMi) {
    return durum.denemeKullanildi ? (
      <Rozet acil tam="Denemen bitti · Plan seç" orta="Denemen bitti" kisa="Plan seç" />
    ) : (
      <Rozet acil tam="Planını seç" orta="Planını seç" kisa="Plan seç" />
    );
  }

  return (
    <Rozet tam="Daha fazla özellik için yükselt" orta="Planını yükselt" kisa="Yükselt" />
  );
}

/* ÜÇ METİN, TEK BİLEŞEN — hangisinin görüneceğine CSS karar verir.
   ⚠️ Neden üç: dar ekranda uzun cümle üst barı taşırıyor. Eşikler 28.07 AKŞAMI yeniden
   ölçüldü: arama kutusu pencerenin tam ortasına ÇİVİLENDİ (sol menü açılıp kapansa da
   kımıldamıyor) → rozete kalan yer artık pencere genişliğine bağlı ve rozet ZAMANINDA
   kısalmazsa kutunun üstüne biner. Ölçülen genişlikler: tam 228px · orta ~180px ·
   kısa ~70px → tam ≥1520px, orta 1400-1519px, kısa <1400px.
   Eşikler `.pr-*` kurallarında (globals.css), tek yerde. */
function Rozet({
  tam,
  orta,
  kisa,
  acil = false,
}: {
  tam: string;
  orta: string;
  kisa: string;
  acil?: boolean;
}) {
  return (
    <Link
      href="/panel/ayarlar?tab=abonelik"
      className={`plan-rozet${acil ? " acil" : ""}`}
      title={tam}
    >
      <span className="pr-tam">{tam}</span>
      <span className="pr-orta">{orta}</span>
      <span className="pr-kisa">{kisa}</span>
    </Link>
  );
}
