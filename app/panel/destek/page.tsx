import { createClient } from "../../../lib/supabase/server";
import DestekClient from "./DestekClient";
import { TICKET_COLS, type Ticket } from "../../../lib/supportShared";

export const metadata = { title: "Destek", robots: { index: false, follow: false } };

/* MÜŞTERİ destek sayfası — yalnız "Talep Oluştur" + "Taleplerim".
   ⚠️ Agent "Gelen Talepler" kutusu 2026-07-18'de BURADAN KALDIRILDI (Mehmet fark etti):
   destek sistemi kurulurken (16.07) admin paneli henüz yoktu, agent'ın çalışabileceği tek
   yer müşteri paneliydi. Artık admin.paraner.com/admin/destek var → ekran ÇİFT'ti.
   Güvenlik açığı değildi (RLS yalnız agent'a açıyordu) ama iç ekip aracı müşteri ürününün
   içinde duruyordu: destek personeli kendi Paraner hesabına girince tüm müşterilerin
   taleplerini kendi panelinde görüyordu. Agent işi tamamen /admin/destek'te.
   Sonuç: bu sayfa artık rol sorgusu da yapmıyor (bir sorgu eksildi). */
export default async function DestekPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const { data: myTickets } = await supabase
    .from("support_tickets")
    .select(TICKET_COLS)
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(50);

  return <DestekClient userId={userId} myTickets={(myTickets as Ticket[]) ?? []} />;
}
