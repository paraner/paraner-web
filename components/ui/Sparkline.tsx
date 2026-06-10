// Minik çizgi grafik (Stripe tarzı) — harici kütüphane YOK, saf SVG.
// Veri yoksa/tek noktaysa soluk kesik çizgi gösterir.
export default function Sparkline({
  data,
  color = "var(--teal)",
  width = 150,
  height = 40,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const pad = 3;
  const h = height - pad * 2;

  if (!data || data.length < 2) {
    const y = height / 2;
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="spark"
        aria-hidden
      >
        <line
          x1="0"
          y1={y}
          x2={width}
          y2={y}
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity="0.35"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = pad + h - ((v - min) / range) * h;
    return [x, y] as const;
  });

  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="spark"
      aria-hidden
    >
      <path d={area} fill={color} opacity="0.1" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
