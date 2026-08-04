import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import SgkClient, { type MaasOdemesi } from "./SgkClient";

/* Mobil `sgk-declarations.tsx` karşılığı.
   ⚠️ 04.08.2026 — MOBİLDEKİ HATA BURAYA TAŞINMIŞTI, DÜZELTİLDİ:
   Mobil ekran prim tahminini `employees.salary` üzerinden hesaplıyor. Ama o kolonu
   YAZAN HİÇBİR ARAYÜZ YOK — ne web'de (çalışan formu: ad/pozisyon/telefon/e-posta),
   ne mobilde (`employee-expenses.tsx` `Employee` arayüzünde `salary` alanı bile yok,
   yalnız ödemelerden türeyen `total_salary` var). Sonuç: kolon her hesapta 0.00 →
   prim tahmini herkeste kalıcı olarak ₺0,00. Canlı testte doğrulandı: hesapta
   ₺122.258'lik gerçek maaş ödemesi varken SGK sayfası ₺0 gösteriyordu.
   ÇÖZÜM: gerçekten girilen veriden besleniyoruz → `salary_payments` (seçili ay).
   Sayfada zaten ay gezinmesi var, birebir uyuyor. Mobil de aynı şekilde düzeltilmeli. */
export default async function SgkPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", profile.id)
    .limit(500);

  const ids = (employees as { id: string }[] | null)?.map((e) => e.id) ?? [];

  // Ay gezinmesi istemcide → geçen yıl başından tek sorguda çekip client'ta filtreliyoruz.
  let odemeler: MaasOdemesi[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("salary_payments")
      .select("amount, date")
      .in("employee_id", ids)
      .gte("date", `${new Date().getFullYear() - 1}-01-01`)
      .limit(2000);
    odemeler = (data as MaasOdemesi[]) ?? [];
  }

  return (
    <SgkClient
      currency={profile.currency ?? "TRY"}
      calisanSayisi={ids.length}
      odemeler={odemeler}
    />
  );
}
