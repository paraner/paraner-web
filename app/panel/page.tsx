import { createClient } from "../../lib/supabase/server";
import { formatCurrency, formatDate } from "../../lib/format";
import { findCategory } from "../../lib/categories";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default async function GenelBakisPage() {
  const supabase = await createClient();

  // Aktif profil (id + para birimi gerekli)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, currency")
    .eq("is_active", true)
    .maybeSingle();

  const currency = profile?.currency ?? "TRY";

  // Bu ayın aralığı
  const now = new Date();
  const firstDay = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDay = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const monthLabel = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(now);

  let gelir = 0;
  let gider = 0;
  let recent: {
    id: string;
    title: string;
    amount: string;
    type: string;
    category: string | null;
    date: string;
    currency: string | null;
  }[] = [];

  if (profile?.id) {
    // Bu ayın işlemleri → KPI (sadece ana para birimi, transfer hariç)
    const { data: monthTx } = await supabase
      .from("transactions")
      .select("amount, type, currency")
      .eq("user_id", profile.id)
      .gte("date", firstDay)
      .lte("date", lastDay);

    for (const t of monthTx ?? []) {
      if (t.type === "transfer") continue;
      const cur = t.currency || currency;
      if (cur !== currency) continue; // ana para birimi dışı ayrı raporlanır, KPI'ya katma
      const amt = Number(t.amount) || 0;
      if (t.type === "income") gelir += amt;
      else if (t.type === "expense") gider += amt;
    }

    // Son işlemler (ay fark etmeksizin en yeni 8)
    const { data: recentTx } = await supabase
      .from("transactions")
      .select("id, title, amount, type, category, date, currency")
      .eq("user_id", profile.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

    recent = recentTx ?? [];
  }

  const net = gelir - gider;

  return (
    <>
      <h1 className="panel-h1">Genel Bakış</h1>
      <p className="panel-sub">{monthLabel}</p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Gelir</div>
          <div className="kpi-value pos">{formatCurrency(gelir, currency)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Gider</div>
          <div className="kpi-value neg">{formatCurrency(gider, currency)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Net</div>
          <div className={`kpi-value ${net >= 0 ? "pos" : "neg"}`}>
            {formatCurrency(net, currency)}
          </div>
        </div>
      </div>

      <div className="panel-section-title">Son İşlemler</div>
      {recent.length === 0 ? (
        <div className="panel-empty">Henüz işlem yok.</div>
      ) : (
        <div className="tx-list">
          {recent.map((t) => {
            const isIncome = t.type === "income";
            const isExpense = t.type === "expense";
            const sign = isIncome ? "+" : isExpense ? "−" : "";
            const cls = isIncome ? "pos" : isExpense ? "neg" : "";
            const cat = findCategory(t.category);
            return (
              <div key={t.id} className="tx-row">
                <div className="tx-main">
                  <span className="tx-dot" style={{ background: cat.color }} />
                  <div className="tx-left">
                    <span className="tx-title">{t.title}</span>
                    <span className="tx-meta">
                      {[cat.label, formatDate(t.date)].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </div>
                <span className={`tx-amount ${cls}`}>
                  {sign}
                  {formatCurrency(Number(t.amount) || 0, t.currency || currency)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
