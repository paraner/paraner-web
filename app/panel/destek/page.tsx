import { createClient } from "../../../lib/supabase/server";
import DestekClient from "./DestekClient";
import { TICKET_COLS, type Ticket } from "../../../lib/supportShared";

export const metadata = { title: "Destek", robots: { index: false, follow: false } };

export default async function DestekPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  // Kendi taleplerim + agent mıyım (paralel)
  const [{ data: myTickets }, { data: roles }] = await Promise.all([
    supabase
      .from("support_tickets")
      .select(TICKET_COLS)
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false })
      .limit(50),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const isAgent = (roles ?? []).some((r) => ["agent", "admin"].includes((r as { role: string }).role));

  // Agent isem TÜM açık talepler (gelen kutusu). RLS zaten agent'a hepsini açıyor.
  let inbox: Ticket[] = [];
  if (isAgent) {
    const { data } = await supabase
      .from("support_tickets")
      .select(TICKET_COLS)
      .order("last_message_at", { ascending: false })
      .limit(100);
    inbox = (data as Ticket[]) ?? [];
  }

  return (
    <DestekClient
      userId={userId}
      isAgent={isAgent}
      myTickets={(myTickets as Ticket[]) ?? []}
      inbox={inbox}
    />
  );
}
