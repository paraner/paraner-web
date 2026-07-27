"use client";

/* AYARLAR → ABONELİK
 *
 * Kullanıcının planını GÖRDÜĞÜ ve değiştirebildiği tek yer. Webde bugüne kadar hiç yoktu:
 * panel kullanıcıya planını da, denemesinin bittiğini de söylemiyordu (yalnız telefonda vardı).
 *
 * ⚠️ ÖDEME HENÜZ YOK. Kart tahsilatı için sağlayıcı entegrasyonu (iyzico/PayTR/Stripe)
 * gerekiyor; o gelene kadar:
 *   · 14 günlük denemesi OLAN plan + kişi hiç deneme kullanmamışsa → deneme GERÇEKTEN başlar
 *     (mobil premium.tsx handlePurchase ile aynı davranış, aynı alanlar).
 *   · Diğer her durumda düğme "Ödeme yakında" olarak KAPALI durur — çalışmayan bir
 *     "Satın al" düğmesi göstermek, olmayan bir söz vermektir.
 *
 * ⚠️ ÖDEME GELİNCE BURASI KIRILIR (GOREVLER'de de kayıtlı): deneme/premium alanlarını şu an
 * İSTEMCİ yazıyor (mobil de öyle) → kullanıcı teoride kendine premium yazabilir. Gerçek
 * ödeme günü bu alanlar RLS ile kilitlenip yalnız sunucu/webhook tarafından yazılmalı.
 *
 * Fiyat/plan listesi burada DEĞİL: `lib/plans.ts` (tek kaynak, mobil premium.tsx'ten türer).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";
import {
  plansFor,
  planHasTrial,
  tierLabel,
  trialStartFields,
  TRIAL_DAYS,
  type SubscriptionTier,
} from "../../../lib/plans";
// ⚠️ formatDate DEĞİL: o ISO'yu ham metin olarak böler (UTC) → İstanbul'da gece yarısını
// geçen bitişlerde tarih bir gün geri görünürdü. formatDayMonth saat dilimini sabit uygular.
import { formatDayMonth } from "../../../lib/format";
import { showToast } from "../../components/toast";
import type { AbonelikDurum } from "../../../lib/abonelik";
import { useSubmitLock } from "../../../lib/useSubmitLock";

const DURUM_ROZET: Record<AbonelikDurum["tur"], { etiket: string; sinif: string }> = {
  trial: { etiket: "Deneme", sinif: "blue" },
  zombie: { etiket: "Deneme bitti", sinif: "red" },
  paid: { etiket: "Aktif", sinif: "green" },
  free: { etiket: "Ücretsiz", sinif: "gray" },
};

export default function AbonelikBolumu({
  profileId,
  profileType,
  durum,
}: {
  profileId: string;
  profileType: string | null;
  durum: AbonelikDurum;
}) {
  const router = useRouter();
  const supabase = createClient();
  const lock = useSubmitLock();

  const planlar = plansFor(profileType);

  // Varsayılan seçim: mevcut planı varsa o, yoksa denemesi olan plan (mobil premium.tsx ile aynı
  // tercih — kullanıcının bugün GERÇEKTEN kullanabileceği seçenek önde dursun).
  const mevcut = planlar.find((p) => p.id === durum.tier)?.id;
  const denemeli = planlar.find((p) => planHasTrial(p.id))?.id ?? planlar[0].id;
  const [secili, setSecili] = useState<SubscriptionTier>(mevcut ?? denemeli);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const secPlan = planlar.find((p) => p.id === secili) ?? planlar[0];

  const aktifPlanMi = durum.tier === secPlan.id && (durum.tur === "trial" || durum.tur === "paid");
  // Deneme SADECE hiç kullanılmamışsa başlatılabilir — mobil guard ile aynı.
  const denemeBaslatilabilir = planHasTrial(secPlan.id) && !durum.denemeKullanildi;

  const dugmeYazi = aktifPlanMi
    ? "Mevcut planın"
    : denemeBaslatilabilir
      ? `${TRIAL_DAYS} Gün Ücretsiz Başlat`
      : "Ödeme yakında";

  const inceYazi = aktifPlanMi
    ? "Bu plan şu an kullanımda."
    : denemeBaslatilabilir
      ? `${TRIAL_DAYS} gün ücretsiz, sonra ₺${secPlan.price}${secPlan.period}. İstediğin an iptal edebilirsin.`
      : `${secPlan.totalLabel ?? `₺${secPlan.price}${secPlan.period}`} · Ödeme sistemi çok yakında aktif olacak.`;

  async function denemeBaslat() {
    if (!denemeBaslatilabilir || !lock.acquire()) return;
    setKaydediliyor(true);
    const { error } = await supabase
      .from("profiles")
      .update(trialStartFields(secPlan.id))
      .eq("id", profileId);
    setKaydediliyor(false);
    lock.release();
    if (error) {
      showToast({ title: "Deneme başlatılamadı", message: "Tekrar dene.", variant: "error" });
      return;
    }
    showToast({
      title: `${secPlan.name} denemen başladı`,
      message: `${TRIAL_DAYS} gün boyunca tüm özellikler açık.`,
    });
    // Panelin tamamı plana göre değişir (Parla kotası, kilitli özellikler) → segment önbelleğini düşür.
    router.refresh();
  }

  const rozet = DURUM_ROZET[durum.tur];

  return (
    <>
      <div className="settings-block">
        <h3>Aboneliğin</h3>

        <div className="sub-status">
          <div className="ss-item">
            <span className="ss-k">Plan</span>
            <span className="ss-v">
              {durum.tur === "free" ? "Ücretsiz" : tierLabel(durum.tier)}
            </span>
          </div>
          <div className="ss-item">
            <span className="ss-k">Durum</span>
            <span className={`badge ${rozet.sinif}`}>{rozet.etiket}</span>
          </div>
          {durum.tur === "trial" && (
            <>
              <div className="ss-item">
                <span className="ss-k">Kalan</span>
                <span className="ss-v">{durum.kalanGun} gün</span>
              </div>
              {durum.bitisIso && (
                <div className="ss-item">
                  <span className="ss-k">Bitiş</span>
                  <span className="ss-v">{formatDayMonth(durum.bitisIso)}</span>
                </div>
              )}
            </>
          )}
          {durum.tur === "zombie" && durum.bitisIso && (
            <div className="ss-item">
              <span className="ss-k">Bitiş</span>
              <span className="ss-v">{formatDayMonth(durum.bitisIso)}</span>
            </div>
          )}
        </div>

        {durum.tur === "free" && durum.denemeKullanildi && (
          <p className="sub-note">
            Ücretsiz deneme hakkını kullandın. Ödeme sistemi açılınca planını buradan
            yükseltebileceksin.
          </p>
        )}
        {durum.tur === "zombie" && (
          <p className="sub-note">
            Deneme sürenin bitmesine rağmen hesabın hâlâ açık görünüyor. Ödeme sistemi
            açılınca planını buradan seçebilirsin.
          </p>
        )}
      </div>

      <div className="settings-block">
        <h3>{durum.tur === "free" ? "Planlar" : "Plan Değiştir"}</h3>

        <div className="plan-grid">
          {planlar.map((p) => {
            const sec = p.id === secili;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={sec}
                className={`plan-card${sec ? " sel" : ""}${p.recommended ? " onerilen" : ""}`}
                onClick={() => setSecili(p.id)}
              >
                <div className="pc-top">
                  <span className="pc-name">{p.name}</span>
                  {p.badge && <span className="pc-badge">{p.badge}</span>}
                </div>

                <div className="pc-price">
                  <span className="pc-cur">₺</span>
                  <span className="pc-amount">{p.price}</span>
                  <span className="pc-period">{p.period}</span>
                </div>
                {p.totalLabel && <div className="pc-total">{p.totalLabel}</div>}
                {p.savingsShort && <div className="pc-save">{p.savingsShort}</div>}

                <ul className="pc-features">
                  {p.features.map((f) => (
                    <li key={f}>
                      <Check size={14} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Rozet YALNIZ seçili olmayan kartta: seçiliyken alttaki düğme zaten
                    "Mevcut planın" diyor, ikisi birden çift yazı olarak okunuyordu. */}
                {durum.tier === p.id &&
                  p.id !== secili &&
                  (durum.tur === "trial" || durum.tur === "paid") && (
                    <span className="pc-current">Mevcut planın</span>
                  )}
                <span className="pc-radio" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="plan-foot">
          <p className="plan-fine">{inceYazi}</p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!denemeBaslatilabilir || kaydediliyor}
            onClick={denemeBaslat}
          >
            {kaydediliyor ? "Başlatılıyor…" : dugmeYazi}
          </button>
        </div>
      </div>
    </>
  );
}
