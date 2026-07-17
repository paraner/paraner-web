"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Radio,
  Search,
  MapPin,
  Smartphone,
  Monitor,
  Receipt,
  FileText,
  LifeBuoy,
  UserPlus,
  Clock,
} from "lucide-react";
import type { LiveSnapshot, FeedEvent } from "../../../lib/adminLive";

/* Canlı Görünüm — "şu an sistemde ne oluyor" tek ekranda.
   Veri: lib/adminLive.getLiveSnapshot(). Tazeleme: kabuktaki LiveRefresh (30 sn).
   ⚠️ Zaman eğrisi (Shopify'daki oturum grafiği) YOK: sistem yalnız "en son ne zaman aktifti"yi
   tutuyor, geçmiş saklanmıyor → uydurmak yerine göstermiyoruz (bkz. lib/adminLive.ts). */

function agoLabel(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "az önce";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

const platformLabel = (p: string | null) =>
  p === "ios" ? "iPhone" : p === "android" ? "Android" : p === "web" ? "Web" : (p ?? "—");

const FEED_META: Record<FeedEvent["kind"], { icon: typeof Receipt; tone: string }> = {
  transaction: { icon: Receipt, tone: "tx" },
  invoice: { icon: FileText, tone: "inv" },
  ticket: { icon: LifeBuoy, tone: "tk" },
  signup: { icon: UserPlus, tone: "up" },
};

export default function CanliClient({ snap, now }: { snap: LiveSnapshot; now: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const people = useMemo(() => {
    const query = q.trim().toLocaleLowerCase("tr");
    if (!query) return snap.people;
    return snap.people.filter((p) =>
      `${p.email} ${p.name ?? ""} ${p.city ?? ""}`.toLocaleLowerCase("tr").includes(query),
    );
  }, [snap.people, q]);

  const kpis = [
    { label: "Şu an aktif", value: snap.counts.online, sub: "son 12 dakika", live: true },
    { label: "Son 1 saat", value: snap.counts.lastHour, sub: "sinyal veren kişi", live: false },
    { label: "Bugün aktif", value: snap.counts.today, sub: "son 24 saat", live: false },
    { label: "Bugün yeni profil", value: snap.counts.newToday, sub: "son 24 saat", live: false },
  ];

  const maxCity = Math.max(1, ...snap.cities.map((c) => c.n));

  return (
    <div>
      <h1 className="admin-h1">Canlı Görünüm</h1>
      <p className="admin-sub">
        Şu an uygulamayı kullananlar ve son 24 saatteki hareket. Kullanıcı uygulamayı açtığında
        5 dakikada bir sinyal gönderir; &quot;şu an aktif&quot; = son 12 dakikada sinyal veren.
        Sayfa 30 saniyede bir kendini tazeler.
      </p>

      <div className="admin-kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className={`admin-kpi${k.live ? " live" : ""}`}>
            <span className="admin-kpi-ic">
              {k.live ? <Radio size={18} /> : <Clock size={18} />}
            </span>
            <div className="admin-kpi-label">
              {k.live && k.value > 0 && <i className="admin-live-dot" />}
              {k.label}
            </div>
            <div className="admin-kpi-value">{k.value.toLocaleString("tr-TR")}</div>
            <div className="admin-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="live-grid">
        {/* --- Sol: şu an uygulamada --- */}
        <div className="admin-panel">
          <div className="admin-panel-head">
            <Radio size={16} /> Şu an uygulamada
            {snap.counts.online > 0 && <span className="admin-live-pill">{snap.counts.online}</span>}
            <label className="admin-search live-search">
              <Search size={14} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="E-posta, isim veya şehir…"
              />
            </label>
          </div>

          {snap.counts.online === 0 ? (
            <p className="live-empty">
              Şu anda kimse uygulamada değil.
              <span>Biri paneli veya mobil uygulamayı açtığında burada anında belirir.</span>
            </p>
          ) : people.length === 0 ? (
            <p className="live-empty">Aramanla eşleşen aktif kullanıcı yok.</p>
          ) : (
            <div className="live-people">
              {people.map((p) => (
                <button
                  key={p.userId}
                  type="button"
                  className="live-person"
                  onClick={() => router.push(`/admin/musteriler/${p.userId}`)}
                  title="Müşteri detayını aç"
                >
                  <span className="live-person-dot" />
                  <span className="live-person-main">
                    <b>{p.email}</b>
                    {p.name && <small>{p.name}</small>}
                  </span>
                  <span className="live-person-meta">
                    {p.city && (
                      <span>
                        <MapPin size={12} /> {p.city}
                      </span>
                    )}
                    <span>
                      {p.platform === "ios" || p.platform === "android" ? (
                        <Smartphone size={12} />
                      ) : (
                        <Monitor size={12} />
                      )}{" "}
                      {p.device || platformLabel(p.platform)}
                    </span>
                    <span className="live-person-ago">{agoLabel(p.lastSeen, now)}</span>
                  </span>
                </button>
              ))}
              {snap.hiddenPeople > 0 && (
                <p className="admin-td-dim" style={{ fontSize: 12, margin: "6px 0 0" }}>
                  +{snap.hiddenPeople} kişi daha aktif (ilk {snap.people.length} gösteriliyor).
                </p>
              )}
            </div>
          )}
        </div>

        {/* --- Sağ: konum + platform --- */}
        <div className="live-side">
          <div className="admin-panel">
            <div className="admin-panel-head">
              <MapPin size={16} /> Konuma göre
            </div>
            {snap.cities.length === 0 ? (
              <p className="admin-td-dim" style={{ fontSize: 13, margin: 0 }}>Aktif kullanıcı yok.</p>
            ) : (
              <div className="live-bars">
                {snap.cities.map((c) => (
                  <div key={c.city} className="live-bar-row">
                    <span className="live-bar-label">{c.city}</span>
                    <span className="live-bar-track">
                      <span className="live-bar-fill" style={{ width: `${(c.n / maxCity) * 100}%` }} />
                    </span>
                    <span className="live-bar-n">{c.n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-panel" style={{ marginTop: 16 }}>
            <div className="admin-panel-head">
              <Smartphone size={16} /> Platform
            </div>
            {snap.platforms.length === 0 ? (
              <p className="admin-td-dim" style={{ fontSize: 13, margin: 0 }}>Aktif kullanıcı yok.</p>
            ) : (
              <div className="live-chips">
                {snap.platforms.map((p) => (
                  <span key={p.platform} className="live-chip">
                    {p.platform === "ios" || p.platform === "android" ? (
                      <Smartphone size={13} />
                    ) : (
                      <Monitor size={13} />
                    )}
                    {platformLabel(p.platform)}
                    <b>{p.n}</b>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Canlı akış --- */}
      <div className="admin-panel" style={{ marginTop: 16 }}>
        <div className="admin-panel-head">
          <Clock size={16} /> Canlı akış
          <span className="admin-td-dim" style={{ fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
            son 24 saat
          </span>
        </div>
        {snap.feed.length === 0 ? (
          <p className="live-empty">
            Son 24 saatte hareket yok.
            <span>İşlem, fatura, destek talebi ve yeni kayıtlar burada anlık akar.</span>
          </p>
        ) : (
          <div className="live-feed">
            {snap.feed.map((e) => {
              const M = FEED_META[e.kind];
              const Icon = M.icon;
              return (
                <div key={e.id} className={`live-feed-row ${M.tone}`}>
                  <span className="live-feed-ic">
                    <Icon size={14} />
                  </span>
                  <span className="live-feed-main">
                    <b>{e.title}</b>
                    {e.detail && <small>{e.detail}</small>}
                  </span>
                  <span className="live-feed-ago">{agoLabel(e.at, now)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
