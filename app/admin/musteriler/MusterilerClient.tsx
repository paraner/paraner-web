"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Ban } from "lucide-react";
import type { AdminPerson } from "../../../lib/adminUsers";
import {
  personLifecycle,
  lifecycleLabel,
  LIFECYCLE_META,
  isBanned,
  hasBusiness,
  displayName,
  trialDaysLeft,
  relativeDays,
  relativeLabel,
  lastActivity,
  isOnline,
  LOST_AFTER_DAYS,
  NEW_WITHIN_DAYS,
  TRIAL_ENDING_DAYS,
} from "../../../lib/lifecycle";

/* Segment = "şu an ne yapmam gerek" listesi. Sıra bilinçli: aksiyon gerektirenler önde.
   Tür (İşletme/Bireysel) ikincil filtre — ana eksen yaşam döngüsü (17.07.2026 kararı). */
type Segment = "all" | "online" | "new" | "trial" | "ending" | "zombie" | "paid" | "free" | "banned" | "lost" | "no_profile";
type TypeFilter = "all" | "business" | "individual";
type Sort = "created_desc" | "created_asc" | "seen_desc" | "seen_asc" | "trial_end" | "email";

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "online", label: "🟢 Şu an aktif" },
  { id: "zombie", label: "⚠️ Deneme bitti · premium açık" },
  { id: "ending", label: "Denemesi bitiyor" },
  { id: "trial", label: "Denemede" },
  { id: "new", label: "Yeni" },
  { id: "paid", label: "Ücretli" },
  { id: "free", label: "Ücretsiz" },
  { id: "no_profile", label: "Kurulum yapılmamış" },
  { id: "lost", label: "Kayıp" },
  { id: "banned", label: "Askıda" },
];

const SORTS: { id: Sort; label: string }[] = [
  { id: "created_desc", label: "Kayıt · yeni → eski" },
  { id: "created_asc", label: "Kayıt · eski → yeni" },
  { id: "seen_desc", label: "Son aktiflik · yeni → eski" },
  { id: "seen_asc", label: "Son aktiflik · eski → yeni (kaybolanlar)" },
  { id: "trial_end", label: "Denemesi önce bitecek" },
  { id: "email", label: "E-posta · A → Z" },
];

function fmtDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function MusterilerClient({
  people,
  truncated,
  now,
}: {
  people: AdminPerson[];
  truncated: boolean;
  /** Zaman SUNUCUDAN gelir (page.tsx). Burada Date.now() çağırmak iki sorun çıkarır:
      sunucu ve istemci farklı an hesaplar → hydration uyarısı; ve mount'a kadar durum
      sütunu boş kalır (ilk boyamada rozet yok). Tek damga → iki taraf birebir aynı. */
  now: number;
}) {
  const router = useRouter();
  const [seg, setSeg] = useState<Segment>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<Sort>("created_desc");
  const [q, setQ] = useState("");

  /* Seçim URL'de: ekibe link atılabilsin + geri tuşu çalışsın. Ayarlar'daki ?tab= deseniyle
     aynı (history.replaceState — yeni geçmiş kaydı bırakmaz, sunucu turu yok). */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("seg") as Segment | null;
    const so = p.get("sort") as Sort | null;
    const t = p.get("tur") as TypeFilter | null;
    if (s && SEGMENTS.some((x) => x.id === s)) setSeg(s);
    if (so && SORTS.some((x) => x.id === so)) setSort(so);
    if (t && ["all", "business", "individual"].includes(t)) setType(t);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (seg !== "all") p.set("seg", seg);
    if (sort !== "created_desc") p.set("sort", sort);
    if (type !== "all") p.set("tur", type);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [seg, sort, type]);

  const inSegment = useMemo(() => {
    return (p: AdminPerson, s: Segment) => {
      const l = personLifecycle(p, now);
      const banned = isBanned(p, now);
      switch (s) {
        case "all":
          return true;
        case "online":
          return isOnline(p, now);
        case "banned":
          return banned;
        case "zombie":
          return l.kind === "zombie";
        case "trial":
          return l.kind === "trial";
        case "ending":
          return l.kind === "trial" && l.days <= TRIAL_ENDING_DAYS;
        case "paid":
          return l.kind === "paid";
        case "free":
          return l.kind === "free";
        case "no_profile":
          return l.kind === "no_profile";
        case "new": {
          const d = relativeDays(p.created_at, now);
          return d != null && d <= NEW_WITHIN_DAYS;
        }
        case "lost": {
          const d = relativeDays(lastActivity(p), now);
          return d == null || d >= LOST_AFTER_DAYS;
        }
      }
    };
  }, [now]);

  const filtered = useMemo(() => {
    const query = q.trim().toLocaleLowerCase("tr");
    const rows = people.filter((p) => {
      if (!inSegment(p, seg)) return false;
      if (type === "business" && !hasBusiness(p)) return false;
      if (type === "individual" && hasBusiness(p)) return false;
      if (query) {
        // E-posta ile arama ŞART: destekte müşteri kendini e-postasıyla tanıtır.
        const hay = `${p.email} ${displayName(p)}`.toLocaleLowerCase("tr");
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    const t = now;
    const byDate = (a: string | null, b: string | null) => (b ?? "").localeCompare(a ?? "");
    return [...rows].sort((a, b) => {
      switch (sort) {
        case "created_asc":
          return byDate(b.created_at, a.created_at);
        case "seen_desc":
          return byDate(lastActivity(a), lastActivity(b));
        case "seen_asc":
          return byDate(lastActivity(b), lastActivity(a));
        case "trial_end": {
          // Denemesi olmayanlar sona; olanlar arasında en yakın biten önce.
          const da = trialDaysLeft(a, t);
          const db = trialDaysLeft(b, t);
          if (da == null && db == null) return byDate(a.created_at, b.created_at);
          if (da == null) return 1;
          if (db == null) return -1;
          return da - db;
        }
        case "email":
          return a.email.localeCompare(b.email, "tr");
        default:
          return byDate(a.created_at, b.created_at);
      }
    });
  }, [people, seg, type, q, sort, inSegment, now]);

  const segCount = (s: Segment) => people.filter((p) => inSegment(p, s)).length;
  const nProfiles = people.reduce((n, p) => n + p.profiles.length, 0);

  return (
    <div>
      <h1 className="admin-h1">Müşteriler</h1>
      <p className="admin-sub">
        {people.length.toLocaleString("tr-TR")} üye · {nProfiles.toLocaleString("tr-TR")} profil ·
        durum denemenin gerçek tarihinden hesaplanır, satıra tıkla.
      </p>

      <div className="admin-filters">
        <div className="admin-chip-row">
          {SEGMENTS.map((s) => {
            const c = segCount(s.id);
            if (s.id !== "all" && c === 0) return null; // boş segmenti gösterme (gürültü)
            return (
              <button
                key={s.id}
                type="button"
                className={`admin-chip${seg === s.id ? " active" : ""}${s.id === "zombie" ? " danger" : ""}`}
                onClick={() => setSeg(s.id)}
              >
                {s.label}
                <span className="admin-chip-count">{c}</span>
              </button>
            );
          })}
        </div>

        <div className="admin-chip-row">
          {(["all", "business", "individual"] as TypeFilter[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`admin-chip${type === t ? " active" : ""}`}
              onClick={() => setType(t)}
            >
              {t === "all" ? "Her tür" : t === "business" ? "İşletme" : "Bireysel"}
            </button>
          ))}
        </div>

        <label className="admin-search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="E-posta veya isimle ara…" />
        </label>

        <select
          className="admin-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sıralama"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>E-posta</th>
              <th>Ad</th>
              <th>Profiller</th>
              <th>Durum</th>
              <th>Son aktiflik</th>
              <th>Kayıt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty-cell">Bu filtrede üye yok.</td>
              </tr>
            ) : (
              filtered.slice(0, 300).map((p) => {
                const l = personLifecycle(p, now);
                const banned = isBanned(p, now);
                return (
                  <tr
                    key={p.id}
                    className="admin-row-click"
                    onClick={() => router.push(`/admin/musteriler/${p.id}`)}
                  >
                    <td className="admin-td-name">
                      {p.email}
                      {banned && (
                        <span className="badge red" style={{ marginLeft: 8 }}>
                          <Ban size={11} /> Askıda
                        </span>
                      )}
                    </td>
                    <td>{displayName(p)}</td>
                    <td>
                      {p.profiles.length === 0 ? (
                        <span className="admin-td-dim">—</span>
                      ) : (
                        <span className="admin-badge-row">
                          {p.profiles.map((pr) => (
                            <span
                              key={pr.id}
                              className={`badge ${pr.profile_type === "business" ? "blue" : "gray"}`}
                            >
                              {pr.profile_type === "business" ? "İşletme" : "Bireysel"}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${LIFECYCLE_META[l.kind].badge}`}>
                        {lifecycleLabel(l)}
                      </span>
                    </td>
                    <td className="admin-td-dim">
                      {isOnline(p, now) ? (
                        <span className="admin-online" title="Son 12 dakika içinde aktif">
                          <i /> şu an aktif
                        </span>
                      ) : (
                        relativeLabel(lastActivity(p), now)
                      )}
                    </td>
                    <td className="admin-td-dim">{fmtDate(p.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 300 && (
        <p className="admin-sub" style={{ marginTop: 10 }}>
          İlk 300 gösteriliyor ({filtered.length} eşleşme). Aramayı daraltabilirsin.
        </p>
      )}
      {truncated && (
        <p className="admin-sub" style={{ marginTop: 10 }}>
          ⚠️ Kullanıcı listesi 10.000&apos;de kırpıldı — bu ekran sayfalama ister.
        </p>
      )}
    </div>
  );
}
