"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import LogoutButton from "../LogoutButton";
import { confirmDialog } from "../../components/confirm";
import { showToast } from "../../components/toast";
import { toCsv, downloadCsv, parseCsv } from "../../../lib/csv";
import { parseAmount } from "../../../lib/format";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import SaveButton from "../../../components/SaveButton";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import {
  AVATAR_ACCEPT,
  MAX_AVATAR_BYTES,
  uploadProfileImage,
  removeProfileImage,
} from "../../../lib/profileMedia";

export type Profile = {
  id: string;
  profile_name: string | null;
  profile_type: string | null;
  currency: string | null;
  is_active: boolean;
  invoice_prefix: string | null;
  invoice_next_number: number | null;
  // Kimlik (bireysel + işletme)
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  company_logo_url: string | null;
  // Şirket bilgileri (yalnız işletme) — faturaya/resmî belgeye basılan satıcı bilgileri
  company_name: string | null;
  tax_number: string | null;
  tax_office: string | null;
  company_address: string | null;
  company_email: string | null;
  iban: string | null;
  website: string | null;
  mersis_no: string | null;
  trade_registry_no: string | null;
};

export type DeviceRow = {
  id: string;
  device_id: string;
  device_name: string | null;
  platform: string | null;
  last_city: string | null;
  first_seen: string;
  last_seen: string;
};

/* Sekmeli ayarlar (SaaS standardı: kapsam ayrımı).
   ⚠️ Eski "İşletme" sekmesi ÜÇ ilgisiz şeyi (fatura numaralama + veri yedekleme + roller)
   tek çuvala koyuyordu → ayrıldı:
     Hesap Bilgileri (profil/şirket) · Fatura (numaralama; ileride tasarım) ·
     Veri & Yedekleme (dışa/içe aktarma — bireyselde de var) · Bildirimler ·
     Hesap & Güvenlik (kullanıcıya ait + tehlike bölgesi).
   Derin link: ?tab=veri (history.replaceState ile, sayfa yenilenmez). */
type TabKey = "genel" | "fatura" | "veri" | "bildirimler" | "hesap";

export default function AyarlarClient({
  email,
  profiles,
  devices,
  hasPassword,
}: {
  email: string;
  profiles: Profile[];
  devices: DeviceRow[];
  /** Kullanıcının şifresi var mı (auth user_metadata.has_password) → "Şifre Belirle" / "Şifre Değiştir" */
  hasPassword: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();

  const active = profiles.find((p) => p.is_active) ?? profiles[0];
  const isBusiness = active?.profile_type === "business";

  const tabs: { key: TabKey; label: string }[] = [
    { key: "genel", label: "Hesap Bilgileri" },
    // Fatura yalnız işletmede; Veri & Yedekleme HERKESTE (bireysel de işlemlerini indirebilmeli)
    ...(isBusiness ? [{ key: "fatura" as TabKey, label: "Fatura" }] : []),
    { key: "veri", label: "Veri & Yedekleme" },
    { key: "bildirimler", label: "Bildirimler" },
    { key: "hesap", label: "Hesap & Güvenlik" },
  ];

  const [tab, setTab] = useState<TabKey>("genel");

  // URL'den sekmeyi al (derin link) — yalnız mount'ta; SSR/hydration uyumu için effect'te
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as TabKey | null;
    if (t && tabs.some((x) => x.key === t)) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTab(k: TabKey) {
    setTab(k);
    const u = new URL(window.location.href);
    u.searchParams.set("tab", k);
    window.history.replaceState(null, "", u.toString());
  }

  const [switching, setSwitching] = useState(false);

  const typeLabel = (t: string | null) =>
    t === "business" ? "İşletme" : "Bireysel";

  async function switchTo(p: Profile) {
    if (p.is_active || switching) return;
    setSwitching(true);
    // ÖNCE hedefi aktifle, SONRA diğerlerini pasifle. Sıra kritik: ilk adım başarısız
    // olursa hiçbir şey değişmez (eski profil aktif kalır); ikinci adım başarısız olsa
    // bile en az bir profil (hem eski hem yeni) aktif kalır → asla "hiç aktif profil yok"
    // durumu oluşmaz (o durum tüm paneli "Profil bulunamadı"da kilitlerdi).
    const { error: actErr } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", p.id);
    if (actErr) {
      showToast({ title: "Profil değiştirilemedi", message: "Tekrar dene.", variant: "error" });
      setSwitching(false);
      return;
    }
    const others = profiles.filter((x) => x.id !== p.id).map((x) => x.id);
    if (others.length) {
      await supabase.from("profiles").update({ is_active: false }).in("id", others);
    }
    // Tüm panel aktif profile göre değişir → tam yenile
    router.push("/panel");
    router.refresh();
  }

  return (
    <div className="settings-wrap">
      <h1 className="panel-h1">Ayarlar</h1>
      <p className="panel-sub">Profil, hesap ve işletme ayarların</p>

      <div className="set-tabs" role="tablist" aria-label="Ayar bölümleri">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`set-tab${tab === t.key ? " active" : ""}`}
            onClick={() => selectTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "genel" && (
        <>
          {active ? (
            <AccountInfo key={active.id} profile={active} email={email} isBusiness={isBusiness} />
          ) : (
            <p className="panel-sub">Profil bulunamadı.</p>
          )}

          {profiles.length > 1 && (
            <div className="settings-block">
              <h3>Profil Değiştir</h3>
              <div className="tx-list">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className={`profile-row${p.is_active ? " active" : ""}`}
                    onClick={() => switchTo(p)}
                  >
                    <div>
                      <div className="p-name">{p.profile_name ?? "Profil"}</div>
                      <div className="p-type">{typeLabel(p.profile_type)}</div>
                    </div>
                    {p.is_active ? (
                      <span className="badge green">Aktif</span>
                    ) : (
                      <span className="badge gray">Geç</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ekip erişimi "kim bu hesaba girebilir" sorusudur → İşletme/Fatura değil,
              Hesap Bilgileri'nin altına ait. Planı: COKLU-HESAP.md */}
          {isBusiness && <RolesSoon />}
        </>
      )}

      {tab === "fatura" && isBusiness && active && (
        <>
          <InvoiceNumbering
            profileId={active.id}
            initialPrefix={active.invoice_prefix ?? "MGZR"}
            initialNext={active.invoice_next_number ?? 1}
          />
          <InvoiceDesignSoon />
        </>
      )}

      {tab === "veri" &&
        (active ? (
          <DataBackup
            profileId={active.id}
            profileName={active.profile_name}
            isBusiness={isBusiness}
          />
        ) : (
          <p className="panel-sub">Profil bulunamadı.</p>
        ))}

      {tab === "bildirimler" &&
        (active ? (
          <NotificationPrefs profileId={active.id} isBusiness={isBusiness} />
        ) : (
          <p className="panel-sub">Profil bulunamadı.</p>
        ))}

      {tab === "hesap" && (
        <>
          <div className="settings-block">
            <h3>Hesap</h3>
            <div className="tx-list">
              <div className="info-row">
                <span className="k">E-posta</span>
                <span className="v">{email}</span>
              </div>
            </div>
          </div>

          <PasswordSection email={email} initialHasPassword={hasPassword} />

          <DevicesSection devices={devices} />

          <div className="settings-block">
            <h3>Oturum</h3>
            <LogoutButton />
          </div>

          <DeleteAccountSection />
        </>
      )}
    </div>
  );
}

/* ══ Hesap Bilgileri ══════════════════════════════════════════════════════════
   Tek kart, iki alt sekme: Profil (herkes) · Şirket bilgileri (yalnız işletme).
   Bireysel profilde şirket alt sekmesi HİÇ render edilmez — ihtiyacı yok.

   Not: Buradaki alanların TAMAMI `profiles` tablosunda ZATEN vardı (mobil yazıyor),
   web hiçbirini göstermiyordu → şemaya dokunulmadı. Şirket bilgileri (unvan/VKN/vergi
   dairesi) yasal faturanın satıcı tarafıdır; müşteri tarafı (contacts) hep vardı. */

type SubTab = "profil" | "sirket";

function AccountInfo({
  profile,
  email,
  isBusiness,
}: {
  profile: Profile;
  email: string;
  isBusiness: boolean;
}) {
  const [sub, setSub] = useState<SubTab>("profil");

  return (
    <div className="settings-block">
      <h3>Hesap Bilgileri</h3>
      {/* Açıklama alt sekmeye göre değişir — Şirket bölümünün kendi açıklaması var,
          ikisi birden basılırsa üst üste iki paragraf olurdu. */}
      {(sub === "profil" || !isBusiness) && (
        <p className="set-lead">
          {isBusiness
            ? "Kimlik ve iletişim bilgilerin; panelde ve belgelerinde görünen logon."
            : "Kimlik ve iletişim bilgilerin."}
        </p>
      )}

      {isBusiness && (
        <div className="set-subtabs" role="tablist" aria-label="Hesap bilgileri bölümleri">
          {([
            { key: "profil", label: "Profil" },
            { key: "sirket", label: "Şirket bilgileri" },
          ] as { key: SubTab; label: string }[]).map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={sub === s.key}
              className={`set-subtab${sub === s.key ? " active" : ""}`}
              onClick={() => setSub(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {sub === "profil" || !isBusiness ? (
        <ProfileForm profile={profile} email={email} isBusiness={isBusiness} />
      ) : (
        <CompanyForm profile={profile} />
      )}
    </div>
  );
}

/* ── Profil: ad, iletişim, panelde görünen ad + logo/avatar ── */
function ProfileForm({
  profile,
  email,
  isBusiness,
}: {
  profile: Profile;
  email: string;
  isBusiness: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const lock = useSubmitLock();

  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [displayName, setDisplayName] = useState(profile.profile_name ?? "");
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== (profile.name ?? "") ||
    phone !== (profile.phone ?? "") ||
    displayName !== (profile.profile_name ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || !lock.acquire()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim() || null,
        phone: phone.trim() || null,
        // Panelde görünen ad boş bırakılamaz (sidebar "Profil" yazardı) → eskisine düş
        profile_name: displayName.trim() || profile.profile_name,
      })
      .eq("id", profile.id);
    setSaving(false);
    lock.release();
    if (error) {
      showToast({ title: "Kaydedilemedi", message: "Profil bilgileri güncellenemedi, tekrar dene.", variant: "error" });
      return;
    }
    showToast({ title: "Kaydedildi", message: "Profil bilgilerin güncellendi.", variant: "success" });
    router.refresh(); // istemci önbelleği açık → yoksa geri dönünce bayat veri
  }

  return (
    <form onSubmit={save}>
      <div className="fg-group">Kimlik ve iletişim</div>
      <div className="form-grid">
        <div className="fg">
          <label htmlFor="pf-name">Ad Soyad</label>
          <input
            id="pf-name"
            className="set-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adın ve soyadın"
            autoComplete="name"
          />
        </div>
        <div className="fg">
          <label htmlFor="pf-phone">Telefon</label>
          <input
            id="pf-phone"
            className="set-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0(5xx) xxx xx xx"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <div className="fg">
          <label htmlFor="pf-email">E-posta</label>
          <input id="pf-email" className="set-input" value={email} disabled />
          <span className="fg-hint">Giriş yaptığın adres. Hesap &amp; Güvenlik bölümünden yönetilir.</span>
        </div>
        <div className="fg">
          <label htmlFor="pf-display">Panelde görünen ad</label>
          <input
            id="pf-display"
            className="set-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={isBusiness ? "İşletme adın" : "Profil adın"}
          />
          <span className="fg-hint">Sol menüde ve hesap seçicide bu ad görünür.</span>
        </div>
      </div>

      <ProfileImage profile={profile} isBusiness={isBusiness} />

      <div className="fg-actions">
        <SaveButton busy={saving} disabled={!dirty || saving}>
          Kaydet
        </SaveButton>
      </div>
    </form>
  );
}

/* ── Logo / profil fotoğrafı ── public `avatars` bucket'ı.
   İşletme → company_logo_url, bireysel → avatar_url (Sidebar profileAvatarUrl ile aynı ayrım). */
function ProfileImage({ profile, isBusiness }: { profile: Profile; isBusiness: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const column = isBusiness ? "company_logo_url" : "avatar_url";
  const current = (isBusiness ? profile.company_logo_url : profile.avatar_url) ?? null;

  const [url, setUrl] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);

  const label = isBusiness ? "Şirket logosu" : "Profil fotoğrafı";

  async function pick(file: File | undefined) {
    if (!file || busy) return;
    if (file.size > MAX_AVATAR_BYTES) {
      showToast({ title: "Dosya çok büyük", message: "En fazla 5 MB yükleyebilirsin.", variant: "error" });
      return;
    }
    setBusy(true);
    const previous = url;
    try {
      const publicUrl = await uploadProfileImage(profile.id, file);
      const { error } = await supabase
        .from("profiles")
        .update({ [column]: publicUrl })
        .eq("id", profile.id);
      if (error) throw error;
      setUrl(publicUrl);
      // Yeni görsel kaydedildikten SONRA eskisini sil (önce silersek hata halinde ikisi de gider)
      removeProfileImage(previous).catch(() => {});
      showToast({ title: "Yüklendi", message: `${label} güncellendi.`, variant: "success" });
      router.refresh(); // sidebar da bu görseli gösteriyor
    } catch {
      showToast({ title: "Yüklenemedi", message: "Görsel yüklenemedi, tekrar dene.", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (busy || !url) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ [column]: null })
      .eq("id", profile.id);
    if (error) {
      setBusy(false);
      showToast({ title: "Kaldırılamadı", message: "Tekrar dene.", variant: "error" });
      return;
    }
    removeProfileImage(url).catch(() => {});
    setUrl(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <div className="fg-group">{label}</div>
      <p className="fg-hint" style={{ marginTop: -6, marginBottom: 10 }}>
        {isBusiness
          ? "Sol menüde ve belgelerinde görünür; kare, en az 400×400 px önerilir."
          : "Sol menüde görünür; kare, en az 400×400 px önerilir."}
      </p>

      <div className="logo-drop">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- kullanıcı yüklemesi, boyut değişken
          <img src={url} alt={label} className="logo-preview" />
        ) : (
          <div className="logo-empty">Henüz görsel yok</div>
        )}
        <div className="logo-actions">
          {/* <label> + gizli input: dosya seçici. Çıplak `.btn` şeffaf (arka plan/çerçevesi yok)
              → görünür olması için ghost varyantı. */}
          <label className={`btn btn-ghost btn-sm${busy ? " is-disabled" : ""}`}>
            {busy ? "Yükleniyor…" : url ? "Değiştir" : "Görsel Seç"}
            <input
              type="file"
              accept={AVATAR_ACCEPT}
              hidden
              disabled={busy}
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = ""; // aynı dosya tekrar seçilebilsin
              }}
            />
          </label>
          {url && (
            <button type="button" className="btn btn-ghost btn-sm danger" onClick={clear} disabled={busy}>
              Kaldır
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Şirket bilgileri (yalnız işletme) ── faturaya/resmî belgeye basılan SATICI bilgileri.
   VKN/TCKN ve vergi dairesi yasal faturada zorunludur; e-Fatura entegrasyonunun da ön koşulu. */
const onlyDigits = (v: string) => v.replace(/[^0-9]/g, "");

function CompanyForm({ profile }: { profile: Profile }) {
  const supabase = createClient();
  const router = useRouter();
  const lock = useSubmitLock();

  const [f, setF] = useState({
    company_name: profile.company_name ?? "",
    tax_number: profile.tax_number ?? "",
    tax_office: profile.tax_office ?? "",
    trade_registry_no: profile.trade_registry_no ?? "",
    mersis_no: profile.mersis_no ?? "",
    company_email: profile.company_email ?? "",
    website: profile.website ?? "",
    company_address: profile.company_address ?? "",
    iban: profile.iban ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof f, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: "" } : p));
  };

  const dirty = (Object.keys(f) as (keyof typeof f)[]).some(
    (k) => f[k] !== ((profile[k as keyof Profile] as string | null) ?? "")
  );

  function validate(): boolean {
    const e: Record<string, string> = {};
    // Boş bırakılabilir; DOLU ise formatı doğru olmalı (yanlış VKN faturayı geçersiz kılar).
    if (f.tax_number && ![10, 11].includes(f.tax_number.length))
      e.tax_number = "VKN 10, TCKN 11 haneli olmalı.";
    if (f.mersis_no && f.mersis_no.length !== 16) e.mersis_no = "MERSİS numarası 16 haneli olmalı.";
    if (f.iban) {
      const iban = f.iban.replace(/\s/g, "").toUpperCase();
      if (!/^TR\d{24}$/.test(iban)) e.iban = "IBAN TR ile başlamalı ve 26 karakter olmalı.";
    }
    if (f.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.company_email))
      e.company_email = "Geçerli bir e-posta gir.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (!dirty || !validate() || !lock.acquire()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        company_name: f.company_name.trim() || null,
        tax_number: f.tax_number.trim() || null,
        tax_office: f.tax_office.trim() || null,
        trade_registry_no: f.trade_registry_no.trim() || null,
        mersis_no: f.mersis_no.trim() || null,
        company_email: f.company_email.trim() || null,
        website: f.website.trim() || null,
        company_address: f.company_address.trim() || null,
        iban: f.iban.replace(/\s/g, "").toUpperCase() || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    lock.release();
    if (error) {
      showToast({ title: "Kaydedilemedi", message: "Şirket bilgileri güncellenemedi, tekrar dene.", variant: "error" });
      return;
    }
    showToast({ title: "Kaydedildi", message: "Şirket bilgilerin güncellendi.", variant: "success" });
    router.refresh();
  }

  return (
    <form onSubmit={save}>
      <p className="set-lead">
        Unvan, vergi ve kayıt bilgileri faturalarında ve resmî belgelerinde görünür; ticari kayıtlarınla birebir aynı olmalı.
      </p>

      <div className="fg-group">Ticari kayıt</div>
      <div className="form-grid">
        <div className="fg">
          <label htmlFor="cf-company">Firma Adı / Unvan</label>
          <input
            id="cf-company"
            className="set-input"
            value={f.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            placeholder="Örn. Paraner Yazılım A.Ş."
          />
        </div>
        <div className="fg">
          <label htmlFor="cf-tax">Vergi Numarası (VKN/TCKN)</label>
          <input
            id="cf-tax"
            className={`set-input${errors.tax_number ? " has-error" : ""}`}
            value={f.tax_number}
            onChange={(e) => set("tax_number", onlyDigits(e.target.value).slice(0, 11))}
            placeholder="12345678900"
            inputMode="numeric"
          />
          <span className={errors.tax_number ? "fg-error" : "fg-hint"}>
            {errors.tax_number || "Fatura kesebilmek için gereklidir (VKN 10, TCKN 11 hane)."}
          </span>
        </div>
        <div className="fg">
          <label htmlFor="cf-office">Vergi Dairesi</label>
          <input
            id="cf-office"
            className="set-input"
            value={f.tax_office}
            onChange={(e) => set("tax_office", e.target.value)}
            placeholder="Örn. Kadıköy"
          />
        </div>
        <div className="fg">
          <label htmlFor="cf-registry">Ticaret Sicil Numarası</label>
          <input
            id="cf-registry"
            className="set-input"
            value={f.trade_registry_no}
            onChange={(e) => set("trade_registry_no", e.target.value)}
            placeholder="Örn. 123456-5"
          />
        </div>
        <div className="fg">
          <label htmlFor="cf-mersis">MERSİS Numarası</label>
          <input
            id="cf-mersis"
            className={`set-input${errors.mersis_no ? " has-error" : ""}`}
            value={f.mersis_no}
            onChange={(e) => set("mersis_no", onlyDigits(e.target.value).slice(0, 16))}
            placeholder="1234567890123456"
            inputMode="numeric"
          />
          <span className={errors.mersis_no ? "fg-error" : "fg-hint"}>
            {errors.mersis_no || "16 haneli rakamdan oluşur."}
          </span>
        </div>
      </div>

      <div className="fg-group">İletişim ve adres</div>
      <div className="form-grid">
        <div className="fg">
          <label htmlFor="cf-email">Şirket E-postası</label>
          <input
            id="cf-email"
            className={`set-input${errors.company_email ? " has-error" : ""}`}
            value={f.company_email}
            onChange={(e) => set("company_email", e.target.value)}
            placeholder="info@sirketin.com"
            inputMode="email"
          />
          {errors.company_email && <span className="fg-error">{errors.company_email}</span>}
        </div>
        <div className="fg">
          <label htmlFor="cf-web">Web Sitesi</label>
          <input
            id="cf-web"
            className="set-input"
            value={f.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="sirketin.com"
          />
        </div>
        <div className="fg fg-full">
          <label htmlFor="cf-address">Adres</label>
          <textarea
            id="cf-address"
            className="set-input"
            rows={3}
            value={f.company_address}
            onChange={(e) => set("company_address", e.target.value)}
            placeholder="Mahalle, cadde, kapı no, ilçe / il"
          />
        </div>
      </div>

      <div className="fg-group">Ödeme</div>
      <div className="form-grid">
        <div className="fg fg-full">
          <label htmlFor="cf-iban">IBAN</label>
          <input
            id="cf-iban"
            className={`set-input${errors.iban ? " has-error" : ""}`}
            value={f.iban}
            onChange={(e) => set("iban", e.target.value.toUpperCase())}
            placeholder="TR00 0000 0000 0000 0000 0000 00"
          />
          <span className={errors.iban ? "fg-error" : "fg-hint"}>
            {errors.iban || "Faturalarında ödeme bilgisi olarak görünür."}
          </span>
        </div>
      </div>

      <div className="fg-actions">
        <SaveButton busy={saving} disabled={!dirty || saving}>
          Kaydet
        </SaveButton>
      </div>
    </form>
  );
}

/* ── Şifre Belirle / Şifre Değiştir ── Mobil `app/change-password.tsx` paritesi.
   Google/Apple ile kayıt olan (ve e-posta+OTP ile kayıt olan) kullanıcının şifresi YOKTUR →
   burada belirler; sonra e-posta+şifre ile de girebilir.

   ⚠️ "Şifresi var mı" kararı PROVIDER'a bakılarak verilemez: e-posta+OTP kullanıcısının da
   şifresi yoktur. Mobil bunun için `user_metadata.has_password` bayrağını kullanıyor; web de
   aynı bayrağı okuyup yazıyor (tek kaynak → iki uygulamada da doğru etiket). */
function strengthOf(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Zayıf", color: "#E24B4A" };
  if (score <= 2) return { level: 2, label: "Orta", color: "#E0A030" };
  if (score <= 3) return { level: 3, label: "İyi", color: "#E0A030" };
  return { level: 4, label: "Güçlü", color: "#3BA55D" };
}

function PasswordSection({
  email,
  initialHasPassword,
}: {
  email: string;
  initialHasPassword: boolean;
}) {
  const supabase = createClient();
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lock = useSubmitLock();

  // Şifre YOKSA "belirleme" modu: mevcut şifre sorulmaz (oturum zaten geçerli).
  const isSet = !hasPassword;
  const strength = strengthOf(next);
  const canSubmit =
    (isSet || current.length > 0) && next.length >= 6 && confirm.length > 0 && next === confirm;

  function close() {
    if (saving) return;
    setOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !lock.acquire()) return;
    setSaving(true);
    setError(null);
    try {
      // Değiştirme modunda önce ESKİ şifreyi doğrula (belirleme modunda böyle bir şifre yok).
      if (!isSet) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: current,
        });
        if (signInError) {
          setError("Mevcut şifren yanlış.");
          return;
        }
        if (current === next) {
          setError("Yeni şifre, mevcut şifrenden farklı olmalı.");
          return;
        }
      }

      const { error: updErr } = await supabase.auth.updateUser({
        password: next,
        data: { has_password: true }, // mobil ile ortak bayrak → etiket iki uygulamada da doğru
      });
      if (updErr) throw updErr;

      // Şifre DEĞİŞTİRİLDİYSE diğer cihazların oturumunu kapat (güvenlik).
      // Belirleme modunda kapatılmaz: kullanıcının başka şifreli oturumu zaten yok, telefonundan
      // durduk yere atmanın anlamı olmaz (mobil de böyle yapıyor).
      if (!isSet) {
        try { await supabase.auth.signOut({ scope: "others" }); } catch { /* önemsiz */ }
      }

      setHasPassword(true);
      showToast({
        title: isSet ? "Şifre belirlendi" : "Şifre değişti",
        // Hangi hesaba kurulduğunu bildir → yanlış hesaba şifre koyup fark etmeme durumu bitsin.
        message: isSet
          ? `${email} artık e-posta + şifre ile de giriş yapabilir.`
          : `${email} şifresi güncellendi. Diğer cihazlardan çıkış yapıldı.`,
        variant: "success",
      });
      close();
    } catch (err) {
      // Supabase hata metinlerini kullanıcı diline çevir (mobil ile aynı eşleme).
      const raw = ((err as Error)?.message || "").toLowerCase();
      if (raw.includes("different") || raw.includes("same")) {
        if (isSet) {
          // Hesapta ZATEN şifre var ama bayrak işaretsizmiş → bayrağı düzelt (etiket artık doğru olur).
          try {
            await supabase.auth.updateUser({ data: { has_password: true } });
            setHasPassword(true);
          } catch { /* yoksay */ }
          setError(
            "Bu hesapta zaten bir şifre tanımlı. Onunla giriş yapabilirsin; değiştirmek istersen FARKLI bir şifre gir."
          );
        } else {
          setError("Yeni şifre, mevcut şifrenden farklı olmalı.");
        }
      } else if (
        raw.includes("weak") || raw.includes("pwned") || raw.includes("leaked") || raw.includes("compromised")
      ) {
        setError("Bu şifre çok yaygın/güvensiz. Daha güçlü bir şifre seç.");
      } else if (raw.includes("at least") || raw.includes("6 characters") || raw.includes("short")) {
        setError("Şifre en az 6 karakter olmalı.");
      } else if (raw.includes("network") || raw.includes("fetch") || raw.includes("timeout")) {
        setError("Bağlantı hatası. İnternetini kontrol edip tekrar dene.");
      } else {
        setError(isSet ? "Şifre belirlenemedi. Tekrar dene." : "Şifre değiştirilemedi. Tekrar dene.");
      }
    } finally {
      setSaving(false);
      lock.release();
    }
  }

  return (
    <div className="settings-block">
      <h3>Şifre</h3>
      <div className="set-field">
        <div className="sf-info">
          {/* Kart başlığı zaten "Şifre" → etiket onu tekrar etmesin (durumu anlatsın) */}
          <label>{hasPassword ? "Hesap şifresi tanımlı" : "Henüz şifre yok"}</label>
          <span className="sf-hint">
            {hasPassword
              ? "Şifreni güncelle. Değiştirince diğer cihazlardaki oturumlar kapanır."
              : "Hesabına şifre belirle; doğrulama kodunun yanı sıra e-posta ve şifrenle de giriş yapabilirsin."}
          </span>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
          {hasPassword ? "Değiştir" : "Şifre Belirle"}
        </button>
      </div>

      {open && (
        <Modal title={isSet ? "Şifre Belirle" : "Şifre Değiştir"} onClose={close} busy={saving}>
          <form onSubmit={handleSave}>
            {/* Şifre HER ZAMAN o an oturum açık olan hesaba kurulur. Hangi hesap olduğu
                yazılmazsa (birden fazla hesabı olan kullanıcı) yanlış hesaba şifre koyulabilir
                — Mehmet bunu yaşadı. Hedef hesabı açıkça göster. */}
            <p className="pw-target">
              Şifre şu hesap için ayarlanacak: <strong>{email}</strong>
            </p>
            {!isSet && (
              <Field label="Mevcut Şifre">
                <input
                  className="input"
                  type={show ? "text" : "password"}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Mevcut şifreni gir"
                  autoComplete="current-password"
                />
              </Field>
            )}

            <Field label={isSet ? "Şifre" : "Yeni Şifre"}>
              <input
                className="input"
                type={show ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="En az 6 karakter"
                autoComplete="new-password"
              />
            </Field>

            {next.length > 0 && (
              <div className="pw-strength">
                <div className="pw-bar">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="pw-seg"
                      style={{ background: i <= strength.level ? strength.color : "rgba(255,255,255,0.12)" }}
                    />
                  ))}
                </div>
                <span className="pw-label" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}

            <Field label={isSet ? "Şifre (Tekrar)" : "Yeni Şifre (Tekrar)"}>
              <input
                className="input"
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Şifreyi tekrar gir"
                autoComplete="new-password"
              />
            </Field>

            {confirm.length > 0 && next !== confirm && (
              <p className="form-error">Şifreler eşleşmiyor</p>
            )}

            <label className="pw-show">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
              <span>Şifreyi göster</span>
            </label>

            {error && <p className="form-error">{error}</p>}

            <SaveButton busy={saving} disabled={!canSubmit || saving}>
              {isSet ? "Şifreyi Belirle" : "Şifreyi Değiştir"}
            </SaveButton>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ── Hesabı Sil (kalıcı) ── delete-account Edge Function'ını çağırır; auth.users
   silinince DB trigger'ı veda mailini gönderir. Mobil plan-detail.tsx ile aynı akış. */
function DeleteAccountSection() {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    const ok = await confirmDialog({
      title: "Hesabı Sil",
      message:
        "Hesabın, tüm profillerin ve verilerin (işlemler, hesaplar, faturalar, cüzdan) kalıcı olarak silinir. Bu işlem geri alınamaz.",
      confirmLabel: "Hesabı Sil",
      cancelLabel: "Vazgeç",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showToast({ title: "Oturum bulunamadı", message: "Tekrar giriş yapıp dene.", variant: "error" });
        setBusy(false);
        return;
      }
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
      const res = await fetch(`${url}/functions/v1/delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: anon,
        },
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          detail = body?.error || detail;
        } catch { /* gövde okunamadı */ }
        throw new Error(detail);
      }
      // Silindi → oturumu kapat ve "hesabın silindi" ekranına at
      try { sessionStorage.removeItem("login_reported"); } catch { /* yoksay */ }
      try { await supabase.auth.signOut({ scope: "local" }); } catch { /* önemsiz */ }
      window.location.href = "/giris?closed=1";
    } catch (e) {
      showToast({
        title: "Silinemedi",
        message: (e as Error)?.message || "İşlem tamamlanamadı, tekrar dene.",
        variant: "error",
      });
      setBusy(false);
    }
  }

  return (
    <div className="settings-block">
      <h3>Tehlike Bölgesi</h3>
      <div className="danger-zone">
        <div className="dz-info">
          <div className="dz-title">Hesabı Sil</div>
          <div className="dz-desc">
            Hesabın, tüm profillerin ve verilerin kalıcı olarak silinir. Bu işlem geri alınamaz.
          </div>
        </div>
        <button
          className="btn btn-sm dz-btn"
          onClick={deleteAccount}
          disabled={busy}
        >
          {busy ? "Siliniyor…" : "Hesabımı Kalıcı Olarak Sil"}
        </button>
      </div>
    </div>
  );
}

/* ── Giriş Yapılan Cihazlar (güvenlik) ── */
function DevicesSection({ devices }: { devices: DeviceRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [thisId, setThisId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    import("../../../lib/loginAlert").then((m) => setThisId(m.getWebDeviceId())).catch(() => {});
  }, []);

  const copyDeviceId = async () => {
    if (!thisId) return;
    try {
      await navigator.clipboard.writeText(thisId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // sessiz
    }
  };

  const hasOthers = devices.some((d) => d.device_id !== thisId);

  const fmt = (s?: string) => {
    if (!s) return "";
    try {
      return new Date(s).toLocaleString("tr-TR", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const signOutOthers = async () => {
    const ok = await confirmDialog({
      title: "Diğer Cihazlardan Çıkış",
      message: "Bu cihaz hariç tüm cihazlardan çıkış yapılacak. Tanımadığın bir giriş varsa bu işlem onu sonlandırır.",
      confirmLabel: "Çıkış Yap",
      cancelLabel: "Vazgeç",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await supabase.auth.signOut({ scope: "others" });
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id && thisId) {
        const { error: devErr } = await supabase.from("user_devices").delete().eq("user_id", user.id).neq("device_id", thisId);
        if (devErr) throw devErr; // yanlış "başarılı" mesajı gösterme → catch hata toast'ı basar
      }
      showToast({ title: "Çıkış yapıldı", message: "Diğer tüm cihazlardan çıkış yapıldı.", variant: "success" });
      router.refresh();
    } catch {
      showToast({ title: "Hata", message: "İşlem tamamlanamadı, tekrar dene.", variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-block">
      <h3>Giriş Yapılan Cihazlar</h3>
      {devices.length === 0 ? (
        <p className="panel-sub" style={{ marginTop: 4 }}>Henüz kayıtlı cihaz yok.</p>
      ) : (
        <div className="tx-list">
          {devices.map((d) => (
            <div key={d.id} className="info-row" style={{ alignItems: "flex-start" }}>
              <span className="k">
                {d.device_name || "Bilinmeyen cihaz"}
                {d.device_id === thisId ? " · Bu cihaz" : ""}
              </span>
              <span className="v" style={{ textAlign: "right", fontSize: 12, opacity: 0.85 }}>
                {d.last_city ? `${d.last_city} · ` : ""}{fmt(d.last_seen)}
              </span>
            </div>
          ))}
        </div>
      )}
      {hasOthers && (
        <button className="btn btn-sm" onClick={signOutOthers} disabled={busy} style={{ marginTop: 12, color: "#E24B4A" }}>
          {busy ? "…" : "Diğer Tüm Cihazlardan Çıkış Yap"}
        </button>
      )}

      {/* Güvenli cihaz kimliği — bu tarayıcının kimliği (destek/güvenlik için, kopyalanabilir) */}
      {thisId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            marginTop: 16,
            padding: "12px 16px",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="panel-sub" style={{ margin: 0 }}>Güvenli cihaz kimliği</div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                wordBreak: "break-all",
                marginTop: 4,
              }}
            >
              {thisId}
            </div>
          </div>
          <button className="btn btn-sm" onClick={copyDeviceId} style={{ flexShrink: 0 }}>
            {copied ? "Kopyalandı ✓" : "Kopyala"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Fatura Numaralama ── (mobil invoice-numbering.tsx ile aynı mantık) */
function InvoiceNumbering({
  profileId,
  initialPrefix,
  initialNext,
}: {
  profileId: string;
  initialPrefix: string;
  initialNext: number;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [prefix, setPrefix] = useState(initialPrefix);
  const [next, setNext] = useState<number>(initialNext);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = prefix !== initialPrefix || next !== initialNext;
  const preview = `${prefix || "MGZR"}-${String(next).padStart(6, "0")}`;

  function onPrefix(v: string) {
    setPrefix(v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5));
    setSaved(false);
  }
  function onNext(v: string) {
    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
    setNext(!isNaN(n) && n > 0 ? n : 1);
    setSaved(false);
  }

  async function save() {
    if (!prefix.trim() || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ invoice_prefix: prefix.trim(), invoice_next_number: next })
      .eq("id", profileId);
    setSaving(false);
    if (error) {
      showToast({ title: "Kaydedilemedi", message: "Fatura numaralama güncellenemedi, tekrar dene.", variant: "error" });
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="settings-block">
      <h3>Fatura Numaralama</h3>

      <div className="np-preview">
        <span className="np-preview-label">Sonraki fatura numarası</span>
        <span className="np-preview-num">{preview}</span>
      </div>

      <div className="set-field">
        <div className="sf-info">
          <label>Fatura Öneki</label>
          <span className="set-hint">Maksimum 5 karakter, sadece harf ve rakam</span>
        </div>
        <input
          className="set-input"
          value={prefix}
          onChange={(e) => onPrefix(e.target.value)}
          placeholder="MGZR"
        />
      </div>

      <div className="set-field">
        <div className="sf-info">
          <label>Sonraki Numara</label>
          <span className="set-hint">Her fatura oluşturulduğunda otomatik artar</span>
        </div>
        <input
          className="set-input"
          value={String(next)}
          onChange={(e) => onNext(e.target.value)}
          inputMode="numeric"
          placeholder="1"
        />
      </div>

      <div className="set-actions">
        <button
          className="btn btn-ghost btn-sm danger"
          onClick={() => {
            setNext(1);
            setSaved(false);
          }}
        >
          Numarayı Sıfırla
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={save}
          disabled={saving || !prefix.trim() || !dirty}
        >
          {saving ? "…" : saved ? "Kaydedildi ✓" : "Kaydet"}
        </button>
      </div>

      <p className="set-note">
        Fatura numarası &quot;ÖNEK-NUMARA&quot; formatındadır (örn. MGZR-000001).
        Yasal olarak numaralar sıralı ve benzersiz olmalıdır.
      </p>
    </div>
  );
}

/* ── Bildirim Tercihleri ── (profil bazlı, localStorage) */
type NotifPrefs = Record<string, boolean>;

const NOTIF_GENERAL: { key: string; label: string; desc: string }[] = [
  { key: "monthlySummary", label: "Aylık Özet", desc: "Her ay sonunda gelir-gider özetini al" },
  { key: "budgetAlert", label: "Bütçe Uyarıları", desc: "Kategori bütçesini aştığında uyar" },
  { key: "promo", label: "Kampanyalar", desc: "Yeni özellikler ve duyurulardan haberdar ol" },
];
const NOTIF_BUSINESS: { key: string; label: string; desc: string }[] = [
  { key: "invoiceDue", label: "Fatura Vadesi", desc: "Ödenmemiş faturaların vadesi yaklaşınca hatırlat" },
  { key: "recurringReminder", label: "Düzenli Ödemeler", desc: "Kira, abonelik, fatura ödeme günlerini hatırlat" },
];

function NotificationPrefs({
  profileId,
  isBusiness,
}: {
  profileId: string;
  isBusiness: boolean;
}) {
  const storageKey = `paraner_notif_${profileId}`;
  const items = isBusiness ? [...NOTIF_GENERAL, ...NOTIF_BUSINESS] : NOTIF_GENERAL;

  const [prefs, setPrefs] = useState<NotifPrefs>({});

  useEffect(() => {
    let stored: NotifPrefs = {};
    try {
      stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    } catch {
      stored = {};
    }
    // varsayılan: kampanya hariç açık
    const init: NotifPrefs = {};
    for (const it of items) {
      init[it.key] = stored[it.key] ?? it.key !== "promo";
    }
    setPrefs(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function toggle(key: string) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      /* fail-soft */
    }
  }

  return (
    <div className="settings-block">
      <h3>Bildirimler</h3>
      <div className="tx-list">
        {items.map((it) => (
          <div key={it.key} className="notif-row">
            <div className="notif-info">
              <div className="notif-label">{it.label}</div>
              <div className="notif-desc">{it.desc}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!prefs[it.key]}
              className={`switch${prefs[it.key] ? " on" : ""}`}
              onClick={() => toggle(it.key)}
            >
              <span className="switch-knob" />
            </button>
          </div>
        ))}
      </div>
      <p className="set-note">
        Tarayıcı bildirimleri yakında; şimdilik tercihlerin kaydediliyor.
        Mobil uygulamada bu bildirimler etkin.
      </p>
    </div>
  );
}


/* ══ Veri & Yedekleme ═══════════════════════════════════════════════════════
   Dışa aktarma: her modül ayrı CSV + tümü tek JSON yedek.
   İçe aktarma: CSV → müşteri/tedarikçi VEYA ürün (rakipten göç silahı — Defteran'da yok).
   Hepsi profil-bazlı (.eq user_id/profile_id); insert kolonları modüllerin kendi
   kullandığı kolonlarla birebir. */

type ExportDef = {
  key: string;
  label: string;
  desc: string;
  business?: boolean;
  run: (sb: ReturnType<typeof createClient>, profileId: string) => Promise<(string | number | null)[][]>;
};

const EXPORTS: ExportDef[] = [
  {
    key: "islemler",
    label: "İşlemler",
    desc: "Tüm gelir-gider kayıtları",
    run: async (sb, pid) => {
      const { data, error } = await sb
        .from("transactions")
        .select("date, type, title, category, amount, currency")
        .eq("user_id", pid)
        .order("date", { ascending: false });
      if (error) throw error;
      return [
        ["Tarih", "Tür", "Açıklama", "Kategori", "Tutar", "Para Birimi"],
        ...(data ?? []).map((t) => [
          t.date ?? "",
          t.type === "income" ? "Gelir" : "Gider",
          t.title ?? "",
          t.category ?? "",
          t.amount ?? 0,
          t.currency ?? "TRY",
        ]),
      ];
    },
  },
  {
    key: "faturalar",
    label: "Faturalar",
    desc: "Satış ve alış faturaları",
    business: true,
    run: async (sb, pid) => {
      const { data, error } = await sb
        .from("invoices")
        .select("invoice_number, invoice_date, type, customer_name, amount, currency, payment_status")
        .eq("user_id", pid)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return [
        ["Fatura No", "Tarih", "Tür", "Müşteri", "Tutar", "Para Birimi", "Durum"],
        ...(data ?? []).map((i) => [
          i.invoice_number ?? "",
          i.invoice_date ?? "",
          i.type === "income" ? "Satış" : "Alış",
          i.customer_name ?? "",
          i.amount ?? 0,
          i.currency ?? "TRY",
          i.payment_status === "paid" ? "Ödendi" : "Ödenmedi",
        ]),
      ];
    },
  },
  {
    key: "musteriler",
    label: "Müşteriler & Tedarikçiler",
    desc: "Cari kartları (vergi bilgileriyle)",
    business: true,
    run: async (sb, pid) => {
      const { data, error } = await sb
        .from("contacts")
        .select("type, name, company_name, phone, email, tax_number, tax_office, address, note")
        .eq("profile_id", pid)
        .order("name", { ascending: true });
      if (error) throw error;
      return [
        ["Tür", "Ad", "Firma", "Telefon", "E-posta", "Vergi No", "Vergi Dairesi", "Adres", "Not"],
        ...(data ?? []).map((c) => [
          c.type === "supplier" ? "Tedarikçi" : "Müşteri",
          c.name ?? "",
          c.company_name ?? "",
          c.phone ?? "",
          c.email ?? "",
          c.tax_number ?? "",
          c.tax_office ?? "",
          c.address ?? "",
          c.note ?? "",
        ]),
      ];
    },
  },
  {
    key: "urunler",
    label: "Ürün & Hizmetler",
    desc: "Ürün kataloğu ve stok",
    business: true,
    run: async (sb, pid) => {
      const { data, error } = await sb
        .from("products")
        .select("name, type, code, unit, buy_price, sell_price, vat_rate, stock_quantity, category")
        .eq("user_id", pid)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return [
        ["Ad", "Tür", "Kod", "Birim", "Alış Fiyatı", "Satış Fiyatı", "KDV %", "Stok", "Kategori"],
        ...(data ?? []).map((p) => [
          p.name ?? "",
          p.type === "service" ? "Hizmet" : "Ürün",
          p.code ?? "",
          p.unit ?? "",
          p.buy_price ?? 0,
          p.sell_price ?? 0,
          p.vat_rate ?? 0,
          p.stock_quantity ?? 0,
          p.category ?? "",
        ]),
      ];
    },
  },
];

function DataBackup({
  profileId,
  profileName,
  isBusiness,
}: {
  profileId: string;
  profileName: string | null;
  isBusiness: boolean;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const slug = (profileName ?? "paraner").replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const items = EXPORTS.filter((e) => isBusiness || !e.business);

  async function exportOne(def: ExportDef) {
    if (busy) return;
    setBusy(def.key);
    try {
      const rows = await def.run(supabase, profileId);
      if (rows.length <= 1) {
        showToast({ title: "Kayıt yok", message: `${def.label} için dışa aktarılacak veri bulunamadı.`, variant: "error" });
        return;
      }
      downloadCsv(`${slug}-${def.key}-${today}.csv`, toCsv(rows));
    } catch {
      showToast({ title: "Dışa aktarılamadı", message: `${def.label} indirilemedi, tekrar dene.`, variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  // Tam yedek: tüm modüller tek JSON. (İnsan okumak için değil, taşımak/arşivlemek için.)
  async function exportFullBackup() {
    if (busy) return;
    setBusy("full");
    try {
      const bundle: Record<string, unknown> = {
        exported_at: new Date().toISOString(),
        profile: profileName,
      };
      for (const def of items) {
        const rows = await def.run(supabase, profileId);
        const [header, ...body] = rows;
        bundle[def.key] = body.map((r) => Object.fromEntries((header as string[]).map((h, i) => [h, r[i]])));
      }
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-tam-yedek-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast({ title: "Yedek alınamadı", message: "Tam yedek oluşturulamadı, tekrar dene.", variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="settings-block">
        <h3>Dışa Aktarma</h3>
        <p className="set-lead">
          Verilerin her zaman senin. İstediğin an CSV olarak indir; Excel ve Google E-Tablolar ile açılır.
        </p>
        <div className="tx-list">
          {items.map((def) => (
            <div key={def.key} className="notif-row">
              <div className="notif-info">
                <div className="notif-label">{def.label}</div>
                <div className="notif-desc">{def.desc}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => exportOne(def)} disabled={!!busy}>
                {busy === def.key ? "Hazırlanıyor…" : "CSV indir"}
              </button>
            </div>
          ))}
          <div className="notif-row">
            <div className="notif-info">
              <div className="notif-label">Tam Yedek (JSON)</div>
              <div className="notif-desc">Tüm modüller tek dosyada — arşiv ve taşıma için</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={exportFullBackup} disabled={!!busy}>
              {busy === "full" ? "Hazırlanıyor…" : "Yedek al"}
            </button>
          </div>
        </div>
      </div>

      {isBusiness && <CsvImport profileId={profileId} />}
    </>
  );
}

/* ── CSV İçe Aktarma ── başka programdan (Paraşüt/Defteran/Excel) göç.
   İki hedef: müşteri/tedarikçi (contacts) veya ürün (products). Kullanıcı CSV yükler,
   sütunları EŞLER (otomatik tahmin + elle düzelt), önizler, sonra toplu insert. */
type ImportKind = "contacts" | "products";

const IMPORT_SCHEMAS: Record<ImportKind, { label: string; fields: { key: string; label: string; required?: boolean }[] }> = {
  contacts: {
    label: "Müşteri / Tedarikçi",
    fields: [
      { key: "name", label: "Ad", required: true },
      { key: "company_name", label: "Firma" },
      { key: "phone", label: "Telefon" },
      { key: "email", label: "E-posta" },
      { key: "tax_number", label: "Vergi No" },
      { key: "tax_office", label: "Vergi Dairesi" },
      { key: "address", label: "Adres" },
      { key: "note", label: "Not" },
    ],
  },
  products: {
    label: "Ürün / Hizmet",
    fields: [
      { key: "name", label: "Ad", required: true },
      { key: "code", label: "Kod" },
      { key: "unit", label: "Birim" },
      { key: "buy_price", label: "Alış Fiyatı" },
      { key: "sell_price", label: "Satış Fiyatı" },
      { key: "vat_rate", label: "KDV %" },
      { key: "stock_quantity", label: "Stok" },
      { key: "category", label: "Kategori" },
    ],
  },
};

// Başlık adından hedef alanı tahmin et (TR eş anlamlılar)
const HEADER_HINTS: Record<string, string> = {
  ad: "name", isim: "name", "ad soyad": "name", "müşteri": "name", "unvan": "company_name",
  firma: "company_name", "şirket": "company_name", telefon: "phone", tel: "phone", gsm: "phone",
  "e-posta": "email", eposta: "email", mail: "email", "email": "email",
  "vergi no": "tax_number", vkn: "tax_number", tckn: "tax_number", "vergi dairesi": "tax_office",
  adres: "address", not: "note", "açıklama": "note",
  kod: "code", "stok kodu": "code", birim: "unit", "alış": "buy_price", "alış fiyatı": "buy_price",
  "satış": "sell_price", "satış fiyatı": "sell_price", fiyat: "sell_price", kdv: "vat_rate",
  "kdv %": "vat_rate", "kdv oranı": "vat_rate", stok: "stock_quantity", miktar: "stock_quantity",
  kategori: "category",
};

const NUMERIC_FIELDS = new Set(["buy_price", "sell_price", "vat_rate", "stock_quantity"]);

function CsvImport({ profileId }: { profileId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const lock = useSubmitLock();

  const [kind, setKind] = useState<ImportKind>("contacts");
  const [rows, setRows] = useState<string[][] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<Record<string, number>>({}); // alan → sütun index
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const schema = IMPORT_SCHEMAS[kind];

  function onFile(file: File | undefined) {
    if (!file) return;
    setDone(null);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""));
      if (parsed.length < 2) {
        showToast({ title: "Boş dosya", message: "CSV'de başlık + en az bir satır olmalı.", variant: "error" });
        return;
      }
      const [head, ...body] = parsed;
      setHeaders(head);
      setRows(body);
      // Otomatik eşleme: başlık ipuçlarından
      const auto: Record<string, number> = {};
      head.forEach((h, i) => {
        const target = HEADER_HINTS[h.toLowerCase().trim()];
        if (target && schema.fields.some((f) => f.key === target) && auto[target] === undefined) auto[target] = i;
      });
      setMap(auto);
    };
    reader.readAsText(file, "UTF-8");
  }

  function switchKind(k: ImportKind) {
    setKind(k);
    setMap({}); // şema değişti → eşlemeyi sıfırla
    setDone(null);
    if (rows) {
      const auto: Record<string, number> = {};
      headers.forEach((h, i) => {
        const target = HEADER_HINTS[h.toLowerCase().trim()];
        if (target && IMPORT_SCHEMAS[k].fields.some((f) => f.key === target) && auto[target] === undefined) auto[target] = i;
      });
      setMap(auto);
    }
  }

  const nameMapped = map["name"] !== undefined;

  async function runImport() {
    if (!rows || !nameMapped || importing || !lock.acquire()) return;
    setImporting(true);
    try {
      const payload = rows
        .map((r) => {
          const obj: Record<string, unknown> = kind === "contacts" ? { type: "customer" } : { is_active: true };
          for (const f of schema.fields) {
            const idx = map[f.key];
            if (idx === undefined) continue;
            let val: string | number | null = (r[idx] ?? "").trim() || null;
            if (val !== null && NUMERIC_FIELDS.has(f.key)) {
              const n = parseAmount(String(val));
              val = isNaN(n) ? 0 : n;
            }
            obj[f.key] = val;
          }
          obj[kind === "contacts" ? "profile_id" : "user_id"] = profileId;
          return obj;
        })
        .filter((o) => (o.name as string | null)?.toString().trim()); // adsız satırı atla

      if (!payload.length) {
        showToast({ title: "Geçerli satır yok", message: "Ad sütunu boş olmayan satır bulunamadı.", variant: "error" });
        setImporting(false);
        lock.release();
        return;
      }

      const { error } = await supabase.from(kind === "contacts" ? "contacts" : "products").insert(payload);
      if (error) throw error;

      setDone(`${payload.length} kayıt içe aktarıldı.`);
      setRows(null);
      setHeaders([]);
      setMap({});
      showToast({ title: "İçe aktarıldı", message: `${payload.length} ${schema.label} kaydı eklendi.`, variant: "success" });
      router.refresh();
    } catch {
      showToast({ title: "İçe aktarılamadı", message: "Kayıtlar eklenemedi, CSV'yi kontrol edip tekrar dene.", variant: "error" });
    } finally {
      setImporting(false);
      lock.release();
    }
  }

  return (
    <div className="settings-block">
      <h3>İçe Aktarma</h3>
      <p className="set-lead">
        Başka bir programdan (Excel, Paraşüt, Defteran…) müşteri veya ürün listeni CSV olarak buraya taşı.
      </p>

      <div className="set-subtabs" role="tablist">
        {(Object.keys(IMPORT_SCHEMAS) as ImportKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            className={`set-subtab${kind === k ? " active" : ""}`}
            onClick={() => switchKind(k)}
          >
            {IMPORT_SCHEMAS[k].label}
          </button>
        ))}
      </div>

      {!rows ? (
        <label className="logo-drop" style={{ cursor: "pointer", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>CSV dosyası seç</div>
            <div className="fg-hint" style={{ marginTop: 4 }}>İlk satır başlık olmalı · UTF-8</div>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <>
          <p className="set-note" style={{ marginTop: 0 }}>
            {rows.length} satır bulundu. Sütunları eşle (Ad zorunlu):
          </p>
          <div className="map-grid">
            {schema.fields.map((f) => (
              <div key={f.key} className="fg">
                <label>
                  {f.label}
                  {f.required && <span style={{ color: "var(--danger)" }}> *</span>}
                </label>
                <select
                  className="set-input"
                  value={map[f.key] ?? ""}
                  onChange={(e) =>
                    setMap((p) => {
                      const v = e.target.value;
                      const n = { ...p };
                      if (v === "") delete n[f.key];
                      else n[f.key] = Number(v);
                      return n;
                    })
                  }
                >
                  <option value="">— eşleşme yok —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Sütun ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {nameMapped && (
            <div className="import-preview">
              <div className="fg-hint" style={{ marginBottom: 6 }}>Önizleme (ilk 3 satır):</div>
              {rows.slice(0, 3).map((r, ri) => (
                <div key={ri} className="import-preview-row">
                  {schema.fields
                    .filter((f) => map[f.key] !== undefined)
                    .map((f) => (
                      <span key={f.key}>
                        <b>{f.label}:</b> {r[map[f.key]] || "—"}
                      </span>
                    ))}
                </div>
              ))}
            </div>
          )}

          {done && <p className="form-success">{done}</p>}

          <div className="fg-actions" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setRows(null);
                setHeaders([]);
                setMap({});
                setDone(null);
              }}
              disabled={importing}
            >
              Vazgeç
            </button>
            {/* CsvImport bir <form> DEĞİL (dinamik alan eşleme UI'ı) → SaveButton'ın varsayılan
                type="submit"'i hiçbir şey tetiklemez; type="button" + onClick şart. */}
            <SaveButton type="button" onClick={runImport} busy={importing} disabled={!nameMapped || importing}>
              {`${rows.length} Kaydı İçe Aktar`}
            </SaveButton>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Fatura Tasarımı (Yakında) ── PDF/çıktı motoru + şema (kaşe/yazı tipi) gerektirir.
   Önce fatura kalem editörü + PDF çıktısı gelmeli; tasarlanacak belge yokken ayar boşta kalır. */
function InvoiceDesignSoon() {
  return (
    <div className="settings-block">
      <h3>Fatura Tasarımı</h3>
      <div className="soon-card">
        <div className="soon-badge">Yakında</div>
        <p>
          Faturalarını artık <b>Faturalar</b> ekranından yazdırabilir ya da PDF olarak
          kaydedebilirsin (şirket bilgilerin ve logon çıktıda görünür). Yakında: kaşe/imza,
          yazı tipi ve renk seçimiyle özelleştirme.
        </p>
      </div>
    </div>
  );
}

/* ── Roller (Yakında) ── çok-kullanıcılı yetkilendirme, şema gerektirir */
function RolesSoon() {
  return (
    <div className="settings-block">
      <h3>Roller &amp; Ekip Erişimi</h3>
      <div className="soon-card">
        <div className="soon-badge">Yakında</div>
        <p>
          Muhasebecini veya ekip arkadaşlarını işletmene davet et; her birine
          görüntüleme, düzenleme veya tam yetki ver. Bu özellik üzerinde
          çalışıyoruz.
        </p>
      </div>
    </div>
  );
}
