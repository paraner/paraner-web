"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Search, User, CalendarPlus, Layers, Clock, Trash2 } from "lucide-react";
import { TICKET_STATUS_META, DEPARTMENT_META, DEPARTMENTS, TICKET_DELETE_MAX, type Ticket, type TicketStatus, type Department } from "../../../lib/supportShared";
import { relativeLabel } from "../../../lib/lifecycle";
import { deleteTickets } from "../../../lib/adminActions";
import { confirmDialog } from "../../components/confirm";
import { showToast } from "../../components/toast";

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
  silebilir,
}: {
  rows: TicketRow[];
  /** Zaman SUNUCUDAN gelir → SSR ile hydrate aynı "x gün önce"yi hesaplar (zıplama olmaz). */
  now: number;
  uyari: string | null;
  kirpildi: boolean;
  /** Yalnız admin siler (agent DEĞİL). UI kolaylık; asıl kapı sunucuda requireAdmin(). */
  silebilir: boolean;
}) {
  const router = useRouter();
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [siliniyor, setSiliniyor] = useState(false);

  /* "Boş bir yere tıklayınca seçim bırakılsın" (Mehmet, 2026-07-22).
     ⚠️ Dinleyici BELGE seviyesinde: bileşenin kendi <div>'ine koymak YETMEDİ — listenin
     ALTINDAKİ boşluk o div'e dahil değil (div yalnız içeriği kadar yüksek), tıklama hiç
     ulaşmıyordu (ölçümle görüldü).
     ⚠️ Dışlananlar: satır/kutu/çubuk/araç çubuğu (yoksa kutuyu işaretlemek kendini iptal
     ederdi) ve onay diyalogu (`.confirm-overlay`) — diyaloga basınca seçim uçarsa silinecek
     talepler kaybolurdu.
     Seçim yokken dinleyici hiç kurulmaz. */
  useEffect(() => {
    if (!silebilir || secili.size === 0) return;
    const f = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest(".admin-ticket-pick, .admin-sec-bar, .admin-toolbar, .admin-ticket-row, .confirm-overlay")) return;
      setSecili(new Set());
    };
    document.addEventListener("click", f);
    return () => document.removeEventListener("click", f);
  }, [silebilir, secili.size]);
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
            {/* ── BAŞLIK SATIRI ⇄ SEÇİM ÇUBUĞU ──
                Shopify sipariş listesi deseni (Mehmet, 2026-07-22): ikisi AYNI YERDE,
                biri diğerinin YERİNE geçiyor. Eskiden seçim çubuğu panelin DIŞINDA ayrı bir
                kutu olarak beliriyordu → hem liste aşağı kayıyor hem iki ayrı ana kutu oluyordu.
                ⚠️ "Görünenleri seç" YAZISI kaldırıldı; başlık artık sütunları adlandırıyor. */}
            {secili.size > 0 ? (
              <div className="admin-sec-bar">
                <label className="admin-sec-bar-pick">
                  {/* Ana kutu ÇUBUĞUN İÇİNDE: "seçimi bırak" diye bir YAZI yok, seçili
                      kutuya basmak bırakır. Kısmi seçimde belirsiz (—) hâli. */}
                  <input
                    type="checkbox"
                    checked={gorunen.length > 0 && gorunen.every((r) => secili.has(r.ticket.id))}
                    ref={(el) => {
                      if (el) el.indeterminate = !gorunen.every((r) => secili.has(r.ticket.id));
                    }}
                    onChange={() => setSecili(new Set())}
                    aria-label="Seçimi bırak"
                  />
                  {/* ⚠️ <strong> DEĞİL: kalın etiket 16px/700'e çıkıp başlık satırından
                      (12px/600) büyük duruyordu → seçim yapınca yazı zıplıyordu. Boyutu
                      çubuğun ortak kuralından alsın. */}
                  <span>{secili.size} talep seçildi</span>
                </label>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={siliniyor}
                  onClick={async () => {
              const idler = [...secili];
              const ok = await confirmDialog({
                title: `${idler.length} talep kalıcı olarak silinsin mi?`,
                message:
                  "Talep, tüm yazışması ve ek dosyaları geri alınamaz biçimde silinir. " +
                  "İşlem denetim kaydına yazılır.",
                confirmLabel: "Kalıcı olarak sil",
                danger: true,
              });
              if (!ok) return;
              setSiliniyor(true);
              const r = await deleteTickets(idler);
              setSiliniyor(false);
              showToast({ title: r.message, variant: r.ok ? "success" : "error" });
              if (r.ok) {
                setSecili(new Set());
                router.refresh(); // CLAUDE.md kuralı: mutasyondan sonra tek refresh
              }
            }}
                >
                  <Trash2 size={14} /> {siliniyor ? "Siliniyor…" : "Seçilenleri sil"}
                </button>
              </div>
            ) : (
              /* Sütun başlığı. Kutu SOLDA, yanında "Talepler"; sağda satırdaki rozetlerle
                 HİZALI "Ekip" ve "Durum" etiketleri (rozet yuvaları sabit genişlikte,
                 yoksa "Faturalandırma" ile "Teknik" farklı yere düşer ve başlık kayardı). */
              <div className="admin-ticket-head">
                {silebilir && (
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() =>
                      setSecili(new Set(gorunen.slice(0, TICKET_DELETE_MAX).map((r) => r.ticket.id)))
                    }
                    aria-label={`Görünen ${Math.min(gorunen.length, TICKET_DELETE_MAX)} talebi seç`}
                  />
                )}
                <span className="admin-ticket-head-main">
                  Talepler <span className="admin-td-dim">· müşteri</span>
                </span>
                <span className="admin-ticket-col">Ekip</span>
                <span className="admin-ticket-col admin-ticket-col-durum">Durum</span>
                <span className="admin-ticket-head-chev" />
              </div>
            )}
            {gorunen.map((r) => {
              const meta = TICKET_STATUS_META[r.ticket.status] ?? TICKET_STATUS_META.open;
              /* Seçim kutusu Link'in İÇİNE konamaz (tıklayınca gezinir + iç içe etkileşimli
                 öğe erişilebilirlik hatası) → kutu ile satır KARDEŞ, ortak sarmalayıcıda. */
              const satir = (
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

                  {/* Hangi ekibe düştüğü satırda görünsün — kuyruk karışmasın.
                      Rozetler SABİT genişlikli yuvalarda: başlıktaki "Ekip"/"Durum"
                      etiketleriyle hizalı kalsınlar. */}
                  <span className="admin-ticket-col">
                    <span className={`badge ${DEPARTMENT_META[r.ticket.department]?.badge ?? "gray"}`}>
                      {DEPARTMENT_META[r.ticket.department]?.label ?? "Teknik"}
                    </span>
                  </span>
                  <span className="admin-ticket-col admin-ticket-col-durum">
                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  </span>
                  <ChevronRight size={16} className="admin-ticket-chevron" />
                </Link>
              );

              if (!silebilir) return satir;
              const sec = secili.has(r.ticket.id);
              return (
                <div key={r.ticket.id} className="admin-ticket-pick">
                  <input
                    type="checkbox"
                    checked={sec}
                    aria-label={`"${r.ticket.subject}" talebini seç`}
                    onChange={(e) => {
                      setSecili((o) => {
                        const y = new Set(o);
                        if (e.target.checked) y.add(r.ticket.id);
                        else y.delete(r.ticket.id);
                        return y;
                      });
                    }}
                  />
                  {satir}
                </div>
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
