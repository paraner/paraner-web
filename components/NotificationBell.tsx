"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, CheckCheck, Trash2 } from "lucide-react";
import { BellIcon } from "./icons";
import { createClient } from "../lib/supabase/client";
import { TZ } from "../lib/format";
import { confirmDialog } from "../app/components/confirm";
import { showToast } from "../app/components/toast";

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
    return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", timeZone: TZ });
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
  const [islem, setIslem] = useState(false);

  /* Toplu işlemler (2026-07-22, Mehmet): tek tek tıklamadan okundu işaretle / temizle.
     SQL GEREKMEDİ — `notifications` üzerinde kullanıcının kendi satırları için UPDATE ve
     DELETE politikaları zaten var (sql/destek/destek-faz0.sql: notif_update / notif_delete).
     ⚠️ Her ikisi de `user_id = auth.uid()` ile sınırlı; RLS başkasının bildirimine
     dokundurmaz, o yüzden istemciden çağırmak güvenli. */
  async function tumunuOkundu() {
    const okunmamis = items.filter((n) => !n.is_read).map((n) => n.id);
    if (okunmamis.length === 0 || islem) return;
    setIslem(true);
    // İyimser: ekran hemen güncellensin (mesaj gönderme akışında öğrenilen ders).
    setItems((o) => o.map((n) => ({ ...n, is_read: true })));
    const supabase = createClient();
    /* ⚠️ `.select()` ŞART: PostgREST'te update/delete RLS yüzünden 0 SATIR etkilese bile
       HATA DÖNDÜRMEZ. `.select()` olmadan "başarılı" sanıp ekranı temizliyorduk; kullanıcı
       sayfayı yenileyince her şey geri geliyordu ve hiçbir uyarı yoktu (2026-07-22'de
       tam olarak bu yaşandı). Artık kaç satırın gerçekten değiştiğine bakıyoruz. */
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", okunmamis)
      .select("id");
    setIslem(false);
    if (error || !data || data.length === 0) {
      // Sessizce "oldu" gösterme — geri al ve söyle (denetim Y4/Y6 dersi).
      setItems((o) => o.map((n) => (okunmamis.includes(n.id) ? { ...n, is_read: false } : n)));
      showToast({
        title: "İşaretlenemedi",
        message: error?.message ?? "Kayıtlara erişilemedi (yetki).",
        variant: "error",
      });
    }
  }

  async function tumunuSil() {
    if (items.length === 0 || islem) return;
    const ok = await confirmDialog({
      title: "Tüm bildirimler silinsin mi?",
      message: "Bildirim listesi temizlenir. Talepler ve mesajlar SİLİNMEZ, yalnızca bildirimler.",
      confirmLabel: "Temizle",
      danger: true,
    });
    if (!ok) return;
    setIslem(true);
    const yedek = items;
    setItems([]);
    const supabase = createClient();
    // `.select()` gerekçesi yukarıdaki tumunuOkundu ile aynı: 0 satır ≠ hata.
    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .in("id", yedek.map((n) => n.id))
      .select("id");
    setIslem(false);
    if (error || !data || data.length === 0) {
      setItems(yedek);
      showToast({
        title: "Silinemedi",
        message: error?.message ?? "Kayıtlara erişilemedi (yetki).",
        variant: "error",
      });
    }
  }

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
              {/* Toplu işlemler — başlığın SAĞINDA, listeyle yer değiştirmez.
                  Yapacak iş yoksa buton hiç çizilmiyor (okunmamış yoksa "okundu işaretle"
                  anlamsız; liste boşsa "temizle" anlamsız). */}
              <div className="notif-head-actions">
                {unread.length > 0 && (
                  <button
                    type="button"
                    className="notif-act"
                    onClick={tumunuOkundu}
                    disabled={islem}
                    title="Tümünü okundu işaretle"
                  >
                    <CheckCheck size={14} /> Okundu
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    type="button"
                    className="notif-act notif-act-danger"
                    onClick={tumunuSil}
                    disabled={islem}
                    title="Tüm bildirimleri sil"
                  >
                    <Trash2 size={14} /> Temizle
                  </button>
                )}
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
