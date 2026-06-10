import { createClient } from "../../lib/supabase/server";
import { getActiveProfile } from "../../lib/supabase/profile";
import { formatCurrency, formatDate } from "../../lib/format";
import { ymd } from "../../lib/date";
import { findCategory } from "../../lib/categories";
import Sparkline from "../../components/ui/Sparkline";

// Bir ay için gelir/gider toplamı (ana para birimi, transfer hariç)
function sumMonth(
  rows: { amount: string | number; type: string; currency: string | null }[],
  mainCurrency: string
) {
  let gelir = 0;
  let gider = 0;
  for (const t of rows) {
    if (t.type === "transfer") continue;
    if ((t.currency || mainCurrency) !== mainCurrency) continue;
    const amt = Number(t.amount) || 0;
    if (t.type === "income") gelir += amt;
    else if (t.type === "expense") gider += amt;
  }
  return { gelir, gider };
}

// Geçen aya göre değişim. good: null → renksiz/karşılaştırma yok, suffix: "geçen aya göre" eklensin mi
function deltaInfo(cur: number, prev: number, goodWhenUp: boolean) {
  if (prev === 0) {
    if (cur === 0) return null;
    return { text: "geçen ay kayıt yok", good: null as boolean | null, suffix: false };
  }
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const up = pct >= 0;
  return {
    text: `${up ? "▲" : "▼"} %${Math.abs(pct).toFixed(0)}`,
    good: (up === goodWhenUp) as boolean | null,
    suffix: true,
  };
}

export default async function GenelBakisPage() {
  const supabase = await createClient();

  // Aktif profil — layout ile aynı render'da paylaşılır (cache), tekrar sorgu yok
  const profile = await getActiveProfile();

  const currency = profile?.currency ?? "TRY";

  // Tarih aralıkları: bu ay + geçen ay
  const now = new Date();
  const firstDay = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDay = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const prevFirst = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const prevLast = ymd(new Date(now.getFullYear(), now.getMonth(), 0));
  const monthLabel = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(now);

  let gelir = 0;
  let gider = 0;
  let prevGelir = 0;
  let prevGider = 0;
  const daysElapsed = now.getDate();
  const incSeries: number[] = [];
  const expSeries: number[] = [];
  const netSeries: number[] = [];
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
    const [{ data: monthTx }, { data: prevTx }, { data: recentTx }] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("amount, type, currency, date")
          .eq("user_id", profile.id)
          .gte("date", firstDay)
          .lte("date", lastDay),
        supabase
          .from("transactions")
          .select("amount, type, currency")
          .eq("user_id", profile.id)
          .gte("date", prevFirst)
          .lte("date", prevLast),
        supabase
          .from("transactions")
          .select("id, title, amount, type, category, date, currency")
          .eq("user_id", profile.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    ({ gelir, gider } = sumMonth(monthTx ?? [], currency));
    ({ gelir: prevGelir, gider: prevGider } = sumMonth(prevTx ?? [], currency));
    recent = recentTx ?? [];

    // Günlük birikimli seri (sparkline) — ayın 1'inden bugüne
    const dayInc = new Array(daysElapsed).fill(0);
    const dayExp = new Array(daysElapsed).fill(0);
    for (const t of monthTx ?? []) {
      if (t.type === "transfer") continue;
      if ((t.currency || currency) !== currency) continue;
      const day = Number(String(t.date).slice(8, 10)); // YYYY-MM-DD → gün
      if (day < 1 || day > daysElapsed) continue;
      const amt = Number(t.amount) || 0;
      if (t.type === "income") dayInc[day - 1] += amt;
      else if (t.type === "expense") dayExp[day - 1] += amt;
    }
    let ci = 0;
    let ce = 0;
    for (let i = 0; i < daysElapsed; i++) {
      ci += dayInc[i];
      ce += dayExp[i];
      incSeries.push(ci);
      expSeries.push(ce);
      netSeries.push(ci - ce);
    }
  }

  const net = gelir - gider;
  const prevNet = prevGelir - prevGider;

  const metrics = [
    {
      key: "gelir",
      label: "Gelir",
      value: gelir,
      cls: "pos",
      color: "var(--teal)",
      series: incSeries,
      delta: deltaInfo(gelir, prevGelir, true),
    },
    {
      key: "gider",
      label: "Gider",
      value: gider,
      cls: "neg",
      color: "var(--danger)",
      series: expSeries,
      delta: deltaInfo(gider, prevGider, false),
    },
    {
      key: "net",
      label: "Net",
      value: net,
      cls: net >= 0 ? "pos" : "neg",
      color: net >= 0 ? "var(--teal)" : "var(--danger)",
      series: netSeries,
      delta: deltaInfo(net, prevNet, true),
    },
  ];

  return (
    <>
      <div className="ov-header">
        <h1>Genel Bakış</h1>
        <span className="ov-period">{monthLabel}</span>
      </div>

      <div className="metric-row">
        {metrics.map((m) => (
          <div key={m.key} className="metric">
            <div className="metric-label">
              {m.label}
              <svg viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1.5 6 6.5l5-5" />
              </svg>
            </div>
            <div className={`metric-value ${m.cls}`}>
              {formatCurrency(m.value, currency)}
            </div>
            <div className="metric-delta">
              {m.delta ? (
                <>
                  <span
                    className={
                      m.delta.good === null ? "" : m.delta.good ? "up" : "down"
                    }
                  >
                    {m.delta.text}
                  </span>
                  {m.delta.suffix ? " geçen aya göre" : ""}
                </>
              ) : (
                "—"
              )}
            </div>
            <div className="metric-spark">
              <Sparkline data={m.series} color={m.color} />
            </div>
          </div>
        ))}
      </div>

      <div className="ov-section-head">
        <h2>Son İşlemler</h2>
        <a href="/panel/islemler" className="ov-link">
          Tümü →
        </a>
      </div>
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
