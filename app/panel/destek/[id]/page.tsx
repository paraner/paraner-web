import { createClient } from "../../../../lib/supabase/server";
import ThreadClient from "./ThreadClient";
import type { Ticket, TicketMessage } from "../../../../lib/support";

export const metadata = { title: "Destek talebi", robots: { index: false, follow: false } };

export default async function TicketThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [{ data: ticket }, { data: messages }, { data: roles }] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("id, user_id, subject, status, priority, category, assignee_id, created_at, updated_at, last_message_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ticket_messages")
      .select("id, ticket_id, sender_id, sender_type, body, attachment_url, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  // RLS: sahibi değilsen ve agent değilsen ticket null döner
  if (!ticket) {
    return <div className="panel-empty">Talep bulunamadı ya da erişimin yok.</div>;
  }

  const isAgent = (roles ?? []).some((r) => ["agent", "admin"].includes((r as { role: string }).role));

  return (
    <ThreadClient
      ticket={ticket as Ticket}
      initialMessages={(messages as TicketMessage[]) ?? []}
      userId={userId}
      isAgent={isAgent}
    />
  );
}
