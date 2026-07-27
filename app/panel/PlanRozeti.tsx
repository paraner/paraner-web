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

/** Son 2 gün: mobildeki uyarı eşiğiyle aynı gün (lib/trial.ts TRIAL_WARN_DAY). */
const UYARI_ESIGI = 2;

export default function PlanRozeti({ durum }: { durum: AbonelikDurum }) {
  // Ücretli kullanıcıya satacak bir şey yok → rozet yok.
  if (durum.tur === "paid") return null;

  const denemede = durum.tur === "trial";
  const aciliyet = denemede && durum.kalanGun <= UYARI_ESIGI;

  const metin = denemede
    ? `Deneme · ${durum.kalanGun} gün`
    : durum.tur === "zombie"
      ? "Denemen bitti"
      : "Ücretsiz plan";

  return (
    <Link
      href="/panel/ayarlar?tab=abonelik"
      className={`plan-rozet${aciliyet ? " uyari" : ""}`}
      title="Aboneliğini yönet"
    >
      {metin}
    </Link>
  );
}
