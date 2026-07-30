/**
 * fetch-apmi-pms.mjs — Full PMS universe from APMI's official IA Performance endpoint
 * (action=loadIAReport) -> scripts/pms-data.csv, sourced from APMI. Node 18+, no deps.
 *   node scripts/fetch-apmi-pms.mjs 6 2026 --probe          # diagnostic, writes nothing
 *   node scripts/fetch-apmi-pms.mjs 6 2026                  # writes scripts/pms-data.csv
 *   node scripts/fetch-apmi-pms.mjs 6 2026 --min-aum 100    # only strategies >= 100 cr
 *   node scripts/fetch-apmi-pms.mjs 6 2026 --ason 30-06-2026  # send this exact asOnDate
 * Data-row layout (verified): Provider, IA, AUM, 1M, 3M, 6M, 1Y, 2Y, 3Y, 4Y, 5Y, SI (12 cells).
 *
 * TWO DATES, deliberately not the same value:
 *
 *   asOnDateRequest  what goes in the APMI POST body. The recovered fetcher
 *                    sent an UNPADDED month (`2026-6-30`) and that is the only
 *                    format anyone has seen this endpoint accept, so the shape
 *                    is left alone — but the day is now the month's real last
 *                    day instead of a hardcoded 30, which was simply asking
 *                    for the wrong date in every 31-day month and in February.
 *                    Use --ason to send an exact literal when a live capture
 *                    shows APMI wants something else; --probe prints what
 *                    would be sent without writing anything.
 *
 *   asOfDateCsv      what goes in the CSV, and from there into Sanity and onto
 *                    the site. Always strict zero-padded YYYY-MM-DD, because
 *                    that is the project's date rule and import-pms.mjs
 *                    rejects anything else — `2026-6-30` failed the import
 *                    outright.
 */
import { monthEndIso, lastDayOfMonth } from "./import-shared.mjs";

const ENDPOINT = "https://www.apmiindia.org/apmi/welcomeiaperformance.htm?action=loadIAReport";
const REFERER  = "https://www.apmiindia.org/apmi/welcomeiaperformance.htm?action=PMSmenu";
const args = process.argv.slice(2);
const month = args[0] || "6", year = args[1] || "2026";
const probe = args.includes("--probe");
const outIdx = args.indexOf("--out");
const OUT = outIdx !== -1 ? args[outIdx + 1] : "scripts/pms-data.csv";
const minAumIdx = args.indexOf("--min-aum");
const MIN_AUM = minAumIdx !== -1 ? parseFloat(args[minAumIdx + 1]) : 0;
const asonIdx = args.indexOf("--ason");

if (!(Number(month) >= 1 && Number(month) <= 12)) {
  console.error(`Month must be 1-12 (got "${month}").\nUsage: node scripts/fetch-apmi-pms.mjs <month> <year> [--probe] [--min-aum N] [--ason <literal>] [--out path]`);
  process.exit(1);
}
if (!/^\d{4}$/.test(String(year))) {
  console.error(`Year must be a 4-digit year (got "${year}").`);
  process.exit(1);
}

const asOfDateCsv = monthEndIso(year, month);
const asOnDateRequest = asonIdx !== -1
  ? args[asonIdx + 1]
  : `${year}-${Number(month)}-${lastDayOfMonth(year, month)}`;
const MN = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const SOURCE = `APMI monthly report ${MN[Number(month)] || month} ${year}`;
const STRATEGIES = ["Equity","Debt","Hybrid","Multi Asset"];
const SERVICE_TYPES = ["D","N"];
function mapCategory(name){const s=(name||"").toLowerCase();return (s.includes("debt")||s.includes("hybrid")||s.includes("multi asset")||s.includes("multiasset"))?"Hybrid":"";}
async function fetchCombo(strategyname, servicetype){
  const body=new URLSearchParams();
  body.append("strategyname",strategyname); body.append("servicetype",servicetype);
  body.append("",""); body.append("","");
  body.append("fromMonth",String(Number(month))); body.append("fromYears",String(year)); body.append("asOnDate",asOnDateRequest);
  const res=await fetch(ENDPOINT,{method:"POST",headers:{
    "Content-Type":"application/x-www-form-urlencoded","Accept":"text/html,*/*",
    "Origin":"https://www.apmiindia.org","Referer":REFERER,
    "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  },body:body.toString()});
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${strategyname}/${servicetype}`);
  return await res.text();
}
function stripTags(s){return s.replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#8377;|₹/g,"").replace(/&[a-z]+;/gi," ").replace(/\s+/g," ").trim();}
function cleanName(s){if(!s)return"";let t=s.includes("-->")?s.slice(s.lastIndexOf("-->")+3):s;return t.replace(/\s+/g," ").trim();}
function parseRows(html){const rows=[];const trRe=/<tr[^>]*>([\s\S]*?)<\/tr>/gi;let m;while((m=trRe.exec(html))!==null){const cells=[];let c;const cellRe=/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;while((c=cellRe.exec(m[1]))!==null)cells.push(stripTags(c[1]));if(cells.length)rows.push(cells);}return rows;}
function num(v){if(v==null)return"";const t=String(v).replace(/[₹,%\s]/g,"");if(t===""||/^NA$|^ND$|^-+$/i.test(t))return"";return t;}
// Data rows: Provider, IA, AUM, 1M, 3M, 6M, 1Y, 2Y, 3Y, 4Y, 5Y, SI  (12 cells; NO 9-month)
function rowToRecord(cells){
  if(cells.length<12)return null;
  const[provider,ia,aum,m1,m3,m6,y1,y2,y3,y4,y5,si]=cells;
  if(!provider||!ia||/PMS Provider Name/i.test(provider))return null;
  return{provider:cleanName(provider),ia:cleanName(ia),aumCr:num(aum),m1:num(m1),m3:num(m3),m6:num(m6),y1:num(y1),y2:num(y2),y3:num(y3),y4:num(y4),y5:num(y5),si:num(si)};
}
function csvEscape(v){const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
async function main(){
  if(probe){
    console.log(`PROBE: Equity / D for ${MN[Number(month)]} ${year} …`);
    // Both dates, every probe — the request-side format is the one thing here
    // that has never been checked against a live response, so make it visible
    // before anyone spends time on the parser.
    console.log(`  POST asOnDate : ${asOnDateRequest}${asonIdx !== -1 ? "  (--ason override)" : "  (unpadded month, real month-end — format UNVERIFIED against a live call)"}`);
    console.log(`  CSV asOfDate  : ${asOfDateCsv}  (zero-padded — what the importer requires)`);
    const rows=parseRows(await fetchCombo("Equity","D"));
    const recs=rows.map(rowToRecord).filter(Boolean);
    console.log("Parsed <tr> rows:",rows.length,"| Mapped records:",recs.length);
    console.log("=== FIRST 5 MAPPED RECORDS ===");
    recs.slice(0,5).forEach(r=>console.log(JSON.stringify(r)));
    if(!recs.length)console.log("(none parsed — send this to Claude)");
    console.log("\nIf provider/IA/periods look right, re-run without --probe.");
    return;
  }
  const header=["strategyName","manager","category","aumCr","minInvestmentL","returns1m","returns3m","returns6m","returns1y","returns2y","returns3y","returns4y","returns5y","sinceInception","feesFixed","feesPerformance","feesHurdle","asOfDate","source","notes"];
  const lines=[header.join(",")];const seen=new Set();let total=0;
  for(const st of STRATEGIES)for(const svc of SERVICE_TYPES){
    let html;try{html=await fetchCombo(st,svc);}catch(e){console.error(`  ! ${st}/${svc}: ${e.message}`);continue;}
    const recs=parseRows(html).map(rowToRecord).filter(Boolean);let added=0;
    for(const r of recs){
      const key=`${r.provider}|||${r.ia}`;if(seen.has(key))continue;
      if(MIN_AUM>0&&(r.aumCr===""||parseFloat(r.aumCr)<MIN_AUM))continue;
      seen.add(key);
      lines.push([r.ia,r.provider,mapCategory(st+" "+r.ia),r.aumCr,"50",r.m1,r.m3,r.m6,r.y1,r.y2,r.y3,r.y4,r.y5,r.si,"","","",asOfDateCsv,SOURCE,""].map(csvEscape).join(","));
      added++;total++;
    }
    console.log(`  ${st} / ${svc}: ${added}`);
  }
  const{writeFileSync}=await import("node:fs");
  writeFileSync(OUT,lines.join("\n")+"\n","utf8");
  console.log(`\nWrote ${total} strategies to ${OUT}  (as on ${asOfDateCsv}, source: ${SOURCE})`);
  console.log(`  requested from APMI with asOnDate=${asOnDateRequest}`);
  console.log(`\nNext: npm run archive:pms          # snapshot what the site shows today, first`);
  console.log(`      npm run import:pms -- ${OUT} --dry-run`);
  console.log(`      npm run import:pms -- ${OUT}`);
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
