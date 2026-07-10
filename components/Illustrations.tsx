/**
 * Branded SVG illustrations used as elegant placeholders for sections
 * that will eventually carry real photos / screenshots. Designed to look
 * intentional (not "image coming soon") so the site doesn't feel half-built.
 */

export function AppScreenshot({ title, kind }: { title: string; kind: "dashboard" | "goals" | "harvest" | "scenarios" | "insurance" | "drift" }) {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" role="img" aria-label={`CashFlow Planner — ${title}`}>
      <defs>
        <linearGradient id={`screen-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFDF5" />
          <stop offset="100%" stopColor="#FFF9EC" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" rx="10" fill={`url(#screen-${kind})`} />

      {/* Browser chrome */}
      <rect width="320" height="20" rx="10" fill="#0A1628" />
      <circle cx="10" cy="10" r="3" fill="#EF4444" />
      <circle cx="22" cy="10" r="3" fill="#F59E0B" />
      <circle cx="34" cy="10" r="3" fill="#10B981" />
      <rect x="80" y="6" width="160" height="8" rx="4" fill="rgba(255,255,255,0.1)" />

      {kind === "dashboard" && <DashboardShape />}
      {kind === "goals" && <GoalsShape />}
      {kind === "harvest" && <HarvestShape />}
      {kind === "scenarios" && <ScenariosShape />}
      {kind === "insurance" && <InsuranceShape />}
      {kind === "drift" && <DriftShape />}
    </svg>
  );
}

function DashboardShape() {
  return (
    <>
      <text x="16" y="48" fill="#0A1628" fontSize="11" fontWeight="600" fontFamily="serif">Total net worth</text>
      <text x="16" y="68" fill="#C9A84C" fontSize="22" fontWeight="700" fontFamily="serif">₹3.42 Cr</text>
      {/* Mini bars */}
      <rect x="16" y="90" width="40" height="60" rx="3" fill="#0A1628" opacity="0.85" />
      <rect x="64" y="110" width="40" height="40" rx="3" fill="#C9A84C" opacity="0.85" />
      <rect x="112" y="100" width="40" height="50" rx="3" fill="#0891B2" opacity="0.85" />
      <rect x="160" y="125" width="40" height="25" rx="3" fill="#10B981" opacity="0.85" />
      <rect x="208" y="115" width="40" height="35" rx="3" fill="#F59E0B" opacity="0.85" />
      {/* Labels */}
      <text x="16" y="172" fill="#5A6B80" fontSize="7">Equity</text>
      <text x="64" y="172" fill="#5A6B80" fontSize="7">Debt</text>
      <text x="112" y="172" fill="#5A6B80" fontSize="7">Gold</text>
      <text x="160" y="172" fill="#5A6B80" fontSize="7">RE</text>
      <text x="208" y="172" fill="#5A6B80" fontSize="7">Cash</text>
    </>
  );
}

function GoalsShape() {
  return (
    <>
      <text x="16" y="44" fill="#0A1628" fontSize="11" fontWeight="600" fontFamily="serif">Retirement at 55</text>
      {/* Curve */}
      <path d="M 16 160 Q 100 140 200 90 T 300 38" stroke="#C9A84C" strokeWidth="2.5" fill="none" />
      <path d="M 16 160 Q 100 140 200 90 T 300 38 L 300 180 L 16 180 Z" fill="#C9A84C" opacity="0.12" />
      {/* Target marker */}
      <circle cx="300" cy="38" r="4" fill="#C9A84C" />
      <text x="285" y="30" fill="#0A1628" fontSize="8" fontWeight="700">₹7.4 Cr</text>
      {/* Axis */}
      <line x1="16" y1="180" x2="310" y2="180" stroke="#C4CDD5" strokeWidth="0.5" />
    </>
  );
}

function HarvestShape() {
  return (
    <>
      <text x="16" y="44" fill="#0A1628" fontSize="11" fontWeight="600" fontFamily="serif">Tax harvested this year</text>
      <text x="16" y="64" fill="#10B981" fontSize="20" fontWeight="700" fontFamily="serif">₹1,24,580</text>
      <text x="16" y="78" fill="#5A6B80" fontSize="8">of ₹1,25,000 exemption</text>
      {/* Progress bar */}
      <rect x="16" y="92" width="288" height="10" rx="5" fill="#C4CDD5" opacity="0.4" />
      <rect x="16" y="92" width="285" height="10" rx="5" fill="#10B981" />
      {/* Rows */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(0 ${118 + i * 20})`}>
          <rect x="16" y="0" width="200" height="14" rx="3" fill="#0A1628" opacity="0.06" />
          <rect x="220" y="0" width="84" height="14" rx="3" fill="#C9A84C" opacity={0.3 - i * 0.05} />
        </g>
      ))}
    </>
  );
}

function ScenariosShape() {
  return (
    <>
      <text x="16" y="44" fill="#0A1628" fontSize="11" fontWeight="600" fontFamily="serif">Scenarios</text>
      {/* Three curves */}
      <path d="M 16 160 Q 100 150 200 110 T 300 60" stroke="#10B981" strokeWidth="2" fill="none" />
      <path d="M 16 160 Q 100 152 200 128 T 300 90" stroke="#C9A84C" strokeWidth="2" fill="none" />
      <path d="M 16 160 Q 100 155 200 140 T 300 115" stroke="#EF4444" strokeWidth="2" fill="none" />
      {/* Legend */}
      <circle cx="22" cy="186" r="3" fill="#10B981" /><text x="30" y="189" fill="#5A6B80" fontSize="7">Aggressive</text>
      <circle cx="100" cy="186" r="3" fill="#C9A84C" /><text x="108" y="189" fill="#5A6B80" fontSize="7">Balanced</text>
      <circle cx="172" cy="186" r="3" fill="#EF4444" /><text x="180" y="189" fill="#5A6B80" fontSize="7">Conservative</text>
    </>
  );
}

function InsuranceShape() {
  return (
    <>
      <text x="16" y="44" fill="#0A1628" fontSize="11" fontWeight="600" fontFamily="serif">Insurance gap</text>
      {/* Bars */}
      <rect x="16" y="58" width="220" height="16" rx="3" fill="#0A1628" />
      <text x="240" y="70" fill="#0A1628" fontSize="9" fontWeight="700">₹3 Cr need</text>
      <rect x="16" y="82" width="50" height="16" rx="3" fill="#EF4444" opacity="0.8" />
      <text x="72" y="94" fill="#EF4444" fontSize="9" fontWeight="700">₹70L now</text>
      {/* Gap warning */}
      <rect x="16" y="115" width="288" height="50" rx="6" fill="#EF4444" opacity="0.08" />
      <text x="28" y="135" fill="#EF4444" fontSize="9" fontWeight="700">Cover gap: ₹2.3 Cr</text>
      <text x="28" y="150" fill="#5A6B80" fontSize="8">Recommended top-up: ₹25k/yr</text>
    </>
  );
}

function DriftShape() {
  return (
    <>
      <text x="16" y="44" fill="#0A1628" fontSize="11" fontWeight="600" fontFamily="serif">Allocation drift</text>
      {/* Target bar */}
      <text x="16" y="64" fill="#5A6B80" fontSize="8">Target</text>
      <rect x="50" y="58" width="180" height="10" rx="3" fill="#0A1628" />
      <rect x="50" y="58" width="120" height="10" rx="3" fill="#0A1628" />
      <rect x="170" y="58" width="40" height="10" rx="3" fill="#C9A84C" />
      <rect x="210" y="58" width="20" height="10" rx="3" fill="#0891B2" />
      {/* Actual bar */}
      <text x="16" y="92" fill="#5A6B80" fontSize="8">Actual</text>
      <rect x="50" y="86" width="180" height="10" rx="3" fill="#0A1628" />
      <rect x="50" y="86" width="100" height="10" rx="3" fill="#0A1628" />
      <rect x="150" y="86" width="55" height="10" rx="3" fill="#C9A84C" />
      <rect x="205" y="86" width="25" height="10" rx="3" fill="#0891B2" />
      {/* Note */}
      <rect x="16" y="120" width="288" height="40" rx="6" fill="#F59E0B" opacity="0.12" />
      <text x="28" y="138" fill="#F59E0B" fontSize="9" fontWeight="700">Equity 11% under target</text>
      <text x="28" y="152" fill="#5A6B80" fontSize="8">Rebalance suggestion: ₹3.8L to equity MF</text>
    </>
  );
}

/**
 * "Scattered investments → unified plan" SVG diagram for the home page
 * Section 4 "How it works".
 */
export function UnifiedPlanDiagram() {
  return (
    <svg viewBox="0 0 800 320" className="w-full h-auto" role="img" aria-label="Scattered investments unified into a single plan">
      <defs>
        <linearGradient id="unifyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5A6B80" />
          <stop offset="50%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      {/* LEFT — chaos */}
      <g>
        <text x="100" y="22" textAnchor="middle" fill="#5A6B80" fontSize="11" fontWeight="700" letterSpacing="2">BEFORE</text>
        {[
          { x: 30, y: 70, r: 22, label: "MF" },
          { x: 85, y: 50, r: 18, label: "FD" },
          { x: 140, y: 80, r: 20, label: "EPF" },
          { x: 50, y: 130, r: 16, label: "PPF" },
          { x: 110, y: 140, r: 22, label: "Demat" },
          { x: 165, y: 145, r: 14, label: "SGB" },
          { x: 30, y: 195, r: 18, label: "ULIP" },
          { x: 90, y: 215, r: 20, label: "Home" },
          { x: 150, y: 200, r: 16, label: "USD" },
          { x: 60, y: 255, r: 14, label: "₿" },
          { x: 130, y: 270, r: 18, label: "Gold" },
        ].map((c, i) => (
          <g key={i}>
            <circle cx={c.x + 20} cy={c.y} r={c.r} fill="#C4CDD5" opacity="0.35" />
            <circle cx={c.x + 20} cy={c.y} r={c.r} fill="none" stroke="#5A6B80" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
            <text x={c.x + 20} y={c.y + 4} textAnchor="middle" fill="#0A1628" fontSize="9" fontWeight="600">{c.label}</text>
          </g>
        ))}
      </g>

      {/* CENTER — CashFlow Planner */}
      <g>
        <rect x="310" y="80" width="180" height="160" rx="14" fill="#0A1628" />
        <rect x="310" y="80" width="180" height="6" rx="3" fill="url(#unifyGrad)" />
        <text x="400" y="120" textAnchor="middle" fill="#FFFDF5" fontSize="14" fontWeight="600" fontFamily="serif">CashFlow Planner</text>
        <text x="400" y="140" textAnchor="middle" fill="#C9A84C" fontSize="9" letterSpacing="1.5">UNIFYING LAYER</text>
        {/* tiny dots representing aggregation */}
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={340 + i * 40} cy="180" r="4" fill="#C9A84C" opacity={1 - i * 0.2} />
        ))}
        <text x="400" y="210" textAnchor="middle" fill="#C4CDD5" fontSize="8">aggregate · analyse · plan</text>
      </g>

      {/* Connection arrows from chaos to CashFlow Planner */}
      {[80, 130, 170, 200].map((y, i) => (
        <path key={i} d={`M 220 ${y} Q 270 ${y - 5} 310 ${100 + i * 35}`} stroke="#C9A84C" strokeWidth="1" fill="none" opacity="0.4" />
      ))}

      {/* RIGHT — clean plan */}
      <g>
        <text x="700" y="22" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="700" letterSpacing="2">AFTER</text>
        {/* Goal cards */}
        {[
          { y: 60, label: "Emergency fund", pct: "100%", color: "#10B981" },
          { y: 110, label: "Kids' education", pct: "47%", color: "#0891B2" },
          { y: 160, label: "Home upgrade", pct: "62%", color: "#C9A84C" },
          { y: 210, label: "Retirement", pct: "38%", color: "#0A1628" },
        ].map((g, i) => (
          <g key={i}>
            <rect x="560" y={g.y} width="220" height="38" rx="6" fill="#FFFDF5" stroke="#C4CDD5" />
            <rect x="560" y={g.y} width={2.2 * parseInt(g.pct)} height="38" rx="6" fill={g.color} opacity="0.18" />
            <text x="572" y={g.y + 16} fill="#0A1628" fontSize="10" fontWeight="600">{g.label}</text>
            <text x="572" y={g.y + 30} fill={g.color} fontSize="9" fontWeight="700">{g.pct} on track</text>
          </g>
        ))}
      </g>

      {/* Arrow from CashFlow Planner to plan */}
      <path d="M 490 160 L 555 160" stroke="#C9A84C" strokeWidth="2" fill="none" />
      <path d="M 547 155 L 558 160 L 547 165 Z" fill="#C9A84C" />
    </svg>
  );
}
