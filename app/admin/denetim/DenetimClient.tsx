"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, Mail, Star, Ban, Trash2, UserPlus, KeyRound } from "lucide-react";
import { relativeLabel } from "../../../lib/lifecycle";

export type AuditRow = {
  id: string;
  actor_email: string;
  action: string;
  target_email: string | null;
  target_user_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

/* Aksiyon adları lib/adminActions.ts'te yazılan sabitlerle BİREBİR olmalı.
   Bilinmeyen bir action gelirse ham string gösterilir (sessizce boş bırakma). */
const ACTION_META: Record<string, { label: string; icon: typeof Mail; tone: string }> = {
  password_reset_sent: { label: "Şifre sıfırlama maili gönderildi", icon: Mail, tone: "blue" },
  plan_premium: { label: "Premium yapıldı", icon: Star, tone: "green" },
  plan_free: { label: "Ücretsiz plana düşürüldü", icon: Star, tone: "gray" },
  user_banned: { label: "Hesap askıya alındı", icon: Ban, tone: "red" },
  user_unbanned: { label: "Askı kaldırıldı", icon: Ban, tone: "green" },
  user_deleted: { label: "Hesap KALICI silindi", icon: Trash2, tone: "red" },
  role_granted: { label: "Rol verildi", icon: ShieldCheck, tone: "green" },
  role_revoked: { label: "Rol kaldırıldı", icon: ShieldCheck, tone: "amber" },
  staff_invited: { label: "Personel davet edildi", icon: UserPlus, tone: "blue" },
};

const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export default function DenetimClient({ rows, now }: { rows: AuditRow[]; now: number }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLocaleLowerCase("tr");
    if (!query) return rows;
    return rows.filter((r) =>
      `${r.actor_email} ${r.target_email ?? ""} ${r.action} ${ACTION_META[r.action]?.label ?? ""}`
        .toLocaleLowerCase("tr")
        .includes(query),
    );
  }, [rows, q]);

  return (
    <div>
      <h1 className="admin-h1">Denetim Kaydı</h1>
      <p className="admin-sub">
        İç ekibin müşteri hesaplarında yaptığı her işlem. Kimse (yönetici dahil) bu kayıtları
        silemez veya değiştiremez. Son 500 kayıt.
      </p>

      <div className="admin-filters">
        <label className="admin-search">
          <Search size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kim yaptı, kime yapıldı veya işlem türü…"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="admin-panel">
          <p className="live-empty">
            Henüz kayıt yok.
            <span>
              Panelden bir işlem yapıldığında (şifre sıfırlama, plan değişimi, askıya alma,
              silme, rol verme) burada iz bırakır.
            </span>
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-panel">
          <p className="live-empty">Aramanla eşleşen kayıt yok.</p>
        </div>
      ) : (
        <div className="admin-panel" style={{ padding: 0 }}>
          <div className="audit-list">
            {filtered.map((r) => {
              const meta = ACTION_META[r.action];
              const Icon = meta?.icon ?? KeyRound;
              return (
                <div key={r.id} className="audit-row">
                  <span className={`audit-ic ${meta?.tone ?? "gray"}`}>
                    <Icon size={14} />
                  </span>
                  <div className="audit-main">
                    <div className="audit-title">
                      {/* Bilinmeyen aksiyon: ham adı göster — sessizce boş bırakma */}
                      {meta?.label ?? r.action}
                      {r.target_email && (
                        <>
                          {" · "}
                          {/* Silinen kullanıcının detayı yok → link verme (404 olurdu) */}
                          {r.target_user_id && r.action !== "user_deleted" ? (
                            <Link href={`/admin/musteriler/${r.target_user_id}`} className="audit-link">
                              {r.target_email}
                            </Link>
                          ) : (
                            <span className="audit-target">{r.target_email}</span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="audit-meta">
                      {r.actor_email} · {fmt(r.created_at)} · {relativeLabel(r.created_at, now)}
                      {r.detail && Object.keys(r.detail).length > 0 && (
                        <span className="audit-detail">
                          {Object.entries(r.detail)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
