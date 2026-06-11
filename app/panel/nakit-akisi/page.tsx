import { createClient } from "../../../lib/supabase/server";
import { getActiveProfile } from "../../../lib/supabase/profile";
import { formatCurrency } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";

const MONTHS_TR = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

export default async function NakitAkisiPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  if (!profile?.id) {
    return <div className="panel-empty">Profil bulunamadı.</div>;
  }
  const currency = profile.currency ?? "TRY";

  // Son 6 ayın başlangıcı
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startStr = `${startMonth.getFullYear()}-${pad(startMonth.getMonth() + 1)}-01`;

  const { data: tx } = await supabase
    .from("transactions")
    .select("amount, type, currency, date")
    .eq("user_id", profile.id)
    .neq("type", "transfer")
    .gte("date", startStr)
    .limit(5000);

  // Ay anahtarları (son 6 ay)
  const buckets: { key: string; label: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: `${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`,
      income: 0,
      expense: 0,
    });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));

  for (const t of (tx as { amount: string | number; type: string; currency: string | null; date: string | null }[]) ?? []) {
    if ((t.currency || currency) !== currency) continue;
    if (!t.date) continue;
    const key = t.date.slice(0, 7);
    const i = idx.get(key);
    if (i === undefined) continue;
    const amt = Number(t.amount) || 0;
    if (t.type === "income") buckets[i].income += amt;
    else if (t.type === "expense") buckets[i].expense += amt;
  }

  const maxVal = Math.max(1, ...buckets.map((b) => Math.max(b.income, b.expense)));
  const totalIn = buckets.reduce((s, b) => s + b.income, 0);
  const totalOut = buckets.reduce((s, b) => s + b.expense, 0);
  const net = totalIn - totalOut;

  return (
    <>
      <PageHead title="Nakit Akışı Analizi" sub="Son 6 ayın gelir / gider akışı" />

      <div className="total-banner">
        <div className="t-item">
          <div className="t-label">6 Aylık Giriş</div>
          <div className="t-value">{formatCurrency(totalIn, currency)}</div>
        </div>
        <div className="t-item">
          <div className="t-label">6 Aylık Çıkış</div>
          <div className="t-value" style={{ color: "var(--danger)" }}>
            {formatCurrency(totalOut, currency)}
          </div>
        </div>
        <div className="t-item">
          <div className="t-label">Net Akış</div>
          <div className="t-value" style={{ color: net >= 0 ? "var(--teal)" : "var(--danger)" }}>
            {formatCurrency(net, currency)}
          </div>
        </div>
      </div>

      <div className="cf-list">
        {buckets.map((b) => {
          const bnet = b.income - b.expense;
          return (
            <div key={b.key} className="cf-row">
              <div className="cf-month">{b.label}</div>
              <div className="cf-bars">
                <div className="cf-bar-track">
                  <div
                    className="cf-bar in"
                    style={{ width: `${(b.income / maxVal) * 100}%` }}
                  />
                </div>
                <div className="cf-bar-track">
                  <div
                    className="cf-bar out"
                    style={{ width: `${(b.expense / maxVal) * 100}%` }}
                  />
                </div>
              </div>
              <div className="cf-net" style={{ color: bnet >= 0 ? "var(--teal)" : "var(--danger)" }}>
                {bnet >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(bnet), currency)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="cf-legend">
        <span><span className="cf-dot in" /> Gelir</span>
        <span><span className="cf-dot out" /> Gider</span>
      </div>
    </>
  );
}
