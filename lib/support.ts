"use client";

// Destek/ticket veri katmanı (web) — mobil lib/support.ts ile AYNI tablolar ve sözleşme.
// Sahiplik auth.users.id (KİŞİ) — "her yerde profile.id" kuralının bilinçli istisnası:
// destek talebi kullanıcının HANGİ profilinde olursa olsun ortak görünür.
import { createClient } from "./supabase/client";

export type TicketStatus = "open" | "answered" | "resolved" | "closed";

export type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  priority: string;
  category: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: "user" | "agent";
  body: string;
  attachment_url: string | null;
  created_at: string;
};

export const TICKET_STATUS_META: Record<TicketStatus, { label: string; badge: string }> = {
  open: { label: "Açık", badge: "amber" },
  answered: { label: "Yanıtlandı", badge: "blue" },
  resolved: { label: "Çözüldü", badge: "green" },
  closed: { label: "Kapandı", badge: "gray" },
};

// Yeni talep = ticket + ilk kullanıcı mesajı. Thread'e gitmek için ticket id döner.
export async function createTicket(subject: string, body: string): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: user.id, subject: subject.trim() })
    .select("id")
    .single();
  if (error || !ticket) return null;
  await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    sender_type: "user",
    body: body.trim(),
  });
  return ticket.id as string;
}

// Mesaj gönder. senderType çağıran tarafından belirlenir (kullanıcı kendi ticket'ında 'user',
// destek personeli başkasının ticket'ında 'agent').
export async function sendMessage(
  ticketId: string,
  body: string,
  senderType: "user" | "agent"
): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: user.id,
    sender_type: senderType,
    body: body.trim(),
  });
  return !error;
}

export async function resolveTicket(ticketId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("support_tickets")
    .update({ status: "resolved" })
    .eq("id", ticketId);
  return !error;
}

// Thread realtime — mobil ile aynı desen (AccountStatusGuard kanonik): setAuth + postgres_changes INSERT.
export function subscribeMessages(
  ticketId: string,
  onInsert: (m: TicketMessage) => void
): () => void {
  const supabase = createClient();
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.access_token) supabase.realtime.setAuth(session.access_token);
  });
  const channel = supabase
    .channel(`ticket_${ticketId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticketId}` },
      (payload) => onInsert(payload.new as TicketMessage)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
