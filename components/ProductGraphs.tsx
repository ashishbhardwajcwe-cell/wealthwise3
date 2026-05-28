"use client";

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine, ReferenceArea, Label,
} from "recharts";

const NAVY = "#0A1628";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E4CC7A";
const TEAL = "#0891B2";
const EMERALD = "#10B981";
const RUBY = "#EF4444";
const AMBER = "#F59E0B";
const SLATE = "#5A6B80";

function ChartFrame({ title, children, source, height = 320 }: { title: string; children: React.ReactNode; source: string; height?: number }) {
  return (
    <div className="bg-white border border-[var(--color-silver)]/40 rounded-2xl p-6 shadow-sm">
      <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">{title}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-[var(--color-slate)] mt-3 italic leading-relaxed">{source}</p>
    </div>
  );
}

// 1. Mutual Funds — Equity vs Debt returns
export function MutualFundsGraph() {
  const data = [
    { year: "2016", equity: 4, debt: 12 },
    { year: "2017", equity: 28, debt: 6 },
    { year: "2018", equity: -3, debt: 6 },
    { year: "2019", equity: 12, debt: 10 },
    { year: "2020", equity: 16, debt: 11 },
    { year: "2021", equity: 25, debt: 4 },
    { year: "2022", equity: 4, debt: 3 },
    { year: "2023", equity: 21, debt: 7 },
    { year: "2024", equity: 14, debt: 8 },
    { year: "2025", equity: 8, debt: 7 },
  ];
  return (
    <ChartFrame
      title="Equity vs Debt mutual fund returns — 10 years (illustrative)"
      source="Illustrative composite returns based on Nifty 500 TRI and CRISIL Composite Debt Fund Index. Past performance does not guarantee future returns."
    >
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: SLATE }} />
        <YAxis tick={{ fontSize: 11, fill: SLATE }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="equity" fill={NAVY} name="Equity MF" radius={[4, 4, 0, 0]} />
        <Bar dataKey="debt" fill={GOLD} name="Debt MF" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

// 2. PMS — Fee structure comparison
export function PMSGraph() {
  const data = [
    { name: "Index Fund", fixed: 0.2, performance: 0, total: 0.2 },
    { name: "Active MF (Direct)", fixed: 1.0, performance: 0, total: 1.0 },
    { name: "Active MF (Regular)", fixed: 2.0, performance: 0, total: 2.0 },
    { name: "PMS (Fixed)", fixed: 2.5, performance: 0, total: 2.5 },
    { name: "PMS (Hybrid)", fixed: 1.5, performance: 2.0, total: 3.5 },
    { name: "AIF Cat II", fixed: 2.0, performance: 2.5, total: 4.5 },
  ];
  return (
    <ChartFrame
      title="Typical annual fees: MF vs PMS vs AIF (% of AUM)"
      source="Illustrative typical fee structures. Performance fee component assumes hurdle achieved. Actual fees vary by manager and AUM tier."
    >
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis type="number" tick={{ fontSize: 11, fill: SLATE }} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: SLATE }} width={130} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="fixed" stackId="a" fill={NAVY} name="Fixed fee" />
        <Bar dataKey="performance" stackId="a" fill={GOLD} name="Performance fee" />
      </BarChart>
    </ChartFrame>
  );
}

// 3. AIF — Category breakdown (Pie)
export function AIFGraph() {
  const data = [
    { name: "Cat II — PE/RE/Debt/FoF", value: 72, fill: NAVY },
    { name: "Cat I — Startups/SME/Infra", value: 15, fill: GOLD },
    { name: "Cat III — Hedge/Long-Short", value: 13, fill: TEAL },
  ];
  return (
    <ChartFrame
      title="Indian AIF AUM by category (illustrative, FY26)"
      source="Illustrative split based on broad SEBI AUM disclosures. Category II dominates Indian AIF AUM; Cat III growth has been steady but smaller."
      height={300}
    >
      <PieChart>
        <Pie
          data={data} cx="50%" cy="50%"
          innerRadius={60} outerRadius={110}
          paddingAngle={2}
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}%`}
          labelLine={false}
        >
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Pie>
        <Tooltip formatter={(v: number) => `${v}% of AIF AUM`} />
      </PieChart>
    </ChartFrame>
  );
}

// 4. Unlisted Shares — Timeline of notable IPOs
export function UnlistedSharesGraph() {
  const data = [
    { year: 2021, company: "Zomato", listingMcap: 64000, label: "Zomato" },
    { year: 2021, company: "Nykaa", listingMcap: 100000, label: "Nykaa" },
    { year: 2021, company: "Policybazaar", listingMcap: 50000, label: "Policybazaar" },
    { year: 2022, company: "LIC", listingMcap: 600000, label: "LIC" },
    { year: 2023, company: "Mamaearth", listingMcap: 11000, label: "Mamaearth" },
    { year: 2024, company: "Ola Electric", listingMcap: 50000, label: "Ola Electric" },
    { year: 2024, company: "Swiggy", listingMcap: 113000, label: "Swiggy" },
  ];
  return (
    <ChartFrame
      title="Notable Indian IPOs 2021-2024 (listing market cap in ₹ Cr — illustrative)"
      source="Listing market caps shown are approximate and for illustration only. Several of these companies traded significantly above or below their pre-IPO grey-market premium post-listing. Not a recommendation."
      height={300}
    >
      <BarChart data={data} margin={{ bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="company" tick={{ fontSize: 10, fill: SLATE }} angle={-25} textAnchor="end" />
        <YAxis tick={{ fontSize: 11, fill: SLATE }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k Cr`} />
        <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")} Cr`} />
        <Bar dataKey="listingMcap" fill={GOLD} radius={[6, 6, 0, 0]} name="Listing market cap" />
      </BarChart>
    </ChartFrame>
  );
}

// 5. Cryptocurrency — BTC + ETH price + tax overlay
export function CryptoGraph() {
  // Illustrative price levels in INR
  const data = [
    { year: "2018", btc: 250000, eth: 9000 },
    { year: "2019", btc: 510000, eth: 9500 },
    { year: "2020", btc: 2100000, eth: 53000 },
    { year: "2021", btc: 3500000, eth: 290000 },
    { year: "2022", btc: 1370000, eth: 99000 },
    { year: "2023", btc: 3500000, eth: 190000 },
    { year: "2024", btc: 7900000, eth: 280000 },
    { year: "2025", btc: 9500000, eth: 320000 },
  ];
  return (
    <ChartFrame
      title="BTC and ETH in INR — 8 years (illustrative annual snapshots)"
      source="India tax on crypto: 30% flat on gains + 1% TDS on transactions over ₹50k/yr. Losses cannot be set off. Price snapshots are illustrative — actual prices are highly volatile."
      height={340}
    >
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: SLATE }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: SLATE }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: SLATE }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number, name) => name === "BTC" ? `₹${(v / 100000).toFixed(2)} L` : `₹${(v / 1000).toFixed(1)}k`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceArea yAxisId="left" x1="2022" x2="2025" fill={RUBY} fillOpacity={0.06} label={{ value: "30% tax + 1% TDS era", position: "insideTopLeft", fontSize: 11, fill: RUBY }} />
        <Line yAxisId="left" type="monotone" dataKey="btc" stroke={GOLD} strokeWidth={2.5} dot={{ r: 3 }} name="BTC" />
        <Line yAxisId="right" type="monotone" dataKey="eth" stroke={TEAL} strokeWidth={2.5} dot={{ r: 3 }} name="ETH" />
      </ComposedChart>
    </ChartFrame>
  );
}

// 6. Direct Equity — Nifty 50 vs Sensex vs Smallcap 250 (indexed)
export function DirectEquityGraph() {
  // Indexed to 100 in 2005. Illustrative.
  const data = [
    { year: "2005", nifty50: 100, sensex: 100, smallcap: 100 },
    { year: "2008", nifty50: 165, sensex: 170, smallcap: 145 },
    { year: "2010", nifty50: 240, sensex: 240, smallcap: 280 },
    { year: "2013", nifty50: 280, sensex: 285, smallcap: 240 },
    { year: "2016", nifty50: 405, sensex: 415, smallcap: 530 },
    { year: "2018", nifty50: 530, sensex: 545, smallcap: 580 },
    { year: "2020", nifty50: 570, sensex: 585, smallcap: 580 },
    { year: "2022", nifty50: 820, sensex: 840, smallcap: 1120 },
    { year: "2024", nifty50: 1100, sensex: 1130, smallcap: 1830 },
    { year: "2025", nifty50: 1180, sensex: 1210, smallcap: 1920 },
  ];
  return (
    <ChartFrame
      title="Nifty 50, Sensex, Smallcap 250 indexed to 100 (2005 = 100) — illustrative"
      source="Indexed to 100 in 2005 to compare relative performance. Smallcap shows higher returns and higher drawdowns. Returns do not include dividends. Past performance does not guarantee future returns."
      height={340}
    >
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: SLATE }} />
        <YAxis tick={{ fontSize: 11, fill: SLATE }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="nifty50" stroke={NAVY} strokeWidth={2} dot={false} name="Nifty 50" />
        <Line type="monotone" dataKey="sensex" stroke={TEAL} strokeWidth={2} dot={false} name="Sensex" />
        <Line type="monotone" dataKey="smallcap" stroke={GOLD} strokeWidth={2.5} dot={false} name="Smallcap 250" />
      </LineChart>
    </ChartFrame>
  );
}

// 7. Insurance — Cover gap visualisation
export function InsuranceGraph() {
  const data = [
    { type: "Annual income", value: 20, fill: SLATE },
    { type: "Outstanding debts", value: 45, fill: AMBER },
    { type: "Recommended term cover (15x)", value: 300, fill: NAVY },
    { type: "Typical actual cover (Indian avg)", value: 60, fill: RUBY },
  ];
  return (
    <ChartFrame
      title="The insurance gap — recommended vs typical actual cover (₹ lakhs)"
      source="Illustrative for a 35-year-old with ₹20L income, ₹45L home loan, and two dependents. Most Indians are underinsured by 60-80% of recommended term cover."
      height={300}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis type="number" tick={{ fontSize: 11, fill: SLATE }} tickFormatter={(v) => `₹${v}L`} />
        <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: SLATE }} width={180} />
        <Tooltip formatter={(v: number) => `₹${v} lakhs`} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

// 8. Real Estate — Equity vs RE 20-year returns
export function RealEstateGraph() {
  // CAGR comparison + indexed growth
  const data = [
    { year: "2005", equity: 100, realEstate: 100 },
    { year: "2008", equity: 165, realEstate: 165 },
    { year: "2010", equity: 240, realEstate: 220 },
    { year: "2013", equity: 280, realEstate: 280 },
    { year: "2016", equity: 405, realEstate: 320 },
    { year: "2019", equity: 530, realEstate: 360 },
    { year: "2022", equity: 820, realEstate: 410 },
    { year: "2025", equity: 1180, realEstate: 510 },
  ];
  return (
    <ChartFrame
      title="Indian equity vs metro residential real estate (2005 = 100) — illustrative"
      source="Equity = Nifty 50 TRI. Real estate = composite of NHB Residex metro indices. Excludes rental income and capital gains tax. Real estate returns vary enormously by city and micromarket."
      height={340}
    >
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: SLATE }} />
        <YAxis tick={{ fontSize: 11, fill: SLATE }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="equity" stroke={NAVY} fill={NAVY} fillOpacity={0.15} strokeWidth={2.5} name="Equity (Nifty 50 TRI)" />
        <Area type="monotone" dataKey="realEstate" stroke={GOLD} fill={GOLD} fillOpacity={0.18} strokeWidth={2.5} name="Real estate (metro residential)" />
      </AreaChart>
    </ChartFrame>
  );
}

// 9. Gold — Price in INR over 25 years + SGB benefit
export function GoldGraph() {
  // Gold price per 10g in INR + SGB cumulative interest
  const data = [
    { year: "2000", gold: 4400, sgbBenefit: 0 },
    { year: "2005", gold: 7000, sgbBenefit: 0 },
    { year: "2010", gold: 18500, sgbBenefit: 0 },
    { year: "2015", gold: 26300, sgbBenefit: 0 },
    { year: "2017", gold: 29700, sgbBenefit: 1485 },
    { year: "2019", gold: 35200, sgbBenefit: 3520 },
    { year: "2021", gold: 48000, sgbBenefit: 6000 },
    { year: "2023", gold: 60800, sgbBenefit: 9120 },
    { year: "2025", gold: 92500, sgbBenefit: 13875 },
  ];
  return (
    <ChartFrame
      title="Gold price per 10g in INR + cumulative SGB interest benefit (illustrative)"
      source="Gold prices are approximate annual snapshots. SGB interest of 2.5% p.a. shown cumulatively from the first SGB tranche (Nov 2015). SGB returns held to maturity are LTCG-exempt; gold ETF gains are taxed at 12.5% LTCG."
      height={340}
    >
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: SLATE }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: SLATE }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: SLATE }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area yAxisId="left" type="monotone" dataKey="gold" stroke={GOLD} fill={GOLD} fillOpacity={0.18} strokeWidth={2.5} name="Gold price per 10g" />
        <Bar yAxisId="right" dataKey="sgbBenefit" fill={EMERALD} fillOpacity={0.7} name="SGB cumulative interest (per 10g)" />
      </ComposedChart>
    </ChartFrame>
  );
}
