import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "../../../lib/supabase/server";
import { TICKET_STATUS_META, type Ticket } from "../../../lib/support";

function fmt(s: string | null) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Staff (agent/admin) RLS ile TÜM talepleri görür — service_role gerekmez.
// Thread şimdilik mevcut /panel/destek/[id] sayfasını kullanır (agent olarak yanıt verilir).
export default async function AdminDestekPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select("id, subject, status, last_message_at, user_id, priority, category, created_at, updated_at, assignee_id, currency")
    .order("last_message_at", { ascending: false })
    .limit(200);

  const tickets = (data as Ticket[]) ?? [];
  const open = tickets.filter((t) => t.status === "open" || t.status === "answered").length;

  return (
    <div>
      <h1 className="admin-h1">Destek Talepleri</h1>
      <p className="admin-sub">{tickets.length} talep · {open} açık/yanıt bekliyor.</p>

      <div className="admin-panel" style={{ padding: 0 }}>
        {tickets.length === 0 ? (
          <p className="admin-empty-cell" style={{ padding: 24 }}>Henüz talep yok.</p>
        ) : (
          <div className="admin-ticket-list">
            {tickets.map((t) => {
              const meta = TICKET_STATUS_META[t.status] ?? TICKET_STATUS_META.open;
              return (
                <Link key={t.id} href={`/panel/destek/${t.id}`} className="admin-ticket-row">
                  <div className="admin-ticket-main">
                    <div className="admin-ticket-subject">{t.subject}</div>
                    <div className="admin-ticket-meta">#{t.id.slice(0, 8)} · {fmt(t.last_message_at)}</div>
                  </div>
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  <ChevronRight size={16} className="admin-ticket-chevron" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
