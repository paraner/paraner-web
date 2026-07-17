"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Ban, Trash2, Star, ShieldOff } from "lucide-react";
import { showToast } from "../../../components/toast";
import { confirmDialog } from "../../../components/confirm";
import {
  sendPasswordReset,
  setProfilePlan,
  setUserBanned,
  deleteUserAccount,
  type ActionResult,
} from "../../../../lib/adminActions";
import type { AdminPerson } from "../../../../lib/adminUsers";

export type ProfileUsage = {
  profileId: string;
  transactions: number;
  invoices: number;
  accounts: number;
  lastActivity: string | null;
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function MusteriDetayClient({
  person,
  usage,
}: {
  person: AdminPerson;
  usage: ProfileUsage[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const banned = Boolean(person.banned_until && new Date(person.banned_until) > new Date());

  // Tüm aksiyonlar tek kapıdan: kilit + sonuç toast'ı + sunucu verisini tazele.
  async function run(key: string, fn: () => Promise<ActionResult>, afterDelete = false) {
    if (busy) return; // çift-tık kilidi
    setBusy(key);
    const res = await fn();
    setBusy(null);
    showToast({
      title: res.ok ? "Tamam" : "Olmadı",
      message: res.message,
      variant: res.ok ? "success" : "error",
    });
    if (!res.ok) return;
    if (afterDelete) router.push("/admin/musteriler");
    else startTransition(() => router.refresh());
  }

  const usageOf = (profileId: string) => usage.find((u) => u.profileId === profileId);

  return (
    <div>
      <div className="admin-detail-head">
        <Link href="/admin/musteriler" className="thread-back" aria-label="Geri">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="admin-h1">
            {person.email}
            {banned && (
              <span className="badge red" style={{ marginLeft: 10, verticalAlign: "middle" }}>
                <Ban size={11} /> Askıda
              </span>
            )}
          </h1>
          <p className="admin-sub" style={{ marginBottom: 0 }}>
            Kayıt {fmtDate(person.created_at)} · Son giriş {fmtDate(person.last_sign_in_at)} ·{" "}
            {person.profiles.length} profil
          </p>
        </div>
      </div>

      {/* --- Profiller + kullanım --- */}
      <div className="admin-panel" style={{ marginTop: 20 }}>
        <div className="admin-panel-head">Profiller</div>
        {person.profiles.length === 0 ? (
          <p className="admin-td-dim" style={{ fontSize: 13 }}>
            Bu üyenin profili yok (kayıt olmuş ama kuruluma girmemiş).
          </p>
        ) : (
          <div className="admin-profile-list">
            {person.profiles.map((p) => {
              const u = usageOf(p.id);
              return (
                <div key={p.id} className="admin-profile-card">
                  <div className="admin-profile-top">
                    <div>
                      <div className="admin-profile-name">{p.profile_name || p.name || "—"}</div>
                      <span className={`badge ${p.profile_type === "business" ? "blue" : "gray"}`}>
                        {p.profile_type === "business" ? "İşletme" : "Bireysel"}
                      </span>{" "}
                      <span className={`badge ${p.is_premium ? "green" : "gray"}`}>
                        {p.is_premium ? p.subscription_tier || "Premium" : "Free"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy != null || pending}
                      onClick={() =>
                        run(`plan-${p.id}`, () => setProfilePlan(p.id, !p.is_premium, person.email))
                      }
                    >
                      <Star size={14} />
                      {busy === `plan-${p.id}`
                        ? "…"
                        : p.is_premium
                        ? "Free'ye düşür"
                        : "Premium yap"}
                    </button>
                  </div>
                  <div className="admin-profile-stats">
                    <span>{u?.transactions ?? 0} işlem</span>
                    <span>{u?.invoices ?? 0} fatura</span>
                    <span>{u?.accounts ?? 0} hesap</span>
                    <span>Son hareket: {u?.lastActivity ? fmtDate(u.lastActivity) : "—"}</span>
                    <span>Para birimi: {p.currency || "TRY"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Aksiyonlar --- */}
      <div className="admin-panel" style={{ marginTop: 16 }}>
        <div className="admin-panel-head">Hesap işlemleri</div>
        <div className="admin-action-row">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy != null}
            onClick={() =>
              run("reset", () => sendPasswordReset(person.id, person.email))
            }
          >
            <Mail size={14} />
            {busy === "reset" ? "Gönderiliyor…" : "Şifre sıfırlama maili gönder"}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy != null}
            onClick={async () => {
              const ok = await confirmDialog({
                title: banned ? "Askıyı kaldır" : "Hesabı askıya al",
                message: banned
                  ? `${person.email} tekrar giriş yapabilecek. Onaylıyor musun?`
                  : `${person.email} giriş yapamayacak. Verileri silinmez, istediğinde geri alabilirsin.`,
                confirmLabel: banned ? "Askıyı kaldır" : "Askıya al",
                danger: !banned,
              });
              if (ok) run("ban", () => setUserBanned(person.id, !banned, person.email));
            }}
          >
            {banned ? <ShieldOff size={14} /> : <Ban size={14} />}
            {busy === "ban" ? "…" : banned ? "Askıyı kaldır" : "Hesabı askıya al"}
          </button>
        </div>
      </div>

      {/* --- Tehlike bölgesi --- */}
      <div className="danger-zone" style={{ marginTop: 16 }}>
        <div className="admin-panel-head" style={{ color: "var(--danger)" }}>
          Tehlike Bölgesi
        </div>
        <p className="admin-td-dim" style={{ fontSize: 13, margin: "0 0 12px" }}>
          Hesabı kalıcı olarak siler — tüm profilleri, işlemleri ve faturaları gider.{" "}
          <b>Geri alınamaz.</b> Silinen kişiye &quot;Görüşmek üzere&quot; maili gider.
        </p>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={busy != null}
          onClick={async () => {
            const ok = await confirmDialog({
              title: "Hesabı kalıcı sil",
              message: `${person.email} ve TÜM verisi kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misin?`,
              confirmLabel: "Kalıcı olarak sil",
              danger: true,
            });
            if (ok) run("delete", () => deleteUserAccount(person.id, person.email), true);
          }}
        >
          <Trash2 size={14} />
          {busy === "delete" ? "Siliniyor…" : "Hesabı kalıcı sil"}
        </button>
      </div>
    </div>
  );
}
