// Kategori dağılımı donut'u — saf SVG (server-safe). Segmentler stroke-dasharray
// ile çizilir; ortada toplam. Boşsa soluk halka.
export type DonutSeg = { label: string; value: number; color: string };

export default function Donut({
  segments,
  size = 168,
  thickness = 22,
  centerTop,
  centerMain,
}: {
  segments: DonutSeg[];
  size?: number;
  thickness?: number;
  centerTop?: string;
  centerMain?: string;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);

  let offset = 0;
  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((seg, i) => {
            const len = (seg.value / total) * circ;
            const dash = `${len} ${circ - len}`;
            const el = (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="donut-center">
        {centerTop && <span className="donut-center-top">{centerTop}</span>}
        {centerMain && <span className="donut-center-main">{centerMain}</span>}
      </div>
    </div>
  );
}
