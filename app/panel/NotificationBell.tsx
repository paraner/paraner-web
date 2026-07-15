"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { BellIcon } from "../../components/icons";

/* Üst bar bildirim çanı — açılır panel (iki sekme + boş durum).
   ⚠️ Kalıcı bildirim tablosu HENÜZ YOK (şema gerektirir, DB kararı bekliyor).
   Şimdilik "Geçmiş" sekmesinde statik bir başlangıç bildirimi var; "Bildirimler" (aktif)
   sekmesi gerçek akış gelene kadar boş. Gerçek sistem (notifications tablosu + realtime)
   eklenince ACTIVE/HISTORY buraya bağlanır. Dropdown deseni: Sidebar switcher ile aynı
   (ref + mousedown/Escape ile dışarı-tıkla-kapat). */

type Notif = { id: string; title: string; body: string; time?: string };

// Aktif (yeni) bildirimler — gerçek akış gelene kadar boş.
const ACTIVE: Notif[] = [];

// Geçmiş / sistem bildirimleri (statik başlangıç).
const HISTORY: Notif[] = [
  {
    id: "welcome",
    title: "Paraner'e hoş geldin",
    body: "İlk işlem, fatura veya cari kaydını girdiğinde finansal takibin başlar.",
  },
];

function EmptyState() {
  return (
    <div className="notif-empty">
      <span className="notif-empty-ic">
        <Bell size={22} />
      </span>
      <div className="notif-empty-title">Herhangi bir bildiriminiz yok</div>
      <div className="notif-empty-sub">Destek yanıtları ve duyurular burada listelenecek.</div>
    </div>
  );
}

function NotifRow({ n }: { n: Notif }) {
  return (
    <button type="button" className="notif-row">
      <span className="notif-row-ic">
        <Bell size={15} />
      </span>
      <div className="notif-row-main">
        <div className="notif-row-title">{n.title}</div>
        <div className="notif-row-body">{n.body}</div>
        {n.time && <div className="notif-row-time">{n.time}</div>}
      </div>
      <ChevronRight size={16} className="notif-row-chevron" />
    </button>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "history">("active");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rows = tab === "active" ? ACTIVE : HISTORY;

  return (
    <div className="notif-wrap" ref={ref}>
      <button
        type="button"
        className={`topbar-icon-btn${open ? " active" : ""}`}
        aria-label="Bildirimler"
        title="Bildirimler"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon />
        {ACTIVE.length > 0 && <span className="notif-dot" aria-hidden />}
      </button>

      {open && (
        <div className="notif-menu" role="dialog" aria-label="Bildirimler">
          <div className="notif-head">
            <span className="notif-head-ic">
              <Bell size={16} />
            </span>
            <div>
              <div className="notif-head-title">Bildirimler</div>
              <div className="notif-head-sub">Yeni bildirimler burada görünür</div>
            </div>
          </div>

          <div className="notif-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "active"}
              className={`notif-tab${tab === "active" ? " active" : ""}`}
              onClick={() => setTab("active")}
            >
              Bildirimler
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "history"}
              className={`notif-tab${tab === "history" ? " active" : ""}`}
              onClick={() => setTab("history")}
            >
              Geçmiş bildirimler
            </button>
          </div>

          <div className="notif-body">
            {rows.length === 0 ? (
              <EmptyState />
            ) : (
              rows.map((n) => <NotifRow key={n.id} n={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
