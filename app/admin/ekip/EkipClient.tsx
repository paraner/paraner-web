"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Pencil,
  Trash2,
  ShieldCheck,
  LifeBuoy,
  AlertTriangle,
  MailCheck,
  Clock,
  Check,
  X,
} from "lucide-react";
import { showToast } from "../../components/toast";
import { confirmDialog } from "../../components/confirm";
import { formatDate, formatDayMonth } from "../../../lib/format";
import {
  inviteStaff,
  grantRole,
  updateStaff,
  removeFromTeam,
  resendInvite,
  type ActionResult,
} from "../../../lib/adminActions";
import { DEPARTMENTS, departmentLabel } from "../../../lib/supportShared";

export type StaffMember = {
  id: string;
  email: string;
  roles: ("admin" | "agent")[];
  since: string;
  departments: string[];
  pending: boolean;
  /** Hiç giriş yapmadıysa null → davet hâlâ bekliyor demektir. */
  lastSignIn: string | null;
};

const ROLE_LABEL = { admin: "Yönetici", agent: "Destek" } as const;

/* Rol seçimi dropdown DEĞİL kart: iki rolün yetkisi ciddi biçimde farklı (yönetici müşteri
   verisi + silme yetkisi alıyor). Açılır listede tek kelime görüp yanlış rol vermek kolaydı;
   kartta ne verdiğin YAZILI duruyor. */
const ROLES = [
  {
    id: "agent" as const,
    label: "Destek",
    icon: LifeBuoy,
    desc: "Yalnız atandığı departmanların destek taleplerini görür ve yanıtlar.",
  },
  {
    id: "admin" as const,
    label: "Yönetici",
    icon: ShieldCheck,
    desc: "Müşteri yönetimi, abonelikler, ekip ve tüm destek — seninle aynı yetki.",
  },
];

/* Departman seçici — davet formunda ve satır düzenlemede AYNI bileşen.
   Tek kaynak DEPARTMENTS (lib/supportShared) — burada liste ELLE yazılmaz. */
function DepartmanSecici({
  secili,
  onChange,
  disabled,
}: {
  secili: string[];
  onChange: (d: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="admin-dep-picker">
      {DEPARTMENTS.map((d) => {
        const on = secili.includes(d.id);
        return (
          <button
            key={d.id}
            type="button"
            disabled={disabled}
            title={d.ipucu}
            aria-pressed={on}
            className={`admin-dep-chip${on ? " on" : ""}`}
            onClick={() => onChange(on ? secili.filter((x) => x !== d.id) : [...secili, d.id])}
          >
            {on && <Check size={12} strokeWidth={3} />}
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

export default function EkipClient({
  staff,
  selfEmail,
}: {
  staff: StaffMember[];
  selfEmail: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [deps, setDeps] = useState<string[]>(["teknik"]);
  const [busy, setBusy] = useState<string | null>(null);
  /* Satır tıklanınca sağda detay çekmecesi açılır (İşlemler deseni, Mehmet 2026-07-19).
     Düzenleme artık satır içinde DEĞİL çekmecede — tek yerde, daha geniş, bağlamıyla birlikte. */
  const [secili, setSecili] = useState<StaffMember | null>(null);
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [taslakDeps, setTaslakDeps] = useState<string[]>([]);
  const [taslakRol, setTaslakRol] = useState<"admin" | "agent">("agent");

  const yoneticiSayisi = staff.filter((m) => m.roles.includes("admin")).length;
  const destekSayisi = staff.filter((m) => m.roles.includes("agent") && !m.roles.includes("admin")).length;
  const bekleyen = staff.filter((m) => m.pending).length;
  const depGerekli = role === "agent" && deps.length === 0;

  async function run(key: string, fn: () => Promise<ActionResult>, temizle = false) {
    if (busy) return;
    setBusy(key);
    const res = await fn();
    setBusy(null);
    showToast({
      title: res.ok ? "Tamam" : "Olmadı",
      message: res.message,
      variant: res.ok ? "success" : "error",
    });
    if (res.ok) {
      if (temizle) setEmail("");
      setDuzenleModu(false);
      setSecili(null);
      router.refresh(); // panel hızı kuralı 1: her mutasyondan sonra
    }
  }

  const secYonetici = secili?.roles.includes("admin") ?? false;

  return (
    /* tx-area: çekmece açıkken içerik sola kayar (drawer'ın altına girmez) — İşlemler deseni */
    <div className={`tx-area${secili ? " shifted" : ""}`}>
      <h1 className="admin-h1">Ekip</h1>
      <p className="admin-sub">
        Paraner&apos;i yöneten iç ekip. <b>Yönetici</b> her şeyi görür ve müşteri yönetir;{" "}
        <b>Destek</b> yalnız <b>atandığı departmanların</b> taleplerini görür.
      </p>

      {/* --- Ekle / davet --- */}
      <div className="admin-panel">
        <div className="admin-panel-head">
          <UserPlus size={16} /> Ekibe kişi ekle
        </div>

        <div className="admin-invite-grid">
          <div className="admin-invite-field">
            <label className="admin-field-label" htmlFor="ekip-mail">
              E-posta adresi
            </label>
            <input
              id="ekip-mail"
              className="adm-login-input"
              style={{ margin: 0, width: "100%" }}
              type="email"
              placeholder="personel@paraner.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Rol: iki kart yerine AÇILIR LİSTE (Mehmet, 2026-07-19) — kartlar e-posta
              alanıyla aynı hizada durmuyordu, üst blok dağınık görünüyordu. Seçilen rolün
              ne yapabildiği listenin ALTINDA yazıyor → bilgi kaybolmuyor, hizalama düzeliyor. */}
          <div className="admin-invite-field">
            <label className="admin-field-label" htmlFor="ekip-rol">
              Rolü
            </label>
            <select
              id="ekip-rol"
              className="adm-login-input"
              style={{ margin: 0, width: "100%" }}
              value={role}
              disabled={busy != null}
              onChange={(e) => setRole(e.target.value as "admin" | "agent")}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="admin-note" style={{ marginTop: 7 }}>
              {ROLES.find((r) => r.id === role)?.desc}
            </p>
          </div>
        </div>

        {/* Departman yalnız Destek rolünde sorulur — yönetici zaten hepsini görür. */}
        {role === "agent" ? (
          <div className="admin-invite-field" style={{ marginTop: 16 }}>
            <span className="admin-field-label">
              Hangi departmanlara baksın? <span className="admin-req">gerekli</span>
            </span>
            <DepartmanSecici secili={deps} onChange={setDeps} disabled={busy != null} />
            {depGerekli && (
              <p className="admin-warn-inline">
                <AlertTriangle size={12} /> En az bir departman seç — departmansız kişi hiçbir talep göremez.
              </p>
            )}
          </div>
        ) : (
          <p className="admin-note" style={{ marginTop: 16 }}>
            Yönetici tüm departmanları ve müşteri yönetimini görür — departman seçimi gerekmez.
          </p>
        )}

        <div className="admin-invite-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!email.trim() || busy != null || depGerekli}
            onClick={() => run("invite", () => inviteStaff(email, role, deps), true)}
          >
            {busy === "invite" ? "Gönderiliyor…" : "Davet et"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!email.trim() || busy != null || depGerekli}
            onClick={() => run("grant", () => grantRole(email, role, deps), true)}
          >
            {busy === "grant" ? "…" : "Rol ver"}
          </button>
          {/* ⚠️ Metni tek <p> içinde <br/> ile bölme: JSX satır başı/sonu boşluklarını
              kırpıyor ve "Rol ver— Paraner" gibi bitişik çıkıyordu. Her satır ayrı düğüm. */}
          <div className="admin-note" style={{ flex: 1, minWidth: 240 }}>
            <div>
              <b>Davet et:</b>{" "}
              <span>hiç hesabı yoksa — şifre oluşturma maili gider.</span>
            </div>
            <div>
              <b>Rol ver:</b>{" "}
              <span>Paraner&apos;e zaten kayıtlıysa — mail gitmez, rol hemen tanımlanır.</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Mevcut ekip --- */}
      <div className="admin-panel" style={{ marginTop: 16, padding: 0 }}>
        <div className="admin-panel-head" style={{ padding: "18px 20px 12px", marginBottom: 0 }}>
          Ekip ({staff.length})
          <span className="admin-note" style={{ marginLeft: 8, fontWeight: 400 }}>
            {yoneticiSayisi} yönetici · {destekSayisi} destek
            {bekleyen > 0 && ` · ${bekleyen} davet bekliyor`}
          </span>
        </div>

        {staff.length === 0 ? (
          <p className="admin-note" style={{ padding: "0 20px 20px" }}>Henüz kimse yok.</p>
        ) : (
          <div className="staff-list">
            {staff.map((m) => {
              const yonetici = m.roles.includes("admin");
              const destekci = m.roles.includes("agent");
              // Yönetici zaten her şeyi görür → departmansızlık ONUN için sorun değil.
              const departmansiz = !yonetici && destekci && m.departments.length === 0;
              const kendisi = m.email === selfEmail;

              return (
                <div
                  key={m.id}
                  className={`tx-row tx-row-click staff-row${secili?.id === m.id ? " on" : ""}`}
                  onClick={() => {
                    setSecili(m);
                    setDuzenleModu(false);
                  }}
                >
                  <div className="tx-main">
                    <span className="staff-avatar" aria-hidden="true">
                      {m.email.charAt(0).toLocaleUpperCase("tr")}
                    </span>
                    <div className="tx-left">
                      <span className="tx-title staff-title">
                        {m.email}
                        {m.pending && (
                          <span className="badge gray">
                            <Clock size={11} /> Davet bekliyor
                          </span>
                        )}
                      </span>
                      <span className="tx-meta staff-meta">
                        <span className={`badge ${yonetici ? "green" : "blue"}`}>
                          {yonetici ? <ShieldCheck size={11} /> : <LifeBuoy size={11} />}{" "}
                          {yonetici ? ROLE_LABEL.admin : ROLE_LABEL.agent}
                        </span>
                        {yonetici ? (
                          <span className="admin-note">Tüm departmanlar</span>
                        ) : departmansiz ? (
                          <span className="admin-warn-inline" style={{ margin: 0 }}>
                            <AlertTriangle size={12} /> Departman atanmamış — hiçbir talep göremiyor
                          </span>
                        ) : (
                          m.departments.map((d) => (
                            <span key={d} className="admin-dep-tag">
                              {departmentLabel(d)}
                            </span>
                          ))
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="tx-right">
                    <span className="tx-amount staff-date">{formatDate(m.since)}</span>
                    {/* Hızlı aksiyonlar — satır tıklaması çekmeceyi açar, bunlar doğrudan iş yapar.
                        stopPropagation: butona basınca çekmece de açılmasın. */}
                    <div className="tx-actions">
                      <button
                        type="button"
                        className="anim-act edit"
                        aria-label={`${m.email} kaydını düzenle`}
                        disabled={busy != null}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSecili(m);
                          setTaslakRol(yonetici ? "admin" : "agent");
                          setTaslakDeps(m.departments);
                          setDuzenleModu(true);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      {/* Kendi satırında "Ekipten çıkar" YOK — kilitlenmeyi UI'da da engelle. */}
                      {!kendisi && (
                        <button
                          type="button"
                          className="anim-act del"
                          aria-label={`${m.email} kişisini ekipten çıkar`}
                          disabled={busy != null}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirmDialog({
                              title: "Ekipten çıkar",
                              message: `${m.email} ekipten çıkarılacak: rolleri ve departmanları kaldırılır, yönetim paneline giremez. Hesabı SİLİNMEZ. Onaylıyor musun?`,
                              confirmLabel: "Ekipten çıkar",
                              danger: true,
                            });
                            if (ok) run(`rm-${m.id}`, () => removeFromTeam(m.id, m.email));
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Detay çekmecesi (İşlemler deseni) --- */}
      {secili && (
        <aside className="tx-drawer">
          <div className="drawer-head">
            <span className="drawer-title">Ekip Üyesi</span>
            <button
              type="button"
              className="anim-act cls"
              aria-label="Kapat"
              onClick={() => {
                setSecili(null);
                setDuzenleModu(false);
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="staff-dw-id">
            <span className="staff-avatar staff-avatar-lg" aria-hidden="true">
              {secili.email.charAt(0).toLocaleUpperCase("tr")}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="staff-dw-mail">{secili.email}</div>
              <span className={`badge ${secYonetici ? "green" : "blue"}`}>
                {secYonetici ? <ShieldCheck size={11} /> : <LifeBuoy size={11} />}{" "}
                {secYonetici ? ROLE_LABEL.admin : ROLE_LABEL.agent}
              </span>
            </div>
          </div>

          {duzenleModu ? (
            <>
              <div>
                <span className="admin-field-label">Rolü</span>
                <div className="admin-role-pick admin-role-pick-sm">
                  {ROLES.map((rr) => {
                    const Icon = rr.icon;
                    return (
                      <button
                        key={rr.id}
                        type="button"
                        aria-pressed={taslakRol === rr.id}
                        disabled={busy != null}
                        className={`admin-role-card${taslakRol === rr.id ? " on" : ""}`}
                        onClick={() => setTaslakRol(rr.id)}
                      >
                        <span className="admin-role-card-top">
                          <Icon size={13} /> {rr.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                {taslakRol === "admin" ? (
                  <p className="admin-note">Yönetici tüm departmanları görür — seçim gerekmez.</p>
                ) : (
                  <>
                    <span className="admin-field-label">Departmanlar</span>
                    <DepartmanSecici
                      secili={taslakDeps}
                      onChange={setTaslakDeps}
                      disabled={busy != null}
                    />
                    {taslakDeps.length === 0 && (
                      <p className="admin-warn-inline">
                        <AlertTriangle size={12} /> En az bir departman seç.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="drawer-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy != null}
                  onClick={() => setDuzenleModu(false)}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy != null || (taslakRol === "agent" && taslakDeps.length === 0)}
                  onClick={() =>
                    run(`save-${secili.id}`, () =>
                      updateStaff(secili.id, secili.email, taslakRol, taslakDeps),
                    )
                  }
                >
                  {busy === `save-${secili.id}` ? "…" : "Kaydet"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="drawer-rows">
                <div className="drawer-row">
                  <span className="dr-k">Yetki</span>
                  <span className="dr-v">
                    {secYonetici ? "Tam yetki (müşteri + ekip)" : "Yalnız destek talepleri"}
                  </span>
                </div>
                <div className="drawer-row col">
                  <span className="dr-k">Departmanlar</span>
                  <span className="dr-v note">
                    {secYonetici ? (
                      "Tümü — yönetici her departmanı görür."
                    ) : secili.departments.length === 0 ? (
                      <span className="admin-warn-inline" style={{ margin: 0 }}>
                        <AlertTriangle size={12} /> Atanmamış — hiçbir talep göremiyor
                      </span>
                    ) : (
                      <span className="admin-dep-tags">
                        {secili.departments.map((d) => (
                          <span key={d} className="admin-dep-tag">
                            {departmentLabel(d)}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Ekibe katıldı</span>
                  <span className="dr-v">{formatDate(secili.since)}</span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Son giriş</span>
                  <span className="dr-v">
                    {secili.lastSignIn ? formatDayMonth(secili.lastSignIn) : "Hiç girmedi"}
                  </span>
                </div>
                <div className="drawer-row">
                  <span className="dr-k">Durum</span>
                  <span className="dr-v">
                    {secili.pending ? (
                      <>
                        <Clock size={13} /> Davet bekliyor
                      </>
                    ) : (
                      <>
                        <Check size={13} /> Aktif
                      </>
                    )}
                  </span>
                </div>
              </div>

              {secili.pending && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy != null}
                  onClick={() => run(`resend-${secili.id}`, () => resendInvite(secili.email))}
                >
                  <MailCheck size={14} />{" "}
                  {busy === `resend-${secili.id}` ? "Gönderiliyor…" : "Daveti yenile"}
                </button>
              )}

              <div className="drawer-actions">
                <button
                  type="button"
                  className="anim-act edit"
                  aria-label="Düzenle"
                  disabled={busy != null}
                  onClick={() => {
                    setTaslakRol(secYonetici ? "admin" : "agent");
                    setTaslakDeps(secili.departments);
                    setDuzenleModu(true);
                  }}
                >
                  <Pencil size={16} />
                </button>
                {secili.email !== selfEmail && (
                  <button
                    type="button"
                    className="anim-act del"
                    aria-label="Ekipten çıkar"
                    disabled={busy != null}
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: "Ekipten çıkar",
                        message: `${secili.email} ekipten çıkarılacak: rolleri ve departmanları kaldırılır, yönetim paneline giremez. Hesabı SİLİNMEZ. Onaylıyor musun?`,
                        confirmLabel: "Ekipten çıkar",
                        danger: true,
                      });
                      if (ok) run(`rm-${secili.id}`, () => removeFromTeam(secili.id, secili.email));
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
