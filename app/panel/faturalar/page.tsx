import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import FaturalarClient, { type Invoice } from "./FaturalarClient";
import type { PrintSeller } from "../../../components/InvoicePrint";

export default async function FaturalarPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const supabase = await createClient();

  const { type } = await searchParams;
  const initialFilter: "all" | "income" | "expense" =
    type === "income" ? "income" : type === "expense" ? "expense" : "all";

  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  // Faturalar + satıcı (kendi firma) bilgileri PARALEL. Satıcı alanları yazdırılabilir fatura
  // için lazım; paylaşılan getProfiles() select'ine EKLENMEDİ (her panel sayfasında çalışıyor).
  const [{ data: invoices }, { data: seller }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, customer_name, customer_tax_number, customer_address, note, subtotal, vat_rate, vat_amount, amount, currency, payment_status, status, paid_amount, type, invoice_date, due_date, created_at"
      )
      .eq("user_id", profile.id)
      .order("invoice_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select(
        "company_name, tax_number, tax_office, company_address, company_email, phone, iban, website, mersis_no, company_logo_url, profile_name"
      )
      .eq("id", profile.id)
      .single(),
  ]);

  return (
    <FaturalarClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      invoicePrefix={profile.invoice_prefix ?? "MGZR"}
      invoiceNextNumber={profile.invoice_next_number ?? 1}
      invoices={(invoices as Invoice[]) ?? []}
      seller={(seller as PrintSeller) ?? null}
      initialFilter={initialFilter}
    />
  );
}
