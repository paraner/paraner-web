"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, ShieldCheck, LifeBuoy, AlertTriangle, MailCheck, Clock } from "lucide-react";
import { showToast } from "../../components/toast";
import { confirmDialog } from "../../components/confirm";
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
        Destek personeli ve yöneticiler. <b>Yönetici</b> her şeyi görür ve müşteri yönetir;{" "}
        <b>Destek</b> yalnız <b>atandığı departmanların</b> taleplerini görür.
      </p>

      {/* --- Ekle / davet --- */}
      <div className="admin-panel" style={{ maxWidth: 760 }}>
        <div className="admin-panel-head">
          <UserPlus size={16} /> Ekibe kişi ekle
        </div>
        <div className="admin-invite-row">
          <input
            className="adm-login-input"
            style={{ margin: 0, flex: 1, minWidth: 200 }}
            type="email"
            placeholder="personel@paraner.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="adm-login-input"
            style={{ margin: 0, width: 130 }}
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "agent")}
          >
            <option value="agent">Destek</option>
            <option value="admin">Yönetici</option>
          </select>
        </div>

        {/* Departman yalnız Destek rolünde sorulur — yönetici zaten hepsini görür. */}
        {role === "agent" ? (
          <div style={{ marginTop: 12 }}>
            <div className="admin-field-label">Hangi departmanlara baksın?</div>
            <DepartmanSecici secili={deps} onChange={setDeps} disabled={busy != null} />
            {deps.length === 0 && (
              <p className="admin-warn-inline">
                <AlertTriangle size={12} /> En az bir departman seç — departmansız kişi hiçbir talep göremez.
              </p>
            )}
          </div>
        ) : (
          <p className="admin-td-dim" style={{ fontSize: 12, margin: "12px 0 0" }}>
            Yönetici tüm departmanları ve müşteri yönetimini görür — departman seçimi gerekmez.
          </p>
        )}

        <div className="admin-invite-row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!email.trim() || busy != null || (role === "agent" && deps.length === 0)}
            onClick={() => run("grant", () => grantRole(email, role, deps), true)}
          >
            {busy === "grant" ? "…" : "Rol ver"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!email.trim() || busy != null || (role === "agent" && deps.length === 0)}
            onClick={() => run("invite", () => inviteStaff(email, role, deps), true)}
          >
            {busy === "invite" ? "…" : "Davet et"}
          </button>
        </div>
        <p className="admin-td-dim" style={{ fontSize: 12, margin: "10px 0 0", lineHeight: 1.6 }}>
          <b>Rol ver:</b> kişi Paraner&apos;e zaten kayıtlıysa. <b>Davet et:</b> hiç hesabı yoksa —
          kurulum maili gider, şifresini kendisi belirler, sonra admin.paraner.com&apos;a girer.
        </p>
      </div>

      {/* --- Mevcut ekip --- */}
      <div className="admin-panel" style={{ marginTop: 16 }}>
        <div className="admin-panel-head">Ekip ({staff.length})</div>
        {staff.length === 0 ? (
          <p className="admin-td-dim" style={{ fontSize: 13 }}>Henüz kimse yok.</p>
        ) : (
          <div className="admin-staff-list">
            {staff.map((m) => {
              const yonetici = m.roles.includes("admin");
              // Yönetici zaten her şeyi görür → departmansızlık onun için sorun DEĞİL.
              const departmansiz = !yonetici && m.roles.includes("agent") && m.departments.length === 0;
              return (
                <div key={m.id} className="admin-staff-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span className="admin-staff-email">{m.email}</span>
                    {m.pending && (
                      <span className="badge gray" style={{ marginLeft: 8 }}>
                        <Clock size={11} /> Davet bekliyor
                      </span>
                    )}

                    {/* Departman satırı — yalnız destekçide anlamlı */}
                    {!yonetici && m.roles.includes("agent") && (
                      <div style={{ marginTop: 6 }}>
                        {duzenlenen === m.id ? (
                          <>
                            <DepartmanSecici
                              secili={taslakDeps}
                              onChange={setTaslakDeps}
                              disabled={busy != null}
                            />
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
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
                        ) : (
                          <div className="admin-dep-summary">
                            {departmansiz ? (
                              <span className="admin-warn-inline" style={{ margin: 0 }}>
                                <AlertTriangle size={12} /> Departman atanmamış — hiçbir talep göremiyor
                              </span>
                            ) : (
                              <span className="admin-td-dim" style={{ fontSize: 12 }}>
                                {m.departments.map(departmentLabel).join(" · ")}
                              </span>
                            )}
                            <button
                              type="button"
                              className="admin-dep-edit"
                              disabled={busy != null}
                              onClick={() => {
                                setTaslakDeps(m.departments);
                                setDuzenlenen(m.id);
                              }}
                            >
                              Değiştir
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <span className="admin-badge-row">
                    {m.pending && (
                      <button
                        type="button"
                        className="admin-dep-edit"
                        disabled={busy != null}
                        title="Kurulum mailini yeniden gönder"
                        onClick={() => run(`resend-${m.id}`, () => resendInvite(m.email))}
                      >
                        <MailCheck size={12} /> {busy === `resend-${m.id}` ? "…" : "Daveti yenile"}
                      </button>
                    )}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
