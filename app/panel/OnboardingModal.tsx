"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { CURRENCIES } from "../../lib/currencies";

// Kayıt sonrası kurulum modalı — dashboard üstü, adım adım, en son plan.
//   Bireysel: para birimi → tip → ad soyad → plan
//   İşletme:  para birimi → tip → şirket adı + ad soyad → plan
// İsim: Google/Apple ile gelende OAuth'tan otomatik dolu (initialName); e-posta ile
// kayıtta boş gelir → kullanıcı bu adımda girmek zorunda (kayıt formundan kaldırıldı).

type Plan = "free" | "pro" | "max";
type StepKey = "currency" | "account" | "company" | "name" | "plan";

type PlanDef = { id: Plan; name: string; price: string; tag?: string; perks: string[] };

/* Planlar HESAP TÜRÜNE göre — MOBİL GERÇEĞİYLE BİREBİR (17.07.2026, Mehmet: "mobil ne ise
   web'de de o olacak"). Kaynak: paraner-app/app/premium.tsx + app/plan-detail.tsx.

   Önceki hâlde tek liste vardı ve mobilden 3 yerde sapıyordu:
   1) İşletmeye "Pro ₺149,90" deniyordu → mobilde İşletme Pro ₺490.
   2) Bireysele "Max" sunuluyordu → `individual_max_monthly` yazıyordu; mobilde böyle bir tier
      YOK (stores/authStore.ts) → plan mobilde etiketsiz görünüyordu.
   3) İşletmeye "Ücretsiz" sunuluyordu → mobil: "İşletme hesaplarında ücretsiz plan
      bulunmamaktadır" (plan-detail.tsx:103), işletme zorunlu trial ile başlar.

   MAX PLANLARI BURADA YOK — bilinçli: mobilde trial verilen planlar yalnızca
   individual_pro_monthly ve business_pro_monthly (premium.tsx:167 TRIAL_PLANS). Max "ödeme
   gerekli" diyor, ödeme sistemi ise henüz YOK ("çok yakında aktif olacak"). Ödeme gelince
   Max buraya mobil ile birlikte eklenir. */
const INDIVIDUAL_PLANS: PlanDef[] = [
  { id: "free", name: "Ücretsiz", price: "₺0", perks: ["Temel gelir-gider", "30 işlem/ay", "Günde 5 AI mesaj"] },
  {
    id: "pro",
    name: "Pro",
    price: "₺149,90/ay",
    tag: "14 gün ücretsiz",
    perks: ["Sınırsız işlem", "Sınırsız Parla AI", "Döviz & altın takibi", "Detaylı raporlar"],
  },
];

/* İşletmede ücretsiz plan YOK → tek seçenek İşletme Pro (14 gün deneme ile başlar). */
const BUSINESS_PLANS: PlanDef[] = [
  {
    id: "pro",
    name: "İşletme Pro",
    price: "₺490/ay",
    tag: "14 gün ücretsiz · kredi kartı gerekmez",
    perks: ["KDV & stopaj takibi", "Fatura & teklif", "Kâr/zarar raporu", "Cari hesap yönetimi"],
  },
];

export default function OnboardingModal({
  profileId,
  userId,
  initialName,
}: {
  profileId: string | null;
  userId: string;
  initialName: string;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currency, setCurrency] = useState("TRY");
  const [accountType, setAccountType] = useState<"individual" | "business" | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState(initialName || ""); // OAuth'ta dolu, e-postada boş
  const [plan, setPlan] = useState<Plan>("free");

  const isBusiness = accountType === "business";

  /* Hesap türü değişince planı o türün varsayılanına al. İki ayrı hatayı önlüyor:
     • İşletmede ücretsiz plan YOK (mobil paritesi) → plan "free" kalırsa kullanıcı hiç trial
       başlatmadan işletme hesabı açardı; mobilde bu mümkün değil.
     • Tür değiştirince eski seçim sızarsa geçersiz tier üretilir (ör. individual + max). */
  function pickAccountType(t: "individual" | "business") {
    setAccountType(t);
    setPlan(t === "business" ? "pro" : "free");
  }
  const firstName = (initialName || "").trim().split(" ")[0];

  // Tipe göre adım dizisi (Bireysel'de ad soyad adımı; İşletme'de şirket adımında birlikte)
  const steps: StepKey[] = isBusiness
    ? ["currency", "account", "company", "plan"]
    : ["currency", "account", "name", "plan"];
  const TOTAL = steps.length;
  const current = steps[step];
  const isLast = step === TOTAL - 1;

  // Bu adımda devam edilebilir mi (buton yeşil/aktif olsun mu)
  const canProceed =
    current === "currency" ? true
    : current === "account" ? !!accountType
    : current === "name" ? !!fullName.trim()
    : current === "company" ? !!companyName.trim() && !!fullName.trim()
    : true; // plan

  function next() {
    if (!canProceed) return;
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish() {
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const nameTrim = fullName.trim();
      const displayName = isBusiness ? companyName.trim() : nameTrim;
      const fields: Record<string, unknown> = {
        currency,
        account_type: accountType,
        profile_type: accountType,
        name: nameTrim,
        profile_name: displayName,
        onboarding_completed: true,
      };
      if (isBusiness) fields.company_name = companyName.trim();
      if (plan !== "free") {
        // Ödeme yakında → deneme olarak işaretle. Süre (14 gün) TEK YERDE: get_trial_status RPC
        // + mobil lib/trial.ts TRIAL_DAYS. Burada yalnız başlangıç damgası atılır.
        fields.is_premium = true;
        fields.subscription_tier = `${accountType}_${plan}_monthly`;
        fields.trial_plan = `${accountType}_${plan}_monthly`;
        fields.trial_start_date = new Date().toISOString();
      }

      let err;
      if (profileId) {
        ({ error: err } = await supabase.from("profiles").update(fields).eq("id", profileId));
      } else {
        ({ error: err } = await supabase
          .from("profiles")
          .insert({ auth_user_id: userId, is_active: true, ...fields }));
      }
      if (err) throw err;

      // Tam yeniden yükleme → server profili taze okur, modal güvenilir kapanır.
      // (router.refresh() bazen modalı kapatmadan butonu "Hazırlanıyor…"da bırakıyordu.)
      window.location.assign("/panel");
    } catch {
      setError("Kaydedilemedi. İnternetini kontrol edip tekrar dene.");
      setSaving(false);
    }
  }

  return (
    <div className="onb-overlay">
      <div className="onb-modal">
        <div className="onb-progress">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span key={i} className={i <= step ? "on" : ""} />
          ))}
        </div>

        {error && <div className="auth-msg error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Para birimi */}
        {current === "currency" && (
          <div className="onb-step">
            <h2>{firstName ? `Hoş geldin, ${firstName} 👋` : "Hoş geldin 👋"}</h2>
            <p>Hesabını hangi para biriminde takip edelim?</p>
            <div className="onb-list">
              {CURRENCIES.map((c) => (
                <button key={c.code} className={`onb-row ${currency === c.code ? "sel" : ""}`} onClick={() => setCurrency(c.code)}>
                  <span className="onb-flag">{c.flag}</span>
                  <span className="onb-row-main"><b>{c.name}</b><small>{c.code} · {c.symbol}</small></span>
                  {currency === c.code && <span className="onb-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nasıl kullanacaksın */}
        {current === "account" && (
          <div className="onb-step">
            <h2>Paraner'i nasıl kullanacaksın?</h2>
            <p>İstediğin zaman ikinci bir hesap da ekleyebilirsin.</p>
            <div className="onb-cards">
              <button className={`onb-pick ${accountType === "individual" ? "sel" : ""}`} onClick={() => pickAccountType("individual")}>
                <span className="onb-pick-emoji">👤</span>
                <b>Bireysel</b>
                <small>Kişisel gelir-gider, birikim ve hedefler</small>
              </button>
              <button className={`onb-pick ${accountType === "business" ? "sel" : ""}`} onClick={() => pickAccountType("business")}>
                <span className="onb-pick-emoji">🏢</span>
                <b>İşletme</b>
                <small>Fatura, cari, KDV, çalışan ve nakit akışı</small>
              </button>
            </div>
          </div>
        )}

        {/* Ad Soyad (sadece bireysel) — OAuth'ta dolu gelir, e-postada kullanıcı girer */}
        {current === "name" && (
          <div className="onb-step">
            <h2>Seni tanıyalım</h2>
            <p>Adın profilinde ve uygulamada görünür, sonra değiştirebilirsin.</p>
            <div className="field">
              <label>Ad Soyad <span className="onb-req">*</span></label>
              <input
                type="text"
                placeholder="Adın Soyadın"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Şirket adı + Ad Soyad (sadece işletme) */}
        {current === "company" && (
          <div className="onb-step">
            <h2>İşletmeni tanıyalım</h2>
            <p>Bu bilgiler faturalarında ve profilinde görünür, sonra değiştirebilirsin.</p>
            <div className="field">
              <label>Şirket adı <span className="onb-req">*</span></label>
              <input
                type="text"
                placeholder="Şirketinin adı"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label>Ad Soyad <span className="onb-req">*</span></label>
              <input
                type="text"
                placeholder="Adın Soyadın"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Plan */}
        {current === "plan" && (
          <div className="onb-step">
            <h2>{isBusiness ? "İşletme Pro ile başlıyorsun" : "Bir plan seç"}</h2>
            {/* Mobil paritesi (plan-detail.tsx:103): işletmede ücretsiz plan yok, 14 gün deneme
                ile başlar, kredi kartı istenmez. */}
            <p>
              {isBusiness
                ? "İşletme hesaplarında ücretsiz plan bulunmuyor. 14 gün ücretsiz denersin, kredi kartı gerekmez."
                : "Ödeme yakında — şimdilik dilediğin planla başla, sonra istediğin zaman değiştir."}
            </p>
            <div className="onb-plans">
              {(isBusiness ? BUSINESS_PLANS : INDIVIDUAL_PLANS).map((p) => (
                <button key={p.id} className={`onb-plan ${plan === p.id ? "sel" : ""}`} onClick={() => setPlan(p.id)}>
                  {p.tag && <span className="onb-plan-tag">{p.tag}</span>}
                  <div className="onb-plan-head"><b>{p.name}</b><span>{p.price}</span></div>
                  <ul>{p.perks.map((x) => <li key={x}>{x}</li>)}</ul>
                  {p.id !== "free" && <span className="onb-soon">Ödeme yakında · şimdilik ücretsiz dene</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="onb-actions">
          {step > 0 ? <button className="btn btn-ghost" onClick={back} disabled={saving}>Geri</button> : <span />}
          {!isLast ? (
            <button className={`btn ${canProceed ? "btn-primary" : "btn-ghost"}`} onClick={next} disabled={!canProceed}>
              Devam
            </button>
          ) : (
            <button className="btn btn-primary" onClick={finish} disabled={saving}>
              {saving ? "Hazırlanıyor…" : "Paraner'i Başlat"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
