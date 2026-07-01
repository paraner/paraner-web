import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import TekliflerClient, { type Quote } from "./TekliflerClient";

export default async function TekliflerPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const [{ data: quotes }, { data: allNums }] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_number, customer_name, grand_total, currency, status, valid_until, created_at"
      )
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(200),
    // Numarayı toplam SAYIdan değil, mevcut en büyük numaradan üret → teklif silinince
    // mükerrer numara oluşmaz. (String sıralama sayısal doğru değil, JS'te parse edilir.)
    supabase.from("quotes").select("quote_number").eq("user_id", profile.id),
  ]);

  const maxNum = (allNums ?? []).reduce((m, r) => {
    const n = parseInt(String(r.quote_number ?? "").replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);

  return (
    <TekliflerClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      quotes={(quotes as Quote[]) ?? []}
      nextNumber={maxNum + 1}
    />
  );
}
