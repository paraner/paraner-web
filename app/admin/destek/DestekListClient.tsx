"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, User, CalendarPlus, Layers, Clock } from "lucide-react";
import { TICKET_STATUS_META, DEPARTMENT_META, DEPARTMENTS, type Ticket, type TicketStatus, type Department } from "../../../lib/supportShared";
import { relativeLabel } from "../../../lib/lifecycle";

/** Talep + o talebi yazan müşterinin bağlamı (sunucuda birleştirilir). */
export type TicketRow = {
  ticket: Ticket;
  email: string | null;
  ad: string | null;
  /** auth.users.created_at — "ne zaman üye oldu" */
  uyelik: string | null;
  /** lifecycle etiketi (Denemede · 5 gün kaldı / Ücretli / Zombi …) */
  durum: string | null;
  durumBadge: string | null;
  profilSayisi: number;
  sonAktiflik: string | null;
  /** Müşteri KALICI silinmişse: kim, neden, ne zaman sildi (admin_audit_log'dan).
      null = müşteri duruyor VEYA silme kaydı eşleşmedi (eski silmelerde ticket_ids yok). */
  silme: { kim: string; sebep: string; not: string | null; ne_zaman: string } | null;
};

/* ⚠️ timeZone SABİT olmalı (2026-07-18). İki ayrı sorunu birden çözüyor:
   1) DOĞRULUK: sunucu (Vercel) UTC'de çalışıyor → saat dilimi yazılmazsa SSR çıktısı
      Türkiye saatinden 3 saat geride oluyordu. Agent "son mesaj 11:35" görüyordu, oysa 14:35.
   2) HYDRATION: sunucu UTC, tarayıcı Europe/Istanbul ile biçimlendirince metinler
      uyuşmuyordu → React #418 (sayfa çöküyor gibi görünmese de bileşen istemcide
      yeniden çiziliyordu). /admin/destek + /admin/musteriler'de ölçüldü.
   Ürün TR odaklı ve ekip Türkiye'de → sabit "Europe/Istanbul" doğru davranış. */
const TZ = "Europe/Istanbul";

function fmtTarih(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "short", year: "numeric", timeZone: TZ,
    });
  } catch {
    return "—";
  }
}
function fmtSaat(s: string | null) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString("tr-TR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ,
    });
  } catch {
    return "";
  }
}

/* Sıra bilinçli: iş bekleyenler önce. "Tümü" hep görünür. */
const SEGMENTS: { id: "bekleyen" | TicketStatus | "hepsi"; label: string }[] = [
  { id: "bekleyen", label: "Yanıt bekleyen" },
  { id: "open", label: "Açık" },
  { id: "answered", label: "Yanıtlandı" },
  { id: "resolved", label: "Çözüldü" },
  { id: "closed", label: "Kapandı" },
  { id: "hepsi", label: "Tümü" },
];

export default function DestekListClient({
  rows,
  now,
  uyari,
  kirpildi,
}: {
  rows: TicketRow[];
  /** Zaman SUNUCUDAN gelir → SSR ile hydrate aynı "x gün önce"yi hesaplar (zıplama olmaz). */
  now: number;
  uyari: string | null;
  kirpildi: boolean;
}) {
  const [seg, setSeg] = useState<(typeof SEGMENTS)[number]["id"]>("bekleyen");
  /* Departman filtresi: "tüm ekipler" varsayılan. Admin hepsini görür; agent'a RLS zaten
     yalnız kendi departmanını verecek (daraltma ayrı adımda) → bu filtre onun için de anlamlı. */
  const [dep, setDep] = useState<Department | "hepsi">("hepsi");
  const [q, setQ] = useState("");

  const sayac = useMemo(() => {
    const m: Record<string, number> = { hepsi: rows.length, bekleyen: 0 };
    for (const r of rows) {
      m[r.ticket.status] = (m[r.ticket.status] ?? 0) + 1;
      if (r.ticket.status === "open" || r.ticket.status === "answered") m.bekleyen++;
    }
    return m;
  }, [rows]);

  const gorunen = useMemo(() => {
    const ara = q.trim().toLocaleLowerCase("tr");
    return rows.filter((r) => {
      if (dep !== "hepsi" && r.ticket.department !== dep) return false;
      if (seg === "bekleyen") {
        if (r.ticket.status !== "open" && r.ticket.status !== "answered") return false;
      } else if (seg !== "hepsi" && r.ticket.status !== seg) return false;

      if (!ara) return true;
      // Konu + e-posta + ad + talep no üzerinden arama (agent hangisini hatırlarsa)
      return [r.ticket.subject, r.email, r.ad, r.ticket.id.slice(0, 8)]
        .filter(Boolean)
        .some((x) => (x as string).toLocaleLowerCase("tr").includes(ara));
    });
  }, [rows, seg, q, dep]);

  return (
    <div>
      <h1 className="admin-h1">Destek Talepleri</h1>
      <p className="admin-sub">
        {rows.length} talep · {sayac.bekleyen} yanıt bekliyor. Satırda müşterinin üyelik tarihi,
        planı ve son aktifliği görünür — talebe girmeden kiminle konuştuğunu bilirsin.
      </p>

      {uyari && (
        <p className="admin-sub" style={{ color: "var(--danger)", marginTop: -4 }}>⚠️ {uyari}</p>
      )}

      <div className="admin-toolbar">
        <div className="admin-chip-row">
          {SEGMENTS.map((s) => {
            const c = sayac[s.id] ?? 0;
            /* Seçili çip sayı 0 olsa da GİZLENMEZ — yoksa filtre açıkken ekrandan kaybolur
               ve kullanıcı hangi filtrede olduğunu göremez (denetim bulgusu). */
            if (s.id !== "hepsi" && c === 0 && seg !== s.id) return null;
            return (
              <button
                key={s.id}
                type="button"
                className={`admin-chip${seg === s.id ? " active" : ""}`}
                onClick={() => setSeg(s.id)}
              >
                {s.label}
                <span className="admin-chip-count">{c}</span>
              </button>
            );
          })}
        </div>

        <select
          className="admin-select"
          value={dep}
          onChange={(e) => setDep(e.target.value as Department | "hepsi")}
          aria-label="Departmana göre filtrele"
        >
          <option value="hepsi">Tüm ekipler</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>

        <div className="admin-search">
          <Search size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Konu, e-posta, ad veya talep no…"
            aria-label="Taleplerde ara"
          />
        </div>
      </div>

      <div className="admin-panel" style={{ padding: 0 }}>
        {gorunen.length === 0 ? (
          <p className="admin-empty-cell" style={{ padding: 24 }}>
            {rows.length === 0 ? "Henüz talep yok." : "Bu filtrede talep yok."}
          </p>
        ) : (
          <div className="admin-ticket-list">
            {gorunen.map((r) => {
              const meta = TICKET_STATUS_META[r.ticket.status] ?? TICKET_STATUS_META.open;
              return (
                <Link
                  key={r.ticket.id}
                  href={`/admin/destek/${r.ticket.id}`}
                  className="admin-ticket-row"
                >
                  <div className="admin-ticket-main">
                    <div className="admin-ticket-subject">{r.ticket.subject}</div>

                    {/* 1. satır: KİM — e-posta agent'ın aradığı asıl anahtar */}
                    <div className="admin-ticket-who">
                      <User size={12} />
                      {r.email ? (
                        <>
                          <strong>{r.email}</strong>
                          {r.ad && r.ad !== r.email && <span>· {r.ad}</span>}
                          {r.durum && (
                            <span className={`badge ${r.durumBadge ?? "gray"}`}>{r.durum}</span>
                          )}
                        </>
                      ) : r.silme ? (
                        /* Denetim kaydı eşleşti → tahmin değil, BELGE: kim sildi, neden.
                           Not varsa balonda (title) — satırı uzatmadan erişilebilir olsun. */
                        <span
                          className="admin-td-dim"
                          title={r.silme.not ? `Not: ${r.silme.not}` : undefined}
                        >
                          hesap silindi · <strong>{r.silme.kim}</strong> · {r.silme.sebep} ·{" "}
                          {fmtTarih(r.silme.ne_zaman)}
                          {r.silme.not && " · not var"}
                        </span>
                      ) : (
                        /* Kişi bulunamadı ama eşleşen silme kaydı da yok: müşteri listesi
                           kırpılmış OLABİLİR, ya da silme sebep alanı eklenmeden (2026-07-20
                           öncesi) yapılmış eski bir silmedir. "—" yerine sebebi yaz. */
                        <span className="admin-td-dim">müşteri kaydı bulunamadı (silinmiş olabilir)</span>
                      )}
                    </div>

                    {/* 2. satır: BAĞLAM — üyelik, profil, son aktiflik, talep no */}
                    <div className="admin-ticket-meta">
                      <span title="Üyelik tarihi">
                        <CalendarPlus size={11} /> Üye: {fmtTarih(r.uyelik)}
                        {r.uyelik && <> ({relativeLabel(r.uyelik, now)})</>}
                      </span>
                      <span title="Profil sayısı">
                        <Layers size={11} /> {r.profilSayisi} profil
                      </span>
                      <span title="Son aktiflik">
                        <Clock size={11} /> Son görülme: {relativeLabel(r.sonAktiflik, now)}
                      </span>
                      <span>#{r.ticket.id.slice(0, 8)}</span>
                      <span>Son mesaj: {fmtSaat(r.ticket.last_message_at)}</span>
                    </div>
                  </div>

                  {/* Hangi ekibe düştüğü satırda görünsün — kuyruk karışmasın. */}
                  <span className={`badge ${DEPARTMENT_META[r.ticket.department]?.badge ?? "gray"}`}>
                    {DEPARTMENT_META[r.ticket.department]?.label ?? "Teknik"}
                  </span>
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  <ChevronRight size={16} className="admin-ticket-chevron" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {kirpildi && (
        <p className="admin-sub" style={{ marginTop: 10 }}>
          ⚠️ En yeni 200 talep gösteriliyor — daha eskisi için sayfalama gerekir.
        </p>
      )}
    </div>
  );
}
