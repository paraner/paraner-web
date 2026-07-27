"use client";

/* ÜST BAR — PLAN / DENEME ROZETİ
 *
 * Panel kullanıcıya planını hiçbir yerde söylemiyordu; denemesi biterken de haberi olmuyordu
 * (uyarı yalnız telefonda vardı). Rozet her sayfada görünür, tıklayınca Ayarlar > Abonelik.
 *
 * Mehmet'in kararı: × ile kapatılır ama "her girişte tekrar gösterilsin" → `sessionStorage`
 * (o oturum boyunca gizli, yeni girişte/yeni sekmede geri gelir).
 * ⚠️ Bu, mobildeki KALICI kapatmadan (`trial_notified_day5` DB alanı) AYRI bir şeydir:
 * buradaki × veritabanına hiçbir şey yazmaz, telefondaki uyarıyı etkilemez.
 *
 * ⚠️ Durum SUNUCUDAN geliyor (`lib/abonelik`), burada gün hesabı YAPILMAZ: istemcide
 * `Date.now()` cihazın saatidir.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { AbonelikDurum } from "../../lib/abonelik";

const ANAHTAR = "paraner-plan-rozeti-gizli";
/** Son 2 gün: mobildeki uyarı eşiğiyle aynı gün (lib/trial.ts TRIAL_WARN_DAY). */
const UYARI_ESIGI = 2;

export default function PlanRozeti({ durum }: { durum: AbonelikDurum }) {
  const [gizli, setGizli] = useState(false);
  // Sunucu HTML'i ile aynı olsun diye ilk render'da hep görünür; tercih effect'te okunur.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(ANAHTAR) === "1") setGizli(true);
    } catch {
      /* gizli mod / depolama kapalı → rozet görünür kalsın */
    }
  }, []);

  // Ücretli kullanıcıya satacak bir şey yok → rozet yok.
  if (durum.tur === "paid" || gizli) return null;

  const denemede = durum.tur === "trial";
  const aciliyet = denemede && durum.kalanGun <= UYARI_ESIGI;

  const metin = denemede
    ? `Deneme · ${durum.kalanGun} gün`
    : durum.tur === "zombie"
      ? "Denemen bitti"
      : "Ücretsiz plan";

  return (
    <span className={`plan-rozet${aciliyet ? " uyari" : ""}`}>
      <Link href="/panel/ayarlar?tab=abonelik" className="pr-link" title="Aboneliğini yönet">
        {metin}
      </Link>
      <button
        type="button"
        className="pr-kapat"
        aria-label="Rozeti gizle"
        onClick={() => {
          setGizli(true);
          try {
            sessionStorage.setItem(ANAHTAR, "1");
          } catch {
            /* yazılamazsa sorun değil: sayfa yenilenince geri gelir */
          }
        }}
      >
        <X aria-hidden="true" />
      </button>
    </span>
  );
}
