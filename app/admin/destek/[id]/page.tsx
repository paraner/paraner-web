import { createClient } from "../../../../lib/supabase/server";
import ThreadClient from "../../../panel/destek/[id]/ThreadClient";
import { TICKET_COLS, type Ticket, type TicketMessage } from "../../../../lib/supportShared";

export const metadata = { title: "Destek talebi", robots: { index: false, follow: false } };

/* Admin shell içindeki talep thread'i. /panel/destek/[id] ile AYNI ThreadClient'ı kullanır
   (tek kaynak); fark: admin sidebar'ı korunur + geri oku /admin/destek'e döner.
   Ayrı sayfa OLMASININ sebebi: admin.* host'unda /panel → app.paraner.com'a redirect edilir,
   yani ekip üyesi talebe tıklayınca admin panelinden düşerdi.
   Yetki: layout zaten staff guard'ı yapıyor; veri RLS ile (agent/admin tüm talepleri görür). */
export default async function AdminTicketThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [{ data: ticket }, { data: messages }] = await Promise.all([
    supabase
      .from("support_tickets")
      .select(TICKET_COLS)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ticket_messages")
      .select("id, ticket_id, sender_id, sender_type, body, attachment_url, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!ticket) {
    return <div className="panel-empty">Talep bulunamadı ya da erişimin yok.</div>;
  }

  // Buraya yalnız staff girebilir (layout guard) → isAgent sabit true.
  return (
    <ThreadClient
      ticket={ticket as Ticket}
      initialMessages={(messages as TicketMessage[]) ?? []}
      userId={userId}
      isAgent
      backHref="/admin/destek"
    />
  );
}
