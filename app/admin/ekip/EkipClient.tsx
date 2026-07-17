"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, ShieldCheck, LifeBuoy } from "lucide-react";
import { showToast } from "../../components/toast";
import { confirmDialog } from "../../components/confirm";
import { inviteStaff, grantRole, revokeRole, type ActionResult } from "../../../lib/adminActions";

export type StaffMember = {
  id: string;
  email: string;
  roles: ("admin" | "agent")[];
  since: string;
};

const ROLE_LABEL = { admin: "Yönetici", agent: "Destek" } as const;

export default function EkipClient({ staff }: { staff: StaffMember[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<ActionResult>) {
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
      setEmail("");
      router.refresh();
    }
  }

  return (
    <div>
      <h1 className="admin-h1">Ekip</h1>
      <p className="admin-sub">
        Destek personeli ve yöneticiler. <b>Yönetici</b> her şeyi görür ve müşteri yönetir;{" "}
        <b>Destek</b> yalnız destek taleplerini görür.
      </p>

      {/* --- Ekle / davet --- */}
      <div className="admin-panel" style={{ maxWidth: 640 }}>
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
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!email.trim() || busy != null}
            onClick={() => run("grant", () => grantRole(email, role))}
          >
            {busy === "grant" ? "…" : "Rol ver"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!email.trim() || busy != null}
            onClick={() => run("invite", () => inviteStaff(email, role))}
          >
            {busy === "invite" ? "…" : "Davet et"}
          </button>
        </div>
        <p className="admin-td-dim" style={{ fontSize: 12, margin: "10px 0 0", lineHeight: 1.6 }}>
          <b>Rol ver:</b> kişi Paraner&apos;e zaten kayıtlıysa. <b>Davet et:</b> hiç hesabı yoksa —
          kurulum maili gider, şifresini kendisi belirler.
        </p>
      </div>

      {/* --- Mevcut ekip --- */}
      <div className="admin-panel" style={{ marginTop: 16, maxWidth: 640 }}>
        <div className="admin-panel-head">Ekip ({staff.length})</div>
        {staff.length === 0 ? (
          <p className="admin-td-dim" style={{ fontSize: 13 }}>Henüz kimse yok.</p>
        ) : (
          <div className="admin-staff-list">
            {staff.map((m) => (
              <div key={m.id} className="admin-staff-row">
                <span className="admin-staff-email">{m.email}</span>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
