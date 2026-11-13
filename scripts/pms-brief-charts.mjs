#!/usr/bin/env node
/**
 * Draws the Monthly PMS Brief's two charts as inline SVG and writes them into
 * an issue file, between marker comments:
 *
 *   <!-- chart:scorecard:start --> … <!-- chart:scorecard:end -->
 *   <!-- chart:distribution:start --> … <!-- chart:distribution:end -->
 *
 *   node scripts/pms-brief-figures.mjs scripts/pms-data.csv --json /tmp/brief.json
 *   node scripts/pms-brief-charts.mjs /tmp/brief.json newsletters/issues/2026-10-pms-brief.html
 *
 * Every number drawn comes from the JSON written by pms-brief-figures.mjs, so
 * the charts and the copy can't disagree. Inline SVG, no JavaScript: it
 * renders identically in a browser, in headless-Chrome print-to-PDF and as an
 * email attachment.
 *
 * Colour: "beat the index" = --beat (blue #2a78d6), "trailed" = --trail
 * (orange #eb6834), defined in the issue's :root. That pair was chosen with
 * the dataviz validator against the paper surface #faf8f3 — CVD ΔE 24.7,
 * normal-vision ΔE 33.6, both ≥ 3:1. The brand's own red/green fails CVD
 * (ΔE 3.6), so it is NOT used for data. Every bar also carries a text label,
 * so colour is never the only cue.
 */

import { readFileSync, writeFileSync } from "node:fs";

const [jsonPath, htmlPath] = process.argv.slice(2);
if (!jsonPath || !htmlPath) {
  console.error("Usage: node scripts/pms-brief-charts.mjs <brief.json> <issue.html>");
  process.exit(1);
}
const d = JSON.parse(readFileSync(jsonPath, "utf8"));

const fmtInt = (n) => n.toLocaleString("en-IN");
const fmtPct1 = (v) => `${v < 0 ? "&minus;" : ""}${Math.abs(v).toFixed(1)}%`;
const pct = (n, of) => Math.round((n / of) * 100);
const dateLong = new Date(`${d.asOf}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const caption = (what) =>
  `<figcaption>${what} Data as on ${dateLong} &middot; Source: APMI monthly report &middot; Benchmark: S&amp;P BSE 500 TRI. Returns net of fees; 1-year absolute, 3- and 5-year annualised.</figcaption>`;

/** A bar rect with only the chosen corners rounded (r = 4), as an SVG path. */
function bar(x, y, w, h, { top = false, right = false, left = false } = {}, fill = "", title = "") {
  const r = Math.min(4, w / 2, h / 2);
  const tl = top || left ? r : 0, tr = top || right ? r : 0, br = right ? r : 0, bl = left ? r : 0;
  const p = `M${x + tl},${y}H${x + w - tr}${tr ? `Q${x + w},${y} ${x + w},${y + tr}` : ""}V${y + h - br}${br ? `Q${x + w},${y + h} ${x + w - br},${y + h}` : ""}H${x + bl}${bl ? `Q${x},${y + h} ${x},${y + h - bl}` : ""}V${y + tl}${tl ? `Q${x},${y} ${x + tl},${y}` : ""}Z`;
  return `<path d="${p}" fill="${fill}"><title>${title}</title></path>`;
}

/* ---------- chart 1: the scorecard as 100% bars ---------- */
function scorecard() {
  const W = 700, rowH = 58, top = 6, labelW = 250, barX = labelW, barW = 340, valX = barX + barW + 16;
  const H = top + d.scorecard.length * rowH;
  const rows = d.scorecard.map((s, i) => {
    const y = top + i * rowH;
    const share = s.beat / s.of;
    const beatW = Math.max(0, barW * share - 1), trailX = barX + barW * share + 1, trailW = Math.max(0, barW - barW * share - 1);
    const idx = s.index === null ? "" : `index ${fmtPct1(s.index)}${s.annualised ? " a year" : ""}`;
    return `
    <g>
      <text x="0" y="${y + 16}" class="v-lab">${s.label}</text>
      <text x="0" y="${y + 33}" class="v-sub">${fmtInt(s.beat)} of ${fmtInt(s.of)}${idx ? ` &middot; ${idx}` : " with a 5-year record"}</text>
      ${bar(barX, y + 8, beatW, 22, { left: true }, "var(--beat)", `${s.label}: ${fmtInt(s.beat)} of ${fmtInt(s.of)} beat the index`)}
      ${bar(trailX, y + 8, trailW, 22, { right: true }, "var(--trail)", `${s.label}: ${fmtInt(s.of - s.beat)} of ${fmtInt(s.of)} trailed the index`)}
      <text x="${valX}" y="${y + 25}" class="v-big">${pct(s.beat, s.of)}%</text>
      <text x="${valX + 52}" y="${y + 25}" class="v-sub">beat</text>
    </g>`;
  }).join("");
  return `<figure class="viz">
  <div class="v-legend"><span><i style="background:var(--beat)"></i>Beat the index</span><span><i style="background:var(--trail)"></i>Trailed the index</span></div>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Share of PMS strategies that beat the S&amp;P BSE 500 TRI: ${d.scorecard.map((s) => `${s.label.toLowerCase()} ${pct(s.beat, s.of)}%`).join(", ")}">${rows}
  </svg>
  ${caption("Share of strategies with a figure for each window whose return beat the index (alpha above zero).")}
</figure>`;
}

/* ---------- chart 2: where the 3-year returns landed ---------- */
function distribution() {
  const idx = d.benchmark.returns["3Y"];
  const vals = d.returns3y;
  const LO = -5, HI = 30, STEP = 2.5;
  const bins = [{ lo: -Infinity, hi: LO, label: `below &minus;5` }];
  for (let lo = LO; lo < HI; lo += STEP) bins.push({ lo, hi: lo + STEP });
  bins.push({ lo: HI, hi: Infinity, label: "30+" });
  for (const b of bins) {
    const inBin = vals.filter((v) => v >= b.lo && v < b.hi);
    b.beat = inBin.filter((v) => v > idx).length;
    b.trail = inBin.length - b.beat;
  }
  const W = 700, H = 250, padL = 34, padR = 8, padT = 34, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const slot = plotW / bins.length;
  const max = Math.max(...bins.map((b) => b.beat + b.trail));
  const yMax = Math.ceil(max / 50) * 50;
  const y = (n) => padT + plotH - (n / yMax) * plotH;
  // x position of a return value: bins are equal-width slots; tails occupy the end slots.
  const xOf = (v) => padL + slot * (1 + (v - LO) / STEP);

  const grid = [];
  for (let g = 0; g <= yMax; g += 50) {
    grid.push(`<line x1="${padL}" x2="${W - padR}" y1="${y(g)}" y2="${y(g)}" class="v-grid"/><text x="${padL - 6}" y="${y(g) + 3.5}" class="v-axis" text-anchor="end">${g}</text>`);
  }
  const bars = bins.map((b, i) => {
    const x = padL + i * slot + 1, w = slot - 2;
    const range = b.label ?? `${b.lo}% to ${b.hi}%`;
    const out = [];
    const trailH = (b.trail / yMax) * plotH, beatH = (b.beat / yMax) * plotH;
    const base = padT + plotH;
    if (b.trail) out.push(bar(x, base - trailH, w, trailH, { top: !b.beat }, "var(--trail)", `${range}: ${b.trail} trailed the index`));
    if (b.beat) out.push(bar(x, base - trailH - beatH - (b.trail ? 2 : 0), w, beatH, { top: true }, "var(--beat)", `${range}: ${b.beat} beat the index`));
    return out.join("");
  }).join("");
  const ticks = [
    [padL + slot * 0.5, "below &minus;5"],
    ...[0, 10, 20].map((v) => [xOf(v), `${v}%`]),
    [padL + slot * (bins.length - 0.5), "30%+"],
  ].map(([x, t]) => `<text x="${x}" y="${padT + plotH + 16}" class="v-axis" text-anchor="middle">${t}</text>`).join("");
  const xi = xOf(idx), xm = xOf(d.median3y);
  return `<figure class="viz">
  <div class="v-legend"><span><i style="background:var(--beat)"></i>Beat the index &middot; ${fmtInt(vals.filter((v) => v > idx).length)}</span><span><i style="background:var(--trail)"></i>Trailed the index &middot; ${fmtInt(vals.filter((v) => v <= idx).length)}</span></div>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Histogram of 3-year annualised returns for ${fmtInt(vals.length)} PMS strategies; the index returned ${idx.toFixed(1)}% a year and the median strategy ${d.median3y.toFixed(1)}%">
    ${grid.join("")}
    ${bars}
    <line x1="${padL}" x2="${W - padR}" y1="${padT + plotH}" y2="${padT + plotH}" class="v-base"/>
    ${ticks}
    <text x="${padL + plotW / 2}" y="${H - 4}" class="v-axis" text-anchor="middle">3-year return, % a year (strategies per 2.5-point band)</text>
    <line x1="${xi}" x2="${xi}" y1="${padT - 8}" y2="${padT + plotH}" class="v-ref"/>
    <text x="${xi + 5}" y="${padT - 14}" class="v-ann">Index ${idx.toFixed(1)}%</text>
    <line x1="${xm}" x2="${xm}" y1="${padT + 6}" y2="${padT + plotH}" class="v-ref v-dash"/>
    <text x="${xm - 5}" y="${padT}" class="v-ann" text-anchor="end">Median strategy ${d.median3y.toFixed(1)}%</text>
  </svg>
  ${caption(`3-year annualised returns of the ${fmtInt(vals.length)} strategies with a 3-year record.`)}
</figure>`;
}

let html = readFileSync(htmlPath, "utf8");
for (const [name, svg] of [["scorecard", scorecard()], ["distribution", distribution()]]) {
  const re = new RegExp(`(<!-- chart:${name}:start -->)[\\s\\S]*?(<!-- chart:${name}:end -->)`);
  if (!re.test(html)) {
    console.error(`${htmlPath} has no <!-- chart:${name}:start --> … <!-- chart:${name}:end --> markers.`);
    process.exit(1);
  }
  html = html.replace(re, `$1\n${svg}\n$2`);
}
writeFileSync(htmlPath, html);
console.log(`Charts written into ${htmlPath} (data as on ${d.asOf}).`);
