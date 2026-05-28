interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export function MetricCard({ icon, label, value, sub, color = "#0A1628" }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-[var(--color-silver)]/40 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)] mb-2">
        <span className="text-lg">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold" style={{ color, fontFamily: "var(--font-display)" }}>
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--color-slate)] mt-1">{sub}</div>}
    </div>
  );
}
