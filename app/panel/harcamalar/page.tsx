import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import HarcamalarClient, { type Expense, type EmployeeRef } from "./HarcamalarClient";

export default async function HarcamalarPage() {
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

  let expenses: Expense[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("employee_expenses")
      .select("id, employee_id, title, amount, date")
      .in("employee_id", ids)
      .order("date", { ascending: false })
      .limit(200);
    expenses = (data as Expense[]) ?? [];
  }

  return (
    <HarcamalarClient
      currency={profile.currency ?? "TRY"}
      employees={empList}
      expenses={expenses}
    />
  );
}
