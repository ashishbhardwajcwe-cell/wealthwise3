interface SparklineProps {
  points: number[];
  positive: boolean;
  width?: number;
  height?: number;
}

/**
 * Tiny inline-SVG sparkline. Used in both the crypto table (7d prices)
 * and the mutual-fund + ETF tables (30d NAVs). Pure SVG, no dependencies.
 */
export function Sparkline({ points, positive, width = 88, height = 28 }: SparklineProps) {
  if (points.length === 0) {
    return <span className="text-xs text-[var(--color-slate)]/40">—</span>;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1 || 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const stroke = positive ? "var(--color-emerald)" : "var(--color-ruby)";
  const fill = positive ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)";
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={areaPath} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
