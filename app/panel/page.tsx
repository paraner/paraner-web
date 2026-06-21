import { createClient } from "../../lib/supabase/server";
import { getActiveProfile } from "../../lib/supabase/profile";
import OnboardingModal from "./OnboardingModal";
import { formatCurrency, formatDate } from "../../lib/format";
import { ymd } from "../../lib/date";
import { findCategory } from "../../lib/categories";
import { CategoryIcon } from "../../lib/categoryIcons";
import Sparkline from "../../components/ui/Sparkline";
import LineChart, { type LinePoint } from "../../components/ui/LineChart";
import Donut, { type DonutSeg } from "../../components/ui/Donut";
import AccountCard from "../../components/ui/AccountCard";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  Plus,
  Clock,
} from "lucide-react";

const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

type TxRow = {
  id: string;
  title: string;
  amount: string | number;
  type: string;
  category: string | null;
  date: string;
  currency: string | null;
  bank_account_id: string | null;
  created_at: string | null;
};

// Geçen aya göre değişim çipi
function deltaInfo(cur: number, prev: number, goodWhenUp: boolean) {
  if (prev === 0) {
    if (cur === 0) return null;
    return { text: "yeni", good: null as boolean | null };
  }
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const up = pct >= 0;
  return { text: `${up ? "▲" : "▼"} %${Math.abs(pct).toFixed(0)}`, good: up === goodWhenUp };
}

function timeStr(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default async function GenelBakisPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile();

  // Kayıt sonrası kurulum bitmemişse (veya profil yoksa) → dashboard yerine kurulum modalı
  if (!profile || !profile.onboarding_completed) {
    const { data: { user } } = await supabase.auth.getUser();
    return (
      <OnboardingModal
        profileId={profile?.id ?? null}
        userId={user?.id ?? ""}
        initialName={
          (user?.user_metadata?.full_name as string) ||
          (user?.user_metadata?.name as string) ||
          ""
        }
      />
    );
  }

  const currency = profile.currency ?? "TRY";

  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(now);

  // Son 6 ayın başı (1'i) — trend + bu/geçen ay hesapları bu setten türetilir
  const sixStart = ymd(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  const thisFirst = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const prevFirst = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const prevLast = ymd(new Date(now.getFullYear(), now.getMonth(), 0));

  let accounts: {
    id: string; name: string; type: string | null; bank_name: string | null;
    iban: string | null; account_no: string | null; card_theme: string | null;
    currency: string; balance: string;
  }[] = [];
  let tx6: TxRow[] = [];

  if (profile?.id) {
    const [{ data: acc }, { data: tx }] = await Promise.all([
      supabase
        .from("bank_accounts")
        .select("id, name, type, bank_name, iban, account_no, card_theme, currency, balance")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("id, title, amount, type, category, date, currency, bank_account_id, created_at")
        .eq("user_id", profile.id)
        .gte("date", sixStart)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);
    accounts = acc ?? [];
    tx6 = (tx as TxRow[]) ?? [];
  }

  const isMain = (t: TxRow) => (t.currency || currency) === currency;

  // ── Toplam bakiye (para birimi bazında) ──
  const balByCur: Record<string, number> = {};
  for (const a of accounts) balByCur[a.currency] = (balByCur[a.currency] || 0) + (Number(a.balance) || 0);
  const totalBalance = balByCur[currency] || 0;
  const otherCurTotals = Object.entries(balByCur).filter(([c]) => c !== currency && Math.abs(balByCur[c]) > 0.005);

  // ── Bu ay / geçen ay gelir-gider ──
  let gelir = 0, gider = 0, prevGelir = 0, prevGider = 0;
  for (const t of tx6) {
    if (t.type === "transfer" || !isMain(t)) continue;
    const amt = Number(t.amount) || 0;
    const d = String(t.date).slice(0, 10);
    if (d >= thisFirst) {
      if (t.type === "income") gelir += amt; else if (t.type === "expense") gider += amt;
    } else if (d >= prevFirst && d <= prevLast) {
      if (t.type === "income") prevGelir += amt; else if (t.type === "expense") prevGider += amt;
    }
  }
  const net = gelir - gider;
  const prevNet = prevGelir - prevGider;

  // ── Günlük birikimli seri (KPI sparkline) ──
  const daysElapsed = now.getDate();
  const dInc = new Array(daysElapsed).fill(0);
  const dExp = new Array(daysElapsed).fill(0);
  for (const t of tx6) {
    if (t.type === "transfer" || !isMain(t)) continue;
    const d = String(t.date).slice(0, 10);
    if (d < thisFirst) continue;
    const day = Number(d.slice(8, 10));
    if (day < 1 || day > daysElapsed) continue;
    const amt = Number(t.amount) || 0;
    if (t.type === "income") dInc[day - 1] += amt; else if (t.type === "expense") dExp[day - 1] += amt;
  }
  const incSeries: number[] = [], expSeries: number[] = [], netSeries: number[] = [];
  let ci = 0, ce = 0;
  for (let i = 0; i < daysElapsed; i++) { ci += dInc[i]; ce += dExp[i]; incSeries.push(ci); expSeries.push(ce); netSeries.push(ci - ce); }

  // ── 6 aylık trend ──
  const trend: LinePoint[] = [];
  const monthIndex: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthIndex[`${d.getFullYear()}-${d.getMonth()}`] = trend.length;
    trend.push({ label: MONTHS_SHORT[d.getMonth()], income: 0, expense: 0 });
  }
  for (const t of tx6) {
    if (t.type === "transfer" || !isMain(t)) continue;
    const d = String(t.date).slice(0, 10);
    const [y, m] = d.split("-").map(Number);
    const idx = monthIndex[`${y}-${m - 1}`];
    if (idx === undefined) continue;
    const amt = Number(t.amount) || 0;
    if (t.type === "income") trend[idx].income += amt; else if (t.type === "expense") trend[idx].expense += amt;
  }

  // ── Kategori analizi (bu ay gider) ──
  const catSums: Record<string, number> = {};
  for (const t of tx6) {
    if (t.type !== "expense" || !isMain(t)) continue;
    if (String(t.date).slice(0, 10) < thisFirst) continue;
    const id = t.category || "";
    catSums[id] = (catSums[id] || 0) + (Number(t.amount) || 0);
  }
  const catSorted = Object.entries(catSums).sort((a, b) => b[1] - a[1]);
  const TOP = 5;
  const catTop = catSorted.slice(0, TOP);
  const catRest = catSorted.slice(TOP).reduce((s, [, v]) => s + v, 0);
  const donutSegs: DonutSeg[] = catTop.map(([id, v]) => ({ label: findCategory(id).label, value: v, color: findCategory(id).color }));
  if (catRest > 0) donutSegs.push({ label: "Diğer", value: catRest, color: "#64748B" });
  const catLegend = [
    ...catTop.map(([id, v]) => ({ cat: findCategory(id), value: v })),
    ...(catRest > 0 ? [{ cat: findCategory(null), value: catRest }] : []),
  ];

  // ── Son işlemler ──
  const recent = tx6.slice(0, 7);
  const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? null;

  const kpis = [
    {
      key: "balance", label: "Toplam Bakiye", Icon: Wallet, accent: "var(--teal)",
      value: totalBalance, valueCls: "", delta: null as ReturnType<typeof deltaInfo>,
      series: null as number[] | null,
      sub: `${accounts.length} hesap${otherCurTotals.length ? ` · +${otherCurTotals.length} döviz` : ""}`,
    },
    {
      key: "gelir", label: "Bu Ay Gelir", Icon: TrendingUp, accent: "var(--teal)",
      value: gelir, valueCls: "pos", delta: deltaInfo(gelir, prevGelir, true), series: incSeries, sub: null,
    },
    {
      key: "gider", label: "Bu Ay Gider", Icon: TrendingDown, accent: "var(--danger)",
      value: gider, valueCls: "neg", delta: deltaInfo(gider, prevGider, false), series: expSeries, sub: null,
    },
    {
      key: "net", label: "Net Akış", Icon: Activity, accent: net >= 0 ? "var(--teal)" : "var(--danger)",
      value: net, valueCls: net >= 0 ? "pos" : "neg", delta: deltaInfo(net, prevNet, true), series: netSeries, sub: null,
    },
  ];

  return (
    <>
      <div className="ov-header">
        <h1>Genel Bakış</h1>
        <span className="ov-period">{monthLabel}</span>
      </div>

      {/* ── KPI kartları ── */}
      <div className="dash-kpis">
        {kpis.map((k) => (
          <div key={k.key} className="dash-kpi">
            <div className="dash-kpi-top">
              <span className="dash-kpi-ic" style={{ background: `color-mix(in srgb, ${k.accent} 16%, transparent)`, color: k.accent }}>
                <k.Icon size={18} />
              </span>
              {k.delta && (
                <span className={`dash-kpi-delta ${k.delta.good === null ? "" : k.delta.good ? "up" : "down"}`}>
                  {k.delta.text}
                </span>
              )}
            </div>
            <div className="dash-kpi-label">{k.label}</div>
            <div className={`dash-kpi-value ${k.valueCls}`}>{formatCurrency(k.value, currency)}</div>
            {k.series ? (
              <div className="dash-kpi-spark"><Sparkline data={k.series} color={k.accent} /></div>
            ) : (
              <div className="dash-kpi-sub">{k.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Trend grafiği + Kartlarım ── */}
      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-head">
            <div>
              <h2>Gelir &amp; Gider</h2>
              <span className="dash-card-sub">Son 6 ay</span>
            </div>
            <div className="dash-legend">
              <span className="dl-item"><i className="dl-dot teal" /> Gelir</span>
              <span className="dl-item"><i className="dl-dot red" /> Gider</span>
            </div>
          </div>
          <LineChart data={trend} currency={currency} />
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <h2>Kartlarım</h2>
            <a href="/panel/hesaplar" className="ov-link">Tümü <ArrowRight size={13} /></a>
          </div>
          {accounts.length === 0 ? (
            <a href="/panel/hesaplar" className="field-empty-link" style={{ marginTop: 4 }}>
              <Plus size={15} /> İlk hesabını ekle
            </a>
          ) : (
            <div className="dash-cards-stack">
              {accounts.slice(0, 3).map((a) => (
                <div key={a.id} className="acc-card-wrap">
                  <AccountCard
                    name={a.name} bankName={a.bank_name} iban={a.iban} accountNo={a.account_no}
                    balance={Number(a.balance) || 0} currency={a.currency}
                    type={(a.type as "bank" | "cash" | "pos") || "bank"} theme={a.card_theme}
                  />
                </div>
              ))}
              {accounts.length > 3 && (
                <a href="/panel/hesaplar" className="dash-more-link">+{accounts.length - 3} hesap daha →</a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Kategori analizi + Son işlemler ── */}
      <div className="dash-grid2">
        <div className="dash-card">
          <div className="dash-card-head">
            <h2>Kategori Analizi</h2>
            <span className="dash-card-sub">Bu ay gider</span>
          </div>
          {donutSegs.length === 0 ? (
            <div className="panel-empty">Bu ay gider yok.</div>
          ) : (
            <div className="dash-donut-row">
              <Donut segments={donutSegs} centerTop="Toplam" centerMain={formatCurrency(gider, currency)} />
              <div className="dash-cat-legend">
                {catLegend.map((c, i) => {
                  const pct = gider > 0 ? Math.round((c.value / gider) * 100) : 0;
                  return (
                    <div key={i} className="dash-cat-item">
                      <span className="cat-ic" style={{ background: `${c.cat.color}22` }}>
                        <CategoryIcon name={c.cat.icon} color={c.cat.color} size={14} />
                      </span>
                      <span className="dash-cat-name">{c.cat.label}</span>
                      <span className="dash-cat-pct">%{pct}</span>
                      <span className="dash-cat-amt">{formatCurrency(c.value, currency)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <h2>Son İşlemler</h2>
            <a href="/panel/islemler" className="ov-link">Tümü <ArrowRight size={13} /></a>
          </div>
          {recent.length === 0 ? (
            <div className="panel-empty">Henüz işlem yok.</div>
          ) : (
            <div className="dash-tx">
              {recent.map((t) => {
                const isIncome = t.type === "income";
                const isExpense = t.type === "expense";
                const sign = isIncome ? "+" : isExpense ? "−" : "";
                const cls = isIncome ? "pos" : isExpense ? "neg" : "";
                const cat = findCategory(t.category);
                const acc = accName(t.bank_account_id);
                const tm = timeStr(t.created_at);
                return (
                  <div key={t.id} className="dash-tx-row">
                    <span className="tx-cat-ic" style={{ background: `${cat.color}22` }}>
                      <CategoryIcon name={cat.icon} color={cat.color} size={16} />
                    </span>
                    <div className="dash-tx-mid">
                      <span className="dash-tx-title">{t.title}</span>
                      <span className="dash-tx-meta">
                        {cat.label}
                        {acc ? ` · ${acc}` : ""}
                      </span>
                    </div>
                    <div className="dash-tx-right">
                      <span className={`tx-amount ${cls}`}>
                        {sign}{formatCurrency(Number(t.amount) || 0, t.currency || currency)}
                      </span>
                      <span className="dash-tx-time">
                        {tm && <><Clock size={11} /> {tm} · </>}{formatDate(t.date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
