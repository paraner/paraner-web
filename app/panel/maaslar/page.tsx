import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import MaaslarClient, { type SalaryPayment, type EmployeeRef } from "./MaaslarClient";

export default async function MaaslarPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name")
    .eq("user_id", profile.id)
    .order("name", { ascending: true });

  const empList = (employees as EmployeeRef[]) ?? [];
  const ids = empList.map((e) => e.id);

  let payments: SalaryPayment[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("salary_payments")
      .select("id, employee_id, amount, period, note, date")
      .in("employee_id", ids)
      .order("date", { ascending: false })
      .limit(200);
    payments = (data as SalaryPayment[]) ?? [];
  }

  return (
    <MaaslarClient
      currency={profile.currency ?? "TRY"}
      employees={empList}
      payments={payments}
    />
  );
}
