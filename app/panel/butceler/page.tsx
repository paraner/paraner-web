import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import ButcelerClient, { type Budget } from "./ButcelerClient";

export default async function ButcelerPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}-${pad(m + 1)}-01`;
  const last = new Date(y, m + 1, 0);
  const end = `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;

  const [{ data: budgets }, { data: tx }] = await Promise.all([
    supabase
      .from("category_budgets")
      .select("id, category, monthly_limit")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("category, amount")
      .eq("user_id", profile.id)
      .eq("type", "expense")
      .gte("date", start)
      .lte("date", end)
      .limit(2000),
  ]);

  // Bu ay kategori bazında harcama (kategori id'sine göre)
  const spent: Record<string, number> = {};
  for (const t of (tx as { category: string | null; amount: string | number }[]) ?? []) {
    const key = t.category ?? "";
    spent[key] = (spent[key] || 0) + (Number(t.amount) || 0);
  }

  return (
    <ButcelerClient
      profileId={profile.id}
      currency={profile.currency ?? "TRY"}
      budgets={(budgets as Budget[]) ?? []}
      spent={spent}
    />
  );
}
