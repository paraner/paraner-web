"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Ban, Trash2, Star, ShieldOff , Pencil, AlertTriangle, AtSign, LifeBuoy, ChevronRight } from "lucide-react";
import { showToast } from "../../../components/toast";
import { confirmDialog } from "../../../components/confirm";
import {
  sendPasswordReset,
  updateProfileInfo,
  changeUserEmail,
  setProfilePlan,
  setUserBanned,
  deleteUserAccount,
  type ActionResult,
} from "../../../../lib/adminActions";
import type { AdminPerson } from "../../../../lib/adminUsers";
import {
  TICKET_STATUS_META,
  DEPARTMENT_META,
  departmentLabel,
  type Ticket,
} from "../../../../lib/supportShared";
import { profileLifecycle, lifecycleLabel, LIFECYCLE_META, relativeLabel } from "../../../../lib/lifecycle";
import { tierLabel } from "../../../../lib/plans";
import { TZ } from "../../../../lib/format";
import { CURRENCIES } from "../../../../lib/currencies";
import SilModal from "./SilModal";

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
    return new Date(s).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });
  } catch {
    return "—";
  }
}

export default function MusteriDetayClient({
  person,
  usage,
  tickets,
  ticketsTruncated,
  now,
}: {
  person: AdminPerson;
  usage: ProfileUsage[];
  /** Kişinin destek talepleri (en yeni mesaj üstte) — sayfayı çeken sunucudan gelir. */
  tickets: Ticket[];
  /** true = TICKET_LIMIT'i aştı, ekranda "daha var" denecek. */
  ticketsTruncated: boolean;
  /** Liste sayfasıyla AYNI sebep: zaman sunucudan gelir → SSR ile hydrate aynı günü hesaplar
      (yoksa rozet "3 gün kaldı"dan "2 gün kaldı"ya atlar) ve liste ile detay aynı şeyi der. */
  now: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [silAcik, setSilAcik] = useState(false);
  /* Profil bilgisi düzenleme (2026-07-19) + e-posta değiştirme taslakları */
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [tAd, setTAd] = useState("");
  const [tTur, setTTur] = useState("individual");
  const [tPb, setTPb] = useState("TRY");
  const [mailAcik, setMailAcik] = useState(false);
  const [yeniMail, setYeniMail] = useState("");
  const banned = Boolean(person.banned_until && new Date(person.banned_until).getTime() > now);

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
          {/* İkisi AYNI ŞEY DEĞİL: "son aktiflik" uygulamayı en son ne zaman açtığı
              (user_devices.last_seen), "son giriş" en son ne zaman kimlik doğruladığı
              (auth.last_sign_in_at — oturum açık kaldıkça aylarca değişmez). */}
          <p className="admin-sub" style={{ marginBottom: 0 }}>
            Kayıt {fmtDate(person.created_at)} · Son aktiflik{" "}
            {person.last_seen_at ? relativeLabel(person.last_seen_at, now) : "bilinmiyor"} · Son giriş{" "}
            {fmtDate(person.last_sign_in_at)} · {person.profiles.length} profil
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
                      {/* Durum HESAPLANIR — is_premium bayat olabilir (bkz. lib/lifecycle.ts).
                          Ham tier'ı da gösteriyoruz: geçersiz/kirli değer gözden kaçmasın. */}
                      {(() => {
                        const l = profileLifecycle(p, now);
                        return (
                          <>
                            <span className={`badge ${LIFECYCLE_META[l.kind].badge}`}>
                              {lifecycleLabel(l)}
                            </span>{" "}
                            <span className="admin-td-dim" style={{ fontSize: 12 }}>
                              {tierLabel(p.subscription_tier)}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy != null || pending}
                      /* ⚠️ ONAY ŞART (denetim 2026-07-18 / Y2): "tekrar bas" geri alma DEĞİL —
                         setProfilePlan aynı işlemde trial_plan + trial_start_date'i null'lar,
                         yani yanlışlıkla basılınca müşterinin KALAN DENEME SÜRESİ geri gelmez.
                         Aynı ekrandaki askıya al/kalıcı sil zaten confirmDialog kullanıyordu. */
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: p.is_premium ? "Free'ye düşür" : "Premium yap",
                          message: p.is_premium
                            ? `"${p.profile_name || p.name || "Bu"}" profili Free'ye düşecek. Varsa kalan deneme süresi de silinir ve geri alınamaz. Onaylıyor musun?`
                            : `"${p.profile_name || p.name || "Bu"}" profili Premium olacak. Varsa süren denemesi sonlanır (deneme bilgisi silinir). Onaylıyor musun?`,
                          confirmLabel: p.is_premium ? "Free'ye düşür" : "Premium yap",
                          danger: Boolean(p.is_premium),
                        });
                        if (ok)
                          run(`plan-${p.id}`, () =>
                            setProfilePlan(p.id, !p.is_premium, person.email)
                          );
                      }}
                    >
                      <Star size={14} />
                      {busy === `plan-${p.id}`
                        ? "…"
                        : p.is_premium
                        ? "Free'ye düşür"
                        : "Premium yap"}
                    </button>
                  </div>
                  {/* Profil VERİSİNİ düzeltme (2026-07-19) — destek "adım yanlış / türü yanlış
                      seçmişim / para birimim yanlış" dediğinde panelden çıkmadan düzeltebilsin. */}
                  {duzenlenen === p.id ? (
                    <div className="admin-profile-edit">
                      <div className="admin-invite-grid" style={{ gap: 12 }}>
                        <div className="admin-invite-field">
                          <label className="admin-field-label" htmlFor={`ad-${p.id}`}>
                            Profil adı
                          </label>
                          <input
                            id={`ad-${p.id}`}
                            className="adm-login-input"
                            style={{ margin: 0, width: "100%" }}
                            value={tAd}
                            onChange={(e) => setTAd(e.target.value)}
                          />
                        </div>
                        <div className="admin-invite-field">
                          <label className="admin-field-label" htmlFor={`tur-${p.id}`}>
                            Hesap türü
                          </label>
                          <select
                            id={`tur-${p.id}`}
                            className="adm-login-input"
                            style={{ margin: 0, width: "100%" }}
                            value={tTur}
                            onChange={(e) => setTTur(e.target.value)}
                          >
                            <option value="individual">Bireysel</option>
                            <option value="business">İşletme</option>
                          </select>
                        </div>
                        <div className="admin-invite-field">
                          <label className="admin-field-label" htmlFor={`pb-${p.id}`}>
                            Para birimi
                          </label>
                          <select
                            id={`pb-${p.id}`}
                            className="adm-login-input"
                            style={{ margin: 0, width: "100%" }}
                            value={tPb}
                            onChange={(e) => setTPb(e.target.value)}
                          >
                            {CURRENCIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.code} — {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {tTur !== (p.profile_type ?? "individual") && (
                        <p className="admin-warn-inline">
                          <AlertTriangle size={12} /> Hesap türü değişiyor — mobilde de menü ve
                          özellikler buna göre değişir.
                        </p>
                      )}
                      {tPb !== (p.currency || "TRY") && (
                        <p className="admin-warn-inline">
                          <AlertTriangle size={12} /> Para birimi değişiyor — geçmiş kayıtlar kendi
                          para birimini korur, yalnız yeni kayıtlar {tPb} olur.
                        </p>
                      )}

                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busy != null || !tAd.trim()}
                          onClick={() =>
                            run(`edit-${p.id}`, () =>
                              updateProfileInfo(p.id, person.email, tAd, tTur, tPb),
                            )
                          }
                        >
                          {busy === `edit-${p.id}` ? "…" : "Kaydet"}
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
                    </div>
                  ) : (
                    <div className="admin-profile-stats">
                      <span>{u?.transactions ?? 0} işlem</span>
                      <span>{u?.invoices ?? 0} fatura</span>
                      <span>{u?.accounts ?? 0} hesap</span>
                      <span>Son hareket: {u?.lastActivity ? fmtDate(u.lastActivity) : "—"}</span>
                      <span>Para birimi: {p.currency || "TRY"}</span>
                      <button
                        type="button"
                        className="admin-dep-edit"
                        disabled={busy != null || pending}
                        onClick={() => {
                          setTAd(p.profile_name || p.name || "");
                          setTTur(p.profile_type ?? "individual");
                          setTPb(p.currency || "TRY");
                          setDuzenlenen(p.id);
                        }}
                      >
                        <Pencil size={12} /> Bilgileri düzenle
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Destek talepleri (2026-07-23) ---
          NEDEN: agent bir müşteriye bakarken "bu kişi bize ne sormuş" bilgisi burada yoktu →
          çıkıp /admin/destek'te e-postayla aratmak zorundaydı. Talepler artık kişinin
          sayfasında. Salt OKUMA — yeni yetki/aksiyon yok, satır zaten var olan talep
          ekranına götürüyor. */}
      <div className="admin-panel" style={{ marginTop: 16 }}>
        <div className="admin-panel-head">
          <LifeBuoy size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Destek Talepleri
          {tickets.length > 0 && (
            <span className="admin-td-dim" style={{ fontWeight: 400, marginLeft: 6 }}>
              ({tickets.length}
              {ticketsTruncated ? "+" : ""})
            </span>
          )}
        </div>
        {tickets.length === 0 ? (
          <p className="admin-td-dim" style={{ fontSize: 13, margin: 0 }}>
            Bu müşteri hiç destek talebi açmamış.
          </p>
        ) : (
          <div className="admin-ticket-list">
            {tickets.map((t) => {
              const meta = TICKET_STATUS_META[t.status] ?? { label: t.status, badge: "gray" };
              return (
                <Link
                  key={t.id}
                  href={`/admin/destek/${t.id}`}
                  className="admin-ticket-row"
                >
                  <div className="admin-ticket-main">
                    <div className="admin-ticket-subject">{t.subject}</div>
                    <div className="admin-ticket-meta">
                      <span>#{t.id.slice(0, 8)}</span>
                      <span>Son mesaj: {relativeLabel(t.last_message_at, now)}</span>
                    </div>
                  </div>
                  <span className="admin-ticket-col">
                    <span
                      className={`badge ${DEPARTMENT_META[t.department]?.badge ?? "gray"}`}
                    >
                      {departmentLabel(t.department)}
                    </span>
                  </span>
                  <span className="admin-ticket-col admin-ticket-col-durum">
                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  </span>
                  <ChevronRight size={16} className="admin-ticket-chevron" />
                </Link>
              );
            })}
            {ticketsTruncated && (
              <p className="admin-td-dim" style={{ fontSize: 12, margin: "10px 4px 0" }}>
                Yalnız en yeni {tickets.length} talep gösteriliyor — daha eski talepler var.
              </p>
            )}
          </div>
        )}
      </div>

      {/* --- Aksiyonlar --- */}
      <div className="admin-panel" style={{ marginTop: 16 }}>
        <div className="admin-panel-head">Hesap işlemleri</div>
        {mailAcik && (
          <div className="admin-mail-edit">
            <label className="admin-field-label" htmlFor="yeni-mail">
              Yeni e-posta adresi
            </label>
            <div className="admin-invite-row" style={{ marginTop: 6 }}>
              <input
                id="yeni-mail"
                className="adm-login-input"
                style={{ margin: 0, flex: 1, minWidth: 220 }}
                type="email"
                placeholder={person.email}
                value={yeniMail}
                onChange={(e) => setYeniMail(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy != null || !yeniMail.trim()}
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: "E-postayı değiştir",
                    message: `Giriş adresi ${person.email} → ${yeniMail.trim().toLowerCase()} olacak. Müşteri artık ESKİ adresiyle giriş yapamaz. Onaylıyor musun?`,
                    confirmLabel: "Değiştir",
                    danger: true,
                  });
                  if (ok) {
                    await run("mail", () => changeUserEmail(person.id, person.email, yeniMail));
                    setMailAcik(false);
                  }
                }}
              >
                {busy === "mail" ? "…" : "Değiştir"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy != null}
                onClick={() => setMailAcik(false)}
              >
                Vazgeç
              </button>
            </div>
            <p className="admin-warn-inline">
              <AlertTriangle size={12} /> Müşteriye haber ver — yeni adresle giriş yapacak, eski
              adres çalışmayacak.
            </p>
          </div>
        )}
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

          {/* Giriş e-postasını değiştir — "yanlış mail ile kayıt oldum" en sık gelen
              destek taleplerinden. Değişince kişi ESKİ adresle giremez → onay isteniyor. */}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy != null || pending}
            onClick={() => {
              setYeniMail("");
              setMailAcik((a) => !a);
            }}
          >
            <AtSign size={14} /> E-postasını değiştir
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
          onClick={() => setSilAcik(true)}
        >
          <Trash2 size={14} />
          {busy === "delete" ? "Siliniyor…" : "Hesabı kalıcı sil"}
        </button>
      </div>

      {/* Sebep + not zorunluluğu burada; onay artık evet/hayır değil (2026-07-20). */}
      {silAcik && (
        <SilModal
          email={person.email}
          busy={busy === "delete"}
          onClose={() => setSilAcik(false)}
          onConfirm={(reason, note) => {
            setSilAcik(false);
            run("delete", () => deleteUserAccount(person.id, person.email, reason, note), true);
          }}
        />
      )}
    </div>
  );
}
