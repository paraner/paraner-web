"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  X,
  ShieldCheck,
  LifeBuoy,
  AlertTriangle,
  MailCheck,
  Clock,
  Check,
} from "lucide-react";
import { showToast } from "../../components/toast";
import { confirmDialog } from "../../components/confirm";
import { formatDate } from "../../../lib/format";
import {
  inviteStaff,
  grantRole,
  revokeRole,
  setStaffDepartments,
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

export default function EkipClient({ staff }: { staff: StaffMember[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [deps, setDeps] = useState<string[]>(["teknik"]);
  const [busy, setBusy] = useState<string | null>(null);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [taslakDeps, setTaslakDeps] = useState<string[]>([]);

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
      setDuzenlenen(null);
      router.refresh(); // panel hızı kuralı 1: her mutasyondan sonra
    }
  }

  return (
    <div>
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

          <div className="admin-invite-field">
            <span className="admin-field-label">Rolü</span>
            <div className="admin-role-pick">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const on = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={on}
                    disabled={busy != null}
                    className={`admin-role-card${on ? " on" : ""}`}
                    onClick={() => setRole(r.id)}
                  >
                    <span className="admin-role-card-top">
                      <Icon size={14} /> {r.label}
                    </span>
                    <span className="admin-role-card-desc">{r.desc}</span>
                  </button>
                );
              })}
            </div>
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
          <div className="admin-table-wrap" style={{ border: 0, borderRadius: 0, background: "none" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kişi</th>
                  <th>Rol</th>
                  <th>Departmanlar</th>
                  <th>Katıldı</th>
                  <th aria-label="İşlemler" />
                </tr>
              </thead>
              <tbody>
                {staff.map((m) => {
                  const yonetici = m.roles.includes("admin");
                  const destekci = m.roles.includes("agent");
                  // Yönetici zaten her şeyi görür → departmansızlık ONUN için sorun değil.
                  const departmansiz = !yonetici && destekci && m.departments.length === 0;
                  const duzenle = duzenlenen === m.id;

                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="admin-staff-email">{m.email}</div>
                        {m.pending && (
                          <span className="badge gray" style={{ marginTop: 5 }}>
                            <Clock size={11} /> Davet bekliyor
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="admin-badge-row">
                          {m.roles.map((r) => (
                            <span key={r} className={`badge ${r === "admin" ? "green" : "blue"}`}>
                              {r === "admin" ? <ShieldCheck size={11} /> : <LifeBuoy size={11} />}{" "}
                              {ROLE_LABEL[r]}
                              <button
                                type="button"
                                className="admin-role-x"
                                aria-label={`${ROLE_LABEL[r]} rolünü kaldır`}
                                disabled={busy != null}
                                onClick={async () => {
                                  const ok = await confirmDialog({
                                    title: "Rolü kaldır",
                                    message: `${m.email} → ${ROLE_LABEL[r]} rolü kaldırılacak. Onaylıyor musun?`,
                                    confirmLabel: "Kaldır",
                                    danger: true,
                                  });
                                  if (ok) run(`revoke-${m.id}-${r}`, () => revokeRole(m.id, r, m.email));
                                }}
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </span>
                      </td>

                      <td>
                        {yonetici ? (
                          <span className="admin-note">Tümü (yönetici)</span>
                        ) : !destekci ? (
                          <span className="admin-note">—</span>
                        ) : duzenle ? (
                          <>
                            <DepartmanSecici
                              secili={taslakDeps}
                              onChange={setTaslakDeps}
                              disabled={busy != null}
                            />
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={busy != null}
                                onClick={() =>
                                  run(`dep-${m.id}`, () => setStaffDepartments(m.id, m.email, taslakDeps))
                                }
                              >
                                {busy === `dep-${m.id}` ? "…" : "Kaydet"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                disabled={busy != null}
                                onClick={() => setDuzenlenen(null)}
                              >
                                Vazgeç
                              </button>
                            </div>
                          </>
                        ) : departmansiz ? (
                          <span className="admin-warn-inline" style={{ margin: 0 }}>
                            <AlertTriangle size={12} /> Atanmamış — hiçbir talep göremiyor
                          </span>
                        ) : (
                          <span className="admin-dep-tags">
                            {m.departments.map((d) => (
                              <span key={d} className="admin-dep-tag">
                                {departmentLabel(d)}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>

                      <td className="admin-note" style={{ whiteSpace: "nowrap" }}>
                        {formatDate(m.since)}
                      </td>

                      <td>
                        <div className="admin-row-actions">
                          {destekci && !yonetici && !duzenle && (
                            <button
                              type="button"
                              className="admin-dep-edit"
                              disabled={busy != null}
                              onClick={() => {
                                setTaslakDeps(m.departments);
                                setDuzenlenen(m.id);
                              }}
                            >
                              Departman değiştir
                            </button>
                          )}
                          {m.pending && (
                            <button
                              type="button"
                              className="admin-dep-edit"
                              disabled={busy != null}
                              title="Şifre oluşturma mailini yeniden gönder"
                              onClick={() => run(`resend-${m.id}`, () => resendInvite(m.email))}
                            >
                              <MailCheck size={12} />{" "}
                              {busy === `resend-${m.id}` ? "…" : "Daveti yenile"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
