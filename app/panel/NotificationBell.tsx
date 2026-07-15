"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  // Menü body'ye portal ile taşınır (üst bar bir stacking context oluşturuyor → içeride
  // kalırsa z-index yükseltilse bile çekmece/modal ARKASINDA kalır). Konum trigger'dan.
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 10, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Pencere boyutu/scroll değişince menü trigger'la hizalı kalsın
    const reposition = () => {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 10, right: window.innerWidth - r.right });
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const rows = tab === "active" ? ACTIVE : HISTORY;

  return (
    <div className="notif-wrap">
      <button
        ref={btnRef}
        type="button"
        className={`topbar-icon-btn${open ? " active" : ""}`}
        aria-label="Bildirimler"
        title="Bildirimler"
        aria-expanded={open}
        onClick={toggle}
      >
        <BellIcon />
        {ACTIVE.length > 0 && <span className="notif-dot" aria-hidden />}
      </button>

      {open && pos && typeof document !== "undefined" &&
        createPortal(
        <div
          className="notif-menu"
          role="dialog"
          aria-label="Bildirimler"
          ref={menuRef}
          style={{ top: pos.top, right: pos.right }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}
