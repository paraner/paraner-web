"use client";

// Shopify (Polaris Viz) tarzı çizgi grafik — yumuşak çizgi + alan dolgusu,
// Y ekseni değerleri + ızgara, hover'da dikey kılavuz + tooltip. Bağımlılıksız,
// saf SVG + küçük client etkileşimi. İki seri: Gelir (teal) + Gider (kırmızı).
import { useState } from "react";
import { formatCurrency } from "../../lib/format";

export type LinePoint = { label: string; income: number; expense: number };

// Grafik artık dashboard'da TAM GENİŞLİK. viewBox 880x300 iken (en-boy 2.9) 1500px
// genişlikte ~510px yüksekliğe uzuyor ve eksen yazıları 1.7× büyüyordu. Daha geniş
// viewBox → makul yükseklik (~320px) + doğru ölçekli yazılar.
const W = 1400;
const H = 300;
const PAD_L = 50;
const PAD_R = 16;
const PAD_TOP = 18;
const PAD_BOTTOM = 34;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / pow;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * pow;
}
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 1e7 ? 0 : 1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 1e4 ? 0 : 1).replace(".", ",")}B`;
  return String(Math.round(n));
}
function smooth(pts: { x: number; y: number }[]): string {
  if (!pts.length) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const dx = (c.x - p.x) * 0.4;
    d += ` C${p.x + dx},${p.y} ${c.x - dx},${c.y} ${c.x},${c.y}`;
  }
  return d;
}

export default function LineChart({ data, currency }: { data: LinePoint[]; currency: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = data.length || 1;
  const top = niceMax(Math.max(...data.flatMap((d) => [d.income, d.expense]), 0));
  const xOf = (i: number) => PAD_L + (n <= 1 ? PLOT_W / 2 : (i * PLOT_W) / (n - 1));
  const yOf = (v: number) => PAD_TOP + PLOT_H - (v / top) * PLOT_H;

  const incPts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.income) }));
  const expPts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.expense) }));
  const incLine = smooth(incPts);
  const expLine = smooth(expPts);
  const base = PAD_TOP + PLOT_H;
  const incArea = incPts.length ? `${incLine} L${incPts[n - 1].x},${base} L${incPts[0].x},${base} Z` : "";
  const levels = [0, 0.25, 0.5, 0.75, 1];
  const band = PLOT_W / n;

  const h = hover;

  return (
    <div className="lc-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="lc-svg" aria-hidden>
        <defs>
          <linearGradient id="lcInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Izgara + Y etiketleri */}
        {levels.map((lv, i) => {
          const y = base - lv * PLOT_H;
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <text x={PAD_L - 8} y={y + 4} fontSize="11" fill="rgba(255,255,255,0.4)" textAnchor="end">{compact(lv * top)}</text>
            </g>
          );
        })}

        {/* Alan + çizgiler */}
        <path d={incArea} fill="url(#lcInc)" />
        <path d={expLine} fill="none" stroke="var(--danger)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.92" />
        <path d={incLine} fill="none" stroke="var(--teal)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {/* Hover dikey kılavuz */}
        {h !== null && (
          <line x1={incPts[h].x} y1={PAD_TOP} x2={incPts[h].x} y2={base} stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        )}

        {/* Noktalar */}
        {data.map((_, i) => (
          <g key={i}>
            <circle cx={expPts[i].x} cy={expPts[i].y} r={h === i ? 4.5 : 3} fill="var(--danger)" />
            <circle cx={incPts[i].x} cy={incPts[i].y} r={h === i ? 4.5 : 3} fill="var(--teal)" />
          </g>
        ))}

        {/* X etiketleri */}
        {data.map((d, i) => (
          <text key={i} x={xOf(i)} y={H - 11} fontSize="12" fill="rgba(255,255,255,0.5)" textAnchor="middle">{d.label}</text>
        ))}

        {/* Hover yakalama bantları (şeffaf) */}
        {data.map((_, i) => (
          <rect
            key={i}
            x={PAD_L + i * band}
            y={PAD_TOP}
            width={band}
            height={PLOT_H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((cur) => (cur === i ? null : cur))}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {h !== null && (
        <div className="lc-tip" style={{ left: `${(incPts[h].x / W) * 100}%` }}>
          <div className="lc-tip-label">{data[h].label}</div>
          <div className="lc-tip-row"><i className="dl-dot teal" /> Gelir <b>{formatCurrency(data[h].income, currency)}</b></div>
          <div className="lc-tip-row"><i className="dl-dot red" /> Gider <b>{formatCurrency(data[h].expense, currency)}</b></div>
        </div>
      )}
    </div>
  );
}
