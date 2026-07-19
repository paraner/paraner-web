"use client";

// Destek/ticket veri katmanı (web) — mobil lib/support.ts ile AYNI tablolar ve sözleşme.
// Sahiplik auth.users.id (KİŞİ) — "her yerde profile.id" kuralının bilinçli istisnası:
// destek talebi kullanıcının HANGİ profilinde olursa olsun ortak görünür.
import { createClient } from "./supabase/client";

/* Tipler + sabitler `supportShared.ts`'te (istemci-DEĞİL modül) — sunucu sayfaları oradan
   okumalı, buradan DEĞİL: "use client" modülünden sunucuya import edilen sabit, değer değil
   istemci-referansı proxy'si olarak gelir ve kullanıldığı yerde patlar.
   Buradaki re-export yalnız İSTEMCİ bileşenlerinin tek yerden import edebilmesi için. */
export {
  TICKET_COLS,
  TICKET_STATUS_META,
  DEPARTMENTS,
  DEPARTMENT_META,
  departmentLabel,
  type TicketStatus,
  type Ticket,
  type TicketMessage,
  type Department,
} from "./supportShared";
import { DEPARTMENTS, type TicketStatus, type TicketMessage, type Department } from "./supportShared";

// Yeni talep = ticket + ilk kullanıcı mesajı. Thread'e gitmek için ticket id döner.
/* Talep aç. `department` 2026-07-18'de eklendi (sql/destek/destek-departman.sql):
   hangi ekibe düşeceğini müşteri seçiyor, trigger o ekibe + admin'lere bildirim atıyor.
   `priority` müşteriye SORULMUYOR — departmanın varsayılanından türetiliyor
   (herkes "yüksek" seçerse alan bilgi taşımaz olur; agent panelden değiştirir). */
export async function createTicket(
  subject: string,
  body: string,
  department: Department = "teknik",
): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const oncelik = DEPARTMENTS.find((d) => d.id === department)?.oncelik ?? "normal";
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: user.id, subject: subject.trim(), department, priority: oncelik })
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
