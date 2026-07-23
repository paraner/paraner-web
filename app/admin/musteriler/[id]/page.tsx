import { notFound } from "next/navigation";
import { createAdminClient, hasAdminKey } from "../../../../lib/supabase/admin";
import { getPerson } from "../../../../lib/adminUsers";
import { requireAdminPage } from "../../../../lib/adminGuard";
import { TICKET_COLS, type Ticket } from "../../../../lib/supportShared";
import AdminKeyNotice from "../../AdminKeyNotice";
import MusteriDetayClient, { type ProfileUsage } from "./MusteriDetayClient";

/* Kişinin destek talepleri, en yeni mesaj üstte. `support_tickets.user_id` = KİŞİ id'si
   (auth.users) — profil id'si DEĞİL (destek/page.tsx:18 ile aynı gerçek). İndeks hazır:
   support_tickets_user_idx (user_id, last_message_at desc) — sql/destek/destek-faz0.sql:22.
   ⚠️ Bu sayfa zaten service_role client kullanıyor; talepleri de onunla çekiyoruz (RLS
   bypass) — ama sayfa requireAdminPage ile korunuyor, yani yalnız yönetici buraya girer. */
const TICKET_LIMIT = 20;
async function ticketsOf(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
): Promise<{ tickets: Ticket[]; truncated: boolean }> {
  const { data } = await admin
    .from("support_tickets")
    .select(TICKET_COLS)
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(TICKET_LIMIT + 1); // +1: kırpma olup olmadığını anlamak için bir fazla iste
  const rows = (data as Ticket[]) ?? [];
  return { tickets: rows.slice(0, TICKET_LIMIT), truncated: rows.length > TICKET_LIMIT };
}

export const metadata = { title: "Müşteri detayı", robots: { index: false, follow: false } };

/* Bir profilin kullanım özeti. transactions/invoices `user_id` = PROFİL id'si
   (kişi id'si değil — projenin genel kuralı, bkz. CLAUDE.md). */
async function usageOf(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  profileId: string,
): Promise<Omit<ProfileUsage, "profileId">> {
  const count = (table: string) =>
    admin.from(table).select("*", { count: "exact", head: true }).eq("user_id", profileId);

  const [tx, inv, acc, lastTx] = await Promise.all([
    count("transactions"),
    count("invoices"),
    count("bank_accounts"), // ⚠️ "accounts" DEĞİL — tablo adı bank_accounts
    admin
      .from("transactions")
      .select("date")
      .eq("user_id", profileId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    transactions: tx.count ?? 0,
    invoices: inv.count ?? 0,
    accounts: acc.count ?? 0,
    lastActivity: (lastTx.data as { date?: string } | null)?.date ?? null,
  };
}

export default async function MusteriDetayPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage(); // agent müşteri detayını (+ silme butonunu) göremez
  if (!hasAdminKey()) return <AdminKeyNotice />;
  const { id } = await params;

  const person = await getPerson(id);
  if (!person) notFound();

  const admin = createAdminClient()!;
  // Profil kullanımları + destek talepleri hepsi PARALEL (ardışık await = boşuna ağ turu).
  const [usage, ticketData] = await Promise.all([
    Promise.all(
      person.profiles.map(async (p) => ({ profileId: p.id, ...(await usageOf(admin, p.id)) })),
    ),
    ticketsOf(admin, person.id),
  ]);

  return (
    <MusteriDetayClient
      person={person}
      usage={usage}
      tickets={ticketData.tickets}
      ticketsTruncated={ticketData.truncated}
      now={Date.now()}
    />
  );
}
