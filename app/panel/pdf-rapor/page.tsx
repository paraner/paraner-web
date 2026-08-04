import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import { getCustomCategories } from "../../../lib/customCategoriesServer";
import { bugunISO } from "../../../lib/format";
import PdfRaporClient, { type RaporTx, type RaporFatura } from "./PdfRaporClient";

// Mobil `pdf-report.tsx` karşılığı. Mobilde expo-print ile PDF üretiliyor;
// web'de aynı çıktı tarayıcının "Yazdır → PDF olarak kaydet" akışıyla alınır
// (ek bağımlılık yok, aynı bilgi). Ay gezinmesi istemcide olduğu için yıl başından
// tek sorguda çekiyoruz — ay değiştirmek ağ turu istemesin.
export default async function PdfRaporPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const yilBasi = `${new Date().getFullYear()}-01-01`;

  // company_name paylaşılan getProfiles() select'ine EKLENMEZ (her panel sayfasında
  // çalışıyor) — faturalar sayfasındaki gibi ayrı ve paralel sorgu.
  const [{ data: tx }, { data: fat }, { data: firma }, ozelKategoriler] = await Promise.all([
    supabase
      .from("transactions")
      .select("title, amount, type, category, currency, date")
      .eq("user_id", profile.id)
      .neq("type", "transfer")
      .gte("date", yilBasi)
      .order("date", { ascending: false })
      .limit(8000),
    supabase
      .from("invoices")
      .select("type, amount, vat_amount, currency, invoice_date, customer_name, invoice_number")
      .eq("user_id", profile.id)
      .gte("invoice_date", yilBasi)
      .order("invoice_date", { ascending: false })
      .limit(2000),
    supabase.from("profiles").select("company_name").eq("id", profile.id).single(),
    getCustomCategories(profile.id),
  ]);

  return (
    <PdfRaporClient
      currency={profile.currency ?? "TRY"}
      firmaAdi={
        (firma as { company_name: string | null } | null)?.company_name ||
        profile.profile_name ||
        profile.name ||
        "İşletmem"
      }
      transactions={(tx as RaporTx[]) ?? []}
      invoices={(fat as RaporFatura[]) ?? []}
      customCategories={ozelKategoriler}
      bugun={bugunISO()}
    />
  );
}
