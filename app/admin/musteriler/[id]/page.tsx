import { notFound } from "next/navigation";
import { createAdminClient, hasAdminKey } from "../../../../lib/supabase/admin";
import { getPerson } from "../../../../lib/adminUsers";
import { requireAdminPage } from "../../../../lib/adminGuard";
import AdminKeyNotice from "../../AdminKeyNotice";
import MusteriDetayClient, { type ProfileUsage } from "./MusteriDetayClient";

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
  // Profil başına kullanım — hepsi paralel (ardışık await = boşuna ağ turu).
  const usage: ProfileUsage[] = await Promise.all(
    person.profiles.map(async (p) => ({ profileId: p.id, ...(await usageOf(admin, p.id)) })),
  );

  return <MusteriDetayClient person={person} usage={usage} now={Date.now()} />;
}
