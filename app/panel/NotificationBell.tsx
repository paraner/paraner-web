"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { BellIcon } from "../../components/icons";
import { createClient } from "../../lib/supabase/client";

/* Üst bar bildirim çanı — gerçek `notifications` tablosu (Faz 0 destek sistemi).
   Fetch + Realtime INSERT (agent yanıtı → DB trigger → notifications → buraya anlık düşer).
   Menü body'ye portal ile taşınır (üst bar stacking context'inden çıksın → çekmece/modal önünde). */

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  data: { ticket_id?: string } | null;
  is_read: boolean;
  created_at: string;
};

function timeAgo(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "az önce";
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function EmptyState() {
  return (
    <div className="notif-empty">
      <span className="notif-empty-ic"><Bell size={22} /></span>
      <div className="notif-empty-title">Herhangi bir bildiriminiz yok</div>
      <div className="notif-empty-sub">Destek yanıtları ve duyurular burada listelenecek.</div>
    </div>
  );
}

export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch + Realtime
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, data, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (active) setItems((data as Notif[]) ?? []);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel(`notif_${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => setItems((prev) => [payload.new as Notif, ...prev])
        )
        .subscribe();
    })();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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

  const unread = items.filter((i) => !i.is_read);
  const rows = tab === "active" ? unread : items;

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 10, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  }

  async function openNotif(n: Notif) {
    if (!n.is_read) {
      const supabase = createClient();
      supabase.from("notifications").update({ is_read: true }).eq("id", n.id).then(() => {});
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    setOpen(false);
    const link = n.link || (n.data?.ticket_id ? `/panel/destek/${n.data.ticket_id}` : null);
    if (link) router.push(link);
  }

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
        {unread.length > 0 && <span className="notif-dot" aria-hidden />}
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
              <span className="notif-head-ic"><Bell size={16} /></span>
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
                Bildirimler{unread.length > 0 ? ` (${unread.length})` : ""}
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
                rows.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`notif-row${n.is_read ? "" : " unread"}`}
                    onClick={() => openNotif(n)}
                  >
                    <span className="notif-row-ic"><Bell size={15} /></span>
                    <div className="notif-row-main">
                      <div className="notif-row-title">{n.title}</div>
                      {n.body && <div className="notif-row-body">{n.body}</div>}
                      <div className="notif-row-time">{timeAgo(n.created_at)}</div>
                    </div>
                    <ChevronRight size={16} className="notif-row-chevron" />
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
