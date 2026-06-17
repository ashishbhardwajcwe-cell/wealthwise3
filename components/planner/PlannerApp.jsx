"use client";

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useCallback, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

// SUPABASE CONFIG
const SUPABASE_URL = "https://hbddsvwghboftjsgtate.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZGRzdndnaGJvZnRqc2d0YXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDA0NjMsImV4cCI6MjA5MDExNjQ2M30.kTyLJ1WTh2jyau0cqGsaxMfGwhwBwQOGU-eyMJiyNEs";
const DEMO_MODE = false;

// CASHFREE CONFIG
const PRO_PRICE = 999; // Amount in rupees (₹999)
const PRO_PRICE_DISPLAY = "₹999";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED COOKIE STORAGE — enables single sign-on with planmycashflows.com
// (marketing site). Both apps write the auth session to a cookie scoped
// to `.planmycashflows.com` so the browser shares it across subdomains.
// On localhost, falls back to a per-origin cookie (no Domain attribute).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getSharedCookieDomain() {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  if (!host || host === "localhost" || host === "127.0.0.1") return undefined;
  if (host === "planmycashflows.com" || host.endsWith(".planmycashflows.com")) return "planmycashflows.com";
  return undefined;
}

// Browsers silently drop cookies over ~4KB. Google OAuth sessions (JWT +
// provider token + profile) routinely exceed that, while email/password
// sessions fit — which made Google sign-in appear broken while email
// worked. Values are therefore split into <=3180-byte chunks stored as
// `key.0`, `key.1`, ... (same convention as @supabase/ssr).
const COOKIE_CHUNK_SIZE = 3180;

function readRawCookie(name) {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return m ? m[1] : null;
}

function writeRawCookie(name, value, maxAge) {
  if (typeof document === "undefined") return;
  const domain = getSharedCookieDomain();
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const parts = [`${name}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax"];
  if (isHttps) parts.push("Secure");
  if (domain) parts.push(`Domain=${domain}`);
  document.cookie = parts.join("; ");
}

const sharedCookieStorage = {
  getItem(key) {
    const single = readRawCookie(key);
    if (single !== null) return decodeURIComponent(single);
    let joined = "";
    for (let i = 0; ; i++) {
      const part = readRawCookie(`${key}.${i}`);
      if (part === null) return i > 0 ? decodeURIComponent(joined) : null;
      joined += part;
    }
  },
  setItem(key, value) {
    if (typeof document === "undefined") return;
    this.removeItem(key); // clear any stale single/chunked cookies first
    const encoded = encodeURIComponent(value);
    const yearSecs = 60 * 60 * 24 * 365;
    if (encoded.length <= COOKIE_CHUNK_SIZE) {
      writeRawCookie(key, encoded, yearSecs);
      return;
    }
    for (let i = 0; i * COOKIE_CHUNK_SIZE < encoded.length; i++) {
      writeRawCookie(`${key}.${i}`, encoded.slice(i * COOKIE_CHUNK_SIZE, (i + 1) * COOKIE_CHUNK_SIZE), yearSecs);
    }
  },
  removeItem(key) {
    if (typeof document === "undefined") return;
    writeRawCookie(key, "", 0);
    for (let i = 0; readRawCookie(`${key}.${i}`) !== null; i++) {
      writeRawCookie(`${key}.${i}`, "", 0);
    }
  },
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: sharedCookieStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// When an OAuth round-trip fails, Supabase redirects straight back to the
// site with the reason hidden in the URL (#error_description=... or
// ?error_description=...). The bounce takes under a second, so without
// surfacing it the Google button looks like it "does nothing". Capture the
// message at page load (and strip it from the URL) so the auth modal can
// display it. Error params never coexist with auth tokens, so stripping
// them cannot interfere with session detection.
function consumeOAuthErrorFromUrl() {
  if (typeof window === "undefined") return "";
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const search = new URLSearchParams(window.location.search);
  const desc =
    hash.get("error_description") || search.get("error_description") ||
    hash.get("error") || search.get("error");
  if (!desc) return "";
  window.history.replaceState(null, "", window.location.pathname);
  return `Google sign-in failed: ${desc}`;
}
const OAUTH_ERROR_AT_LOAD = consumeOAuthErrorFromUrl();

// THEME — Luxury Financial Aesthetic
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const T = {
  navy: "#0A1628", midnight: "#0F2035", ocean: "#142D4C",
  gold: "#C9A84C", goldLight: "#E4CC7A", goldDim: "#A08030",
  cream: "#FFFDF5", parchment: "#FFF9EC", sand: "#F5EFE0",
  white: "#FFFFFF", offwhite: "#FAFAF7",
  slate: "#5A6B80", steel: "#8899AA", silver: "#C4CDD5",
  emerald: "#10B981", ruby: "#EF4444", amber: "#F59E0B", teal: "#0891B2",
  chart: ["#0A1628","#C9A84C","#0891B2","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899"]
};
const DISPLAY = `'Playfair Display', Georgia, serif`;
const BODY = `'Inter', system-ui, sans-serif`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const fmt = (n) => {
  if (!n && n !== 0 || isNaN(n)) return "₹0";
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n/1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(n/1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};
const fv = (p,r,y) => p * Math.pow(1+r,y);
const pvCalc = (f,r,y) => y > 0 ? f / Math.pow(1+r,y) : f;
const sipReq = (f,r,y) => {
  if (y <= 0) return f;
  const rm = r/12, n = y*12;
  return rm === 0 ? f/n : (f*rm)/(Math.pow(1+rm,n)-1);
};
const retCorpus = (annExp, inf, portR, yToRet, yInRet) => {
  const expAtRet = annExp * Math.pow(1+inf, yToRet);
  const realR = (1+portR)/(1+inf) - 1;
  if (realR <= 0) return expAtRet * yInRet;
  return expAtRet * (1 - Math.pow(1+realR, -yInRet)) / realR;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLOBAL STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap');
    /* Reset is scoped to the planner subtree (.pmc-app) so it never strips
       padding/margins off the shared site Header + Footer, which rely on
       Tailwind's layered utilities (unlayered `*` would otherwise win). */
    .pmc-app, .pmc-app *, .pmc-app *::before, .pmc-app *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: ${BODY}; color: ${T.navy}; background: ${T.cream}; overflow-x: hidden; }
    input, select, textarea { font-family: ${BODY}; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: ${T.gold}; border-radius: 3px; }
    ::selection { background: ${T.gold}30; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes slideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.6; } }
    @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
    @keyframes float { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-8px); } }
    @keyframes scaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
    @keyframes glowPulse { 0%,100% { opacity:.5; transform:translate(-50%,-50%) scale(1); } 50% { opacity:.85; transform:translate(-50%,-50%) scale(1.08); } }
    @keyframes auroraShift { 0% { transform:translate3d(-5%,-3%,0) rotate(0deg); } 50% { transform:translate3d(5%,4%,0) rotate(7deg); } 100% { transform:translate3d(-5%,-3%,0) rotate(0deg); } }
    @keyframes bounceDown { 0%,100% { transform:translateX(-50%) translateY(0); opacity:.55; } 50% { transform:translateX(-50%) translateY(7px); opacity:1; } }
    .fadeUp { animation: fadeUp 0.7s ease both; }
    .fadeIn { animation: fadeIn 0.5s ease both; }
    .scaleIn { animation: scaleIn 0.4s ease both; }
    .hover-lift { transition: transform 0.3s, box-shadow 0.3s; }
    .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(10,22,40,0.12); }
    .gold-shimmer { background: linear-gradient(90deg, ${T.gold}, ${T.goldLight}, ${T.gold}); background-size: 200% auto; animation: shimmer 3s linear infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-ghost { transition: all 0.3s; }
    .hero-ghost:hover { background: rgba(255,255,255,0.16) !important; border-color: rgba(255,255,255,0.5) !important; transform: translateY(-2px); }
    .hero-grid { display:grid; grid-template-columns: 1.04fr 0.96fr; gap:52px; align-items:center; }
    .hero-copy { text-align:left; }
    .hero-actions { justify-content:flex-start; }
    .hero-stats { justify-content:flex-start; }
    .hero-preview { width:100%; max-width:440px; justify-self:end; }
    @media (max-width: 900px) {
      .hero-grid { grid-template-columns: 1fr; gap:48px; }
      .hero-copy { text-align:center; }
      .hero-sub { margin-left:auto; margin-right:auto; }
      .hero-actions { justify-content:center; }
      .hero-stats { justify-content:center; }
      .hero-preview { margin:0 auto; justify-self:center; }
    }
    .glass { background: rgba(255,255,255,0.7); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(201,168,76,0.15); }
    input:focus, select:focus { outline: none; border-color: ${T.gold} !important; box-shadow: 0 0 0 3px ${T.gold}20 !important; }
    .btn-gold { background: linear-gradient(135deg, ${T.gold}, ${T.goldLight}); color: ${T.navy}; border: none; font-weight: 700; cursor: pointer; transition: all 0.3s; }
    .btn-gold:hover { box-shadow: 0 8px 32px ${T.gold}50; transform: translateY(-2px); }
    .btn-navy { background: ${T.navy}; color: ${T.white}; border: none; font-weight: 600; cursor: pointer; transition: all 0.3s; }
    .btn-navy:hover { background: ${T.midnight}; box-shadow: 0 8px 24px ${T.navy}30; }
    .drill-slice { cursor: pointer; outline: none; transition: opacity 0.2s; }
    .drill-slice:hover { opacity: 0.82; }
    /* Print / PDF export */
    .print-cover, .print-only { display: none; }
    @media print {
      .no-print { display: none !important; }
      body { background: #fff !important; }
      .hover-lift { box-shadow: none !important; transform: none !important; }
      .report-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 22px !important; }
      .print-cover { display: flex !important; }
      .print-only { display: block !important; }
      @page { margin: 14mm; size: A4; }
    }
  `}</style>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Field = ({ label, value, onChange, type="text", placeholder, prefix, suffix, options, note }) => (
  <div style={{ marginBottom: 18 }}>
    {label && <label style={{ display:"block", marginBottom:6, fontSize:12, fontWeight:600, color:T.slate, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</label>}
    {options ? (
      <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", padding:"12px 16px", border:`1.5px solid ${T.silver}40`, borderRadius:10, fontSize:15, background:T.white, cursor:"pointer", color:T.navy, appearance:"auto" }}>
        {options.map(o => <option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    ) : (
      <div style={{ position:"relative" }}>
        {prefix && <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:T.slate, fontWeight:700, fontSize:14 }}>{prefix}</span>}
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{ width:"100%", padding:"12px 16px", paddingLeft: prefix?"34px":"16px", border:`1.5px solid ${T.silver}40`, borderRadius:10, fontSize:15, color:T.navy, background:T.white }} />
        {suffix && <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:T.steel, fontSize:13, fontWeight:500 }}>{suffix}</span>}
      </div>
    )}
    {note && <div style={{ fontSize:12, color:T.steel, marginTop:4, fontStyle:"italic" }}>{note}</div>}
  </div>
);

const MetricCard = ({ label, value, sub, color=T.teal, icon }) => (
  <div className="hover-lift" style={{ background:T.white, borderRadius:14, padding:20, boxShadow:"0 2px 16px rgba(10,22,40,0.06)", borderLeft:`4px solid ${color}`, display:"flex", flexDirection:"column", gap:3 }}>
    <div style={{ fontSize:11, fontWeight:600, color:T.steel, textTransform:"uppercase", letterSpacing:"0.08em" }}>{icon} {label}</div>
    <div style={{ fontSize:26, fontWeight:800, color:T.navy, fontFamily:DISPLAY }}>{value}</div>
    {sub && <div style={{ fontSize:13, color, fontWeight:500 }}>{sub}</div>}
  </div>
);

const SectionHead = ({ icon, children, sub }) => (
  <div style={{ marginBottom:24 }}>
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg, ${T.navy}, ${T.ocean})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, color:T.gold, boxShadow:`0 4px 16px ${T.navy}30` }}>{icon}</div>
      <h2 style={{ fontFamily:DISPLAY, fontSize:28, fontWeight:700, color:T.navy }}>{children}</h2>
    </div>
    {sub && <p style={{ marginTop:6, marginLeft:60, fontSize:14, color:T.steel }}>{sub}</p>}
  </div>
);

const ProgressBar = ({ value, max=100, color=T.gold, label }) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:13 }}>
      <span style={{ fontWeight:600, color:T.navy }}>{label}</span>
      <span style={{ color:T.slate, fontWeight:600 }}>{Math.min(value,max).toFixed(0)}%</span>
    </div>
    <div style={{ height:8, borderRadius:4, background:`${T.silver}30` }}>
      <div style={{ height:"100%", borderRadius:4, background:`linear-gradient(90deg, ${color}, ${color}BB)`, width:`${Math.min((value/max)*100,100)}%`, transition:"width 1.2s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  </div>
);

const Badge = ({ children, color=T.teal }) => (
  <span style={{ display:"inline-block", padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:700, background:`${color}12`, color, letterSpacing:"0.03em" }}>{children}</span>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AuthModal = ({ show, onClose, onSignIn, onDemo }) => {
  const [mode, setMode] = useState("register"); // register | signin
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:"", mobile:"", email:"", password:"" });
  const [error, setError] = useState(OAUTH_ERROR_AT_LOAD);
  if (!show) return null;

  const set = (k) => (e) => { setForm(p => ({...p, [k]: e.target.value})); setError(""); };

  const handleGoogle = async () => {
    setLoading(true); setError("");
    // Round-trip through Google OAuth and come back with ?app=1 so the
    // deep-link logic skips the marketing landing and goes straight to
    // the planner dashboard.
    const redirectTo = `${window.location.origin}/?app=1`;
    const { error } = await supabase.auth.signInWithOAuth({ provider:"google", options:{ redirectTo } });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handleSubmit = async () => {
    setError("");
    if (mode === "register") {
      if (!form.name.trim()) return setError("Full name is required");
      if (!form.email.trim()) return setError("Email is required");
      if (form.password.length < 6) return setError("Password must be at least 6 characters");
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.name.trim(), phone: form.mobile.trim() } }
      });
      setLoading(false);
      if (error) return setError(error.message);
      if (data.user) onSignIn(data.user);
    } else {
      if (!form.email.trim() || !form.password) return setError("Email and password required");
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      setLoading(false);
      if (error) return setError(error.message);
      if (data.user) onSignIn(data.user);
    }
  };

  const inputStyle = {
    width:"100%", padding:"9px 14px", borderRadius:9,
    border:`1.5px solid rgba(255,255,255,0.1)`,
    background:"rgba(255,255,255,0.06)", color:T.white, fontSize:14,
    fontFamily:BODY, outline:"none", transition:"border-color 0.2s",
  };
  const labelStyle = { display:"block", fontSize:10, fontWeight:700, color:`${T.white}60`, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 };

  return (
    <div className="fadeIn" style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:60, background:"rgba(5,12,25,0.70)", backdropFilter:"blur(8px)", overflowY:"auto" }}>
      <div className="scaleIn" style={{ background:"#0D1B2E", borderRadius:18, padding:"20px 24px 20px", width:"min(380px,94vw)", boxShadow:"0 24px 60px rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.07)", position:"relative", marginBottom:24 }}>

        {/* Brand */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:14 }}>
          <img src="/auris-logo.png" alt="PlanMyCashflows" style={{ height:36, objectFit:"contain" }} />
          <span style={{ fontFamily:DISPLAY, fontSize:20, fontWeight:700, color:T.white }}>PlanMy<span style={{ color:T.gold }}>Cashflows</span></span>
        </div>

        {/* Title */}
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <h2 style={{ fontFamily:DISPLAY, fontSize:20, fontWeight:700, color:T.white, marginBottom:4 }}>
            {mode === "register" ? "Create your account" : "Welcome back"}
          </h2>
          <p style={{ fontSize:12, color:`${T.white}55` }}>
            {mode === "register" ? "Sign up to save & access your financial plan" : "Sign in to continue to PlanMyCashflows"}
          </p>
        </div>

        {/* Fields */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {mode === "register" && (
            <div>
              <label style={labelStyle}>Full Name</label>
              <input value={form.name} onChange={set("name")} placeholder="Rajesh Kumar" style={inputStyle} />
            </div>
          )}
          {mode === "register" && (
            <div>
              <label style={labelStyle}>Mobile Number</label>
              <input value={form.mobile} onChange={set("mobile")} placeholder="+91 98765 43210" type="tel" style={inputStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Email Address</label>
            <input value={form.email} onChange={set("email")} placeholder="you@example.com" type="email" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input value={form.password} onChange={set("password")} placeholder="Min. 6 characters" type="password" style={inputStyle} />
          </div>
        </div>

        {error && <p style={{ color:"#ff6b6b", fontSize:12, marginTop:8, textAlign:"center" }}>{error}</p>}

        {/* Primary CTA */}
        <button onClick={handleSubmit} disabled={loading} className="btn-gold" style={{ width:"100%", padding:"11px", borderRadius:10, fontSize:15, fontWeight:700, marginTop:14, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? <div style={{ width:18, height:18, border:`3px solid ${T.navy}40`, borderTopColor:T.navy, borderRadius:"50%", animation:"pulse 0.8s infinite", margin:"0 auto" }} /> : mode === "register" ? "Create Account" : "Sign In"}
        </button>

        {/* Divider */}
        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"12px 0" }}>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize:11, color:`${T.white}35`, fontWeight:500 }}>or</span>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.1)" }} />
        </div>

        {/* Google */}
        <button onClick={handleGoogle} disabled={loading} style={{
          width:"100%", padding:"10px 24px", borderRadius:10, border:"1.5px solid rgba(255,255,255,0.12)",
          background:"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          fontSize:14, fontWeight:600, color:T.white, cursor:"pointer", transition:"all 0.3s"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        {/* Demo */}
        <button onClick={onDemo} style={{
          width:"100%", padding:"9px", borderRadius:10, border:`1px solid ${T.gold}25`,
          background:"transparent", fontSize:12, fontWeight:600, color:`${T.gold}BB`,
          cursor:"pointer", marginTop:8, transition:"all 0.2s"
        }}>
          👀 Try Demo — No Sign In Required
        </button>

        {/* Toggle */}
        <p style={{ textAlign:"center", marginTop:14, fontSize:12, color:`${T.white}45` }}>
          {mode === "register" ? "Already have an account? " : "Don't have an account? "}
          <span onClick={()=>{ setMode(mode==="register"?"signin":"register"); setError(""); }} style={{ color:T.goldLight, fontWeight:600, cursor:"pointer" }}>
            {mode === "register" ? "Sign In" : "Create Account"}
          </span>
        </p>

        {/* Close */}
        <button onClick={onClose} style={{ position:"absolute", top:12, right:12, background:"rgba(255,255,255,0.08)", border:"none", borderRadius:8, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:`${T.white}70`, fontSize:14 }}>✕</button>
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NAVBAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Navbar = ({ user, isDemo, onAuthClick, onLogout, onLogoClick, onGuided, guidedActive }) => (
  <nav className="glass-nav no-print" style={{ position:"sticky", top:0, zIndex:100, padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
    <div onClick={onLogoClick} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
      <img src="/auris-logo.png" alt="PlanMyCashflows" style={{ height:44, objectFit:"contain" }} />
    </div>
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      {/* GUIDED PLAN TAB — separate YNAB-style guided experience */}
      {onGuided && (
        <button onClick={onGuided}
          style={{
            padding:"8px 16px", borderRadius:10, fontSize:12, fontWeight:700,
            background: guidedActive ? `linear-gradient(135deg, ${T.gold}, ${T.goldLight})` : `${T.navy}08`,
            color: guidedActive ? T.navy : T.navy, border:`1px solid ${guidedActive ? T.gold : T.silver+"40"}`,
            display:"inline-flex", alignItems:"center", gap:6, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.3s"
          }}>
          ✨ Guided Plan
        </button>
      )}
      {/* FREE GUIDE BUTTON — shown when logged in or demo */}
      {(user || isDemo) && (
        <a href="/auris-financial-independence-playbook.pdf" download
          style={{
            padding:"8px 16px", borderRadius:10, fontSize:12, fontWeight:700,
            background:`${T.gold}12`, color:T.gold, border:`1px solid ${T.gold}30`,
            textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6,
            transition:"all 0.3s", cursor:"pointer", whiteSpace:"nowrap"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${T.gold}25`; e.currentTarget.style.borderColor = T.gold; }}
          onMouseLeave={e => { e.currentTarget.style.background = `${T.gold}12`; e.currentTarget.style.borderColor = `${T.gold}30`; }}
        >
          📘 Free Guide
        </a>
      )}
      {isDemo ? (
        <>
          <span style={{ fontSize:12, fontWeight:700, color:T.gold, background:`${T.gold}15`, padding:"4px 12px", borderRadius:20, letterSpacing:"0.05em" }}>DEMO MODE</span>
          <button onClick={onAuthClick} className="btn-gold" style={{ padding:"8px 20px", borderRadius:10, fontSize:13 }}>Sign In to Save</button>
          <button onClick={onLogout} style={{ padding:"8px 14px", borderRadius:8, fontSize:13, background:"transparent", border:`1px solid ${T.silver}50`, color:T.slate, cursor:"pointer" }}>Exit Demo</button>
        </>
      ) : user ? (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:`linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:T.navy }}>
              {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
            </div>
            <span style={{ fontSize:14, fontWeight:600, color:T.navy, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.user_metadata?.full_name || user.email}</span>
          </div>
          <button onClick={onLogout} className="btn-navy" style={{ padding:"8px 16px", borderRadius:8, fontSize:13 }}>Logout</button>
        </>
      ) : (
        <button onClick={onAuthClick} className="btn-gold" style={{ padding:"10px 24px", borderRadius:10, fontSize:14, letterSpacing:"0.02em" }}>Sign In</button>
      )}
    </div>
  </nav>
);
 
// A premium glass "product preview" mock for the hero — shows, at a glance,
// what the planner produces (net worth, allocation, goal funding). Numbers
// are illustrative only.
const HeroPreview = () => (
  <div className="hero-preview fadeUp" style={{ animationDelay:"0.32s", position:"relative" }}>
    <div style={{ position:"absolute", inset:-26, background:`radial-gradient(circle at 68% 22%, ${T.gold}2e, transparent 62%)`, filter:"blur(36px)", pointerEvents:"none" }} />
    <div style={{ position:"relative", borderRadius:20, background:"rgba(255,255,255,0.97)", boxShadow:"0 36px 90px rgba(0,0,0,0.45)", border:"1px solid rgba(255,255,255,0.55)", overflow:"hidden", animation:"float 7s ease-in-out infinite" }}>
      {/* window chrome */}
      <div style={{ display:"flex", alignItems:"center", gap:7, padding:"12px 16px", background:T.offwhite, borderBottom:`1px solid ${T.silver}33` }}>
        <span style={{ width:10, height:10, borderRadius:"50%", background:"#FF5F57" }} />
        <span style={{ width:10, height:10, borderRadius:"50%", background:"#FEBC2E" }} />
        <span style={{ width:10, height:10, borderRadius:"50%", background:"#28C840" }} />
        <span style={{ marginLeft:8, fontSize:11, fontWeight:600, color:T.slate }}>PlanMyCashflows · Wealth Plan</span>
      </div>
      <div style={{ padding:"18px 20px 20px" }}>
        {/* Net worth + allocation donut */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.steel }}>Net Worth</div>
            <div style={{ fontFamily:DISPLAY, fontSize:30, fontWeight:800, color:T.navy, lineHeight:1.1, marginTop:4 }}>₹4.82 Cr</div>
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:7, fontSize:11, fontWeight:700, color:T.emerald, background:`${T.emerald}14`, padding:"3px 9px", borderRadius:20 }}>On track ✓</span>
          </div>
          <div style={{ position:"relative", width:88, height:88, borderRadius:"50%", background:`conic-gradient(${T.navy} 0% 40%, ${T.teal} 40% 62%, ${T.gold} 62% 84%, ${T.silver} 84% 100%)` }}>
            <div style={{ position:"absolute", inset:13, borderRadius:"50%", background:T.white, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:T.steel }}>Allocation</div>
          </div>
        </div>
        {/* Net-worth trajectory sparkline */}
        <div style={{ marginTop:14 }}>
          <svg viewBox="0 0 320 80" preserveAspectRatio="none" style={{ width:"100%", height:64, display:"block" }} aria-hidden>
            <defs><linearGradient id="hpArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.gold} stopOpacity="0.4"/><stop offset="100%" stopColor={T.gold} stopOpacity="0"/></linearGradient></defs>
            <path d="M0,64 C40,56 60,52 90,44 C120,36 140,40 170,29 C200,18 220,22 250,14 C280,7 300,9 320,4 L320,80 L0,80 Z" fill="url(#hpArea)"/>
            <path d="M0,64 C40,56 60,52 90,44 C120,36 140,40 170,29 C200,18 220,22 250,14 C280,7 300,9 320,4" fill="none" stroke={T.gold} strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Goal funding bars */}
        <div style={{ marginTop:10 }}>
          {[["Retirement",72,T.navy],["Children's Education",54,T.teal],["Financial Freedom",61,T.gold]].map(([name,pct,color]) => (
            <div key={name} style={{ marginTop:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, fontWeight:600, color:T.slate, marginBottom:5 }}><span>{name}</span><span style={{ color:T.navy, fontWeight:700 }}>{pct}%</span></div>
              <div style={{ height:7, borderRadius:5, background:`${T.silver}33`, overflow:"hidden" }}><div style={{ width:`${pct}%`, height:"100%", borderRadius:5, background:`linear-gradient(90deg, ${color}, ${color}cc)` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div style={{ textAlign:"center", marginTop:10, fontSize:10, color:`${T.white}45`, fontStyle:"italic" }}>Illustrative preview</div>
  </div>
);

const Landing = ({ onGetStarted, onAuth }) => (
  <div>
    {/* Hero */}
    <section style={{ position:"relative", overflow:"hidden", padding:"clamp(44px,8vh,104px) 24px", background:`linear-gradient(160deg, ${T.navy} 0%, ${T.ocean} 45%, ${T.midnight} 100%)` }}>
      {/* Ambient spotlight */}
      <div style={{ position:"absolute", top:"38%", left:"40%", width:760, height:760, borderRadius:"50%", background:`radial-gradient(circle, ${T.gold}14 0%, ${T.gold}06 35%, transparent 68%)`, animation:"glowPulse 9s ease-in-out infinite", pointerEvents:"none" }} />
      {/* Slow-drifting aurora sheen */}
      <div style={{ position:"absolute", inset:"-20%", background:`radial-gradient(40% 50% at 22% 28%, ${T.teal}14 0%, transparent 60%), radial-gradient(38% 46% at 80% 66%, ${T.gold}12 0%, transparent 62%)`, filter:"blur(22px)", animation:"auroraShift 26s ease-in-out infinite", pointerEvents:"none" }} />
      {/* Floating orbs */}
      <div style={{ position:"absolute", top:"8%", right:"4%", width:280, height:280, borderRadius:"50%", background:`radial-gradient(circle, ${T.gold}12 0%, transparent 70%)`, animation:"float 6s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"10%", left:"6%", width:220, height:220, borderRadius:"50%", background:`radial-gradient(circle, ${T.teal}12 0%, transparent 70%)`, animation:"float 8s ease-in-out infinite 1s", pointerEvents:"none" }} />
      <div style={{ position:"absolute", inset:0, background:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A84C' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, pointerEvents:"none" }} />

      <div className="hero-grid" style={{ position:"relative", zIndex:1, maxWidth:1180, margin:"0 auto" }}>
        {/* Left — copy */}
        <div className="hero-copy">
          <div className="fadeUp" style={{ animationDelay:"0.05s" }}>
            <Badge color={T.goldLight}>PlanMyCashflows — Expert Wealth Advisory</Badge>
          </div>
          <h1 className="fadeUp" style={{ animationDelay:"0.12s", fontFamily:DISPLAY, fontSize:"clamp(34px,4.6vw,56px)", fontWeight:700, color:T.white, lineHeight:1.1, letterSpacing:"-0.5px", marginTop:18 }}>
            Your Roadmap to<br/><span className="gold-shimmer">Financial Independence</span>
          </h1>
          <p className="hero-sub fadeUp" style={{ animationDelay:"0.2s", color:`${T.white}85`, fontSize:17, maxWidth:520, marginTop:20, lineHeight:1.7 }}>
            Built for discerning HNI clients & wealth planners. Input your income, assets and goals — get a comprehensive financial roadmap with retirement projections, estate-planning insights, and AI-powered advisory.
          </p>
          <div className="hero-actions fadeUp" style={{ animationDelay:"0.28s", display:"flex", gap:14, marginTop:32, flexWrap:"wrap" }}>
            <button onClick={onGetStarted} className="btn-gold" style={{ padding:"15px 38px", borderRadius:14, fontSize:16, letterSpacing:"0.03em" }}>
              Start Your Plan →
            </button>
            <button onClick={onAuth} className="hero-ghost" style={{ padding:"15px 30px", borderRadius:14, fontSize:15, background:`${T.white}10`, color:T.white, border:`1.5px solid ${T.white}30`, cursor:"pointer", fontWeight:600 }}>
              Sign In
            </button>
          </div>
          <div className="hero-stats fadeUp" style={{ animationDelay:"0.36s", display:"flex", gap:36, marginTop:38, flexWrap:"wrap" }}>
            {[["500+","Clients Guided"],["₹12Cr+","Tax Savings Found"],["4.9★","Client Rating"]].map(([n,l]) => (
              <div key={l}>
                <div style={{ fontFamily:DISPLAY, fontSize:28, fontWeight:700, color:T.gold }}>{n}</div>
                <div style={{ fontSize:12, color:`${T.white}60`, fontWeight:500, marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — product preview */}
        <HeroPreview />
      </div>
    </section>

    {/* Features */}
    <section style={{ padding:"80px 24px", maxWidth:1000, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:56 }}>
        <h2 style={{ fontFamily:DISPLAY, fontSize:36, fontWeight:700, color:T.navy }}>Everything You Need</h2>
        <p style={{ color:T.steel, marginTop:8, fontSize:16 }}>A complete financial planning suite — just like professional wealth advisors use</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px,1fr))", gap:20 }}>
        {[
          { icon:"📊", title:"Net Worth Analysis", desc:"Track all your assets, liabilities, and financial ratios with visual dashboards." },
          { icon:"🎯", title:"Goal Planning", desc:"Education, retirement, house, wedding — see exact SIP & lumpsum needed for each." },
          { icon:"🏖️", title:"Retirement Scenarios", desc:"Three-scenario modeling showing base, aggressive, and highly aggressive paths." },
          { icon:"💰", title:"Cashflow Projections", desc:"5-year income vs expense forecasts with savings ratio tracking." },
          { icon:"🔍", title:"SWOT Analysis", desc:"Auto-generated strengths, weaknesses, opportunities and threats for your finances." },
          { icon:"🤖", title:"AI Pro Analysis", desc:"Get personalised AI-powered recommendations — just like a human wealth advisor.", pro: true },
        ].map(f => (
          <div key={f.title} className="hover-lift" style={{ background:T.white, borderRadius:16, padding:28, boxShadow:"0 2px 16px rgba(10,22,40,0.05)", border:`1px solid ${f.pro ? T.gold : T.silver}20`, position:"relative" }}>
            {f.pro && <div style={{ position:"absolute", top:12, right:12 }}><Badge color={T.gold}>PRO</Badge></div>}
            <div style={{ width:48, height:48, borderRadius:14, background:f.pro ? `linear-gradient(135deg, ${T.gold}15, ${T.goldLight}10)` : `${T.navy}08`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:16 }}>{f.icon}</div>
            <h3 style={{ fontFamily:DISPLAY, fontSize:20, fontWeight:700, color:T.navy, marginBottom:8 }}>{f.title}</h3>
            <p style={{ fontSize:14, color:T.slate, lineHeight:1.7 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ── TRUST BAR ─────────────────────────────────────── */}
    <section style={{ padding:"0 24px", marginTop:-28, position:"relative", zIndex:3 }}>
      <div style={{ maxWidth:860, margin:"0 auto", background:T.white, borderRadius:16, boxShadow:"0 8px 40px rgba(10,22,40,0.09)", padding:"28px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:20 }}>
        {[["500+","Clients Guided"],["₹12Cr+","Tax Savings Found"],["4.9★","Client Rating"],["15min","Avg. Response Time"]].map(([num,lbl]) => (
          <div key={lbl} style={{ textAlign:"center", flex:"1 1 120px" }}>
            <div style={{ fontFamily:DISPLAY, fontSize:26, fontWeight:700, color:T.navy }}>{num}</div>
            <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4, fontWeight:500, letterSpacing:"0.3px" }}>{lbl}</div>
          </div>
        ))}
      </div>
    </section>

    {/* ── YOUR JOURNEY (HNI) ──────────────────────────────── */}
    <section style={{ padding:"88px 24px 72px", maxWidth:1000, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:52 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ width:28, height:1, background:T.gold, display:"block" }} />
          <span style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:"2px", textTransform:"uppercase" }}>Your Journey</span>
        </div>
        <h2 style={{ fontFamily:DISPLAY, fontSize:"clamp(28px,3.8vw,42px)", fontWeight:700, color:T.navy, lineHeight:1.12, letterSpacing:"-1px" }}>Wherever You Are,<br/>We Meet You There</h2>
        <p style={{ fontSize:15, color:T.slate, maxWidth:500, margin:"14px auto 0", lineHeight:1.75 }}>Whether you're an HNI building a legacy or a professional starting out — expert guidance matched to your exact stage of life.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px,1fr))", gap:20 }}>
        {[
          { icon:"🌱", title:"Just Starting Out", desc:"First income, building emergency funds, understanding tax regimes, starting your first SIP — get the foundation right from day one." },
          { icon:"🏗️", title:"Building Wealth", desc:"Tax optimisation across 80C/80D/HRA, insurance planning, home-buying decisions, portfolio diversification — grow your wealth strategically." },
          { icon:"👑", title:"HNI & Legacy Planning", desc:"Retirement corpus, family office strategy, estate planning, alternate investments, passive income streams — protect and grow everything you've built.", highlight: true },
        ].map(f => (
          <div key={f.title} className="hover-lift" style={{ background:f.highlight ? `linear-gradient(135deg, ${T.navy}, ${T.ocean})` : T.white, borderRadius:18, padding:"36px 28px", boxShadow:f.highlight ? `0 12px 36px rgba(10,22,40,0.18)` : "0 2px 16px rgba(10,22,40,0.05)", border:`1.5px solid ${f.highlight ? T.gold+"40" : T.silver+"30"}`, position:"relative", overflow:"hidden" }}>
            {f.highlight && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${T.gold}, ${T.goldLight})` }} />}
            <div style={{ fontSize:32, marginBottom:18 }}>{f.icon}</div>
            <h3 style={{ fontFamily:DISPLAY, fontSize:22, fontWeight:700, color:f.highlight ? T.white : T.navy, marginBottom:10, letterSpacing:"-0.3px" }}>{f.title}</h3>
            <p style={{ fontSize:14, color:f.highlight ? `rgba(255,255,255,0.6)` : T.slate, lineHeight:1.7 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ── TESTIMONIALS ─────────────────────────────────────── */}
    <section style={{ padding:"72px 24px", background:`linear-gradient(180deg, ${T.cream} 0%, ${T.parchment} 100%)` }}>
      <div style={{ maxWidth:1000, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <span style={{ width:28, height:1, background:T.gold, display:"block" }} />
            <span style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:"2px", textTransform:"uppercase" }}>Client Stories</span>
          </div>
          <h2 style={{ fontFamily:DISPLAY, fontSize:"clamp(28px,3.8vw,42px)", fontWeight:700, color:T.navy, lineHeight:1.12, letterSpacing:"-1px" }}>What Our Clients Say</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px,1fr))", gap:20 }}>
          {[
            { stars:"★★★★★", quote:"The comprehensive plan was a game-changer. I was paying ₹80,000 extra in taxes every year. The recommendations alone saved me more than the plan cost.", name:"Priya Mehta", role:"IT Professional, Bangalore" },
            { stars:"★★★★★", quote:"First time someone explained insurance vs investment in a way that actually made sense. No jargon, no sales pitch — just honest, actionable advice.", name:"Amit Verma", role:"Business Owner, Delhi" },
            { stars:"★★★★★", quote:"As an HNI client, I needed nuanced estate and portfolio guidance. The annual advisory package gave me exactly that — quarterly reviews and always-on support.", name:"Sneha Reddy", role:"Senior Executive, Hyderabad" },
          ].map(t => (
            <div key={t.name} className="hover-lift" style={{ background:T.white, border:`1px solid ${T.silver}30`, borderRadius:16, padding:"32px 28px" }}>
              <div style={{ color:T.gold, fontSize:15, letterSpacing:"2px", marginBottom:14 }}>{t.stars}</div>
              <p style={{ fontFamily:DISPLAY, fontSize:17, fontStyle:"italic", color:T.slate, lineHeight:1.7, marginBottom:20 }}>"{t.quote}"</p>
              <div style={{ fontSize:14, fontWeight:700, color:T.navy }}>{t.name}</div>
              <div style={{ fontSize:12, color:"#9CA3AF" }}>{t.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── LIFECYCLE SUPPORT ──────────────────────────────── */}
    <LifecycleSupport T={T} DISPLAY={DISPLAY} />

    {/* CTA */}
    <section style={{ padding:"60px 24px", background:`linear-gradient(135deg, ${T.navy}, ${T.ocean})`, textAlign:"center" }}>
      <h2 style={{ fontFamily:DISPLAY, fontSize:32, fontWeight:700, color:T.white }}>Ready to Plan Your Financial Future?</h2>
      <p style={{ color:`${T.white}70`, marginTop:8, fontSize:16 }}>It takes just 5 minutes to create your comprehensive financial plan</p>
      <button onClick={onGetStarted} className="btn-gold" style={{ marginTop:28, padding:"16px 48px", borderRadius:14, fontSize:17 }}>Create My Plan — Free →</button>
    </section>

  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEFAULT FORM DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const defaultData = {
  name:"", dob:"1990-01-01", retirementAge:55, lifeExpectancy:85, city:"", riskProfile:"Balanced",
  spouseName:"", spouseDob:"",
  salaryMonthly:150000, otherIncomeMonthly:0, incomeGrowth:5,
  householdExp:50000, childcareExp:15000, giftsExp:5000, vacationExp:10000, otherExp:5000,
  generalInflation:6, educationInflation:10, medicalInflation:12,
  equityReturn:13, debtReturn:7, goldReturn:8, realEstateReturn:5,
  equityAlloc:70, debtAlloc:30,
  assets:[{ name:"Mutual Funds", type:"Equity", value:500000 },{ name:"PPF/EPF", type:"Debt", value:800000 },{ name:"Savings Account", type:"Debt", value:200000 }],
  physicalAssets:[{ name:"Self-Occupied House", value:5000000 }],
  liabilities:[],
  goals:[
    { name:"Child Education", year:2035, currentValue:2500000, inflation:10, priority:"High" },
    { name:"Retirement Corpus", year:2040, currentValue:1200000, inflation:6, priority:"High", recurring:true },
    { name:"Dream Home Upgrade", year:2038, currentValue:10000000, inflation:5, priority:"Medium" },
  ],
  sipMonthly:30000, pfMonthly:15000,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEMO DATA — realistic pre-filled Indian user profile
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const demoData = {
  name:"Rahul Sharma", dob:"1988-06-15", retirementAge:55, lifeExpectancy:85, city:"Mumbai", riskProfile:"Balanced",
  spouseName:"Priya Sharma", spouseDob:"1990-03-22",
  salaryMonthly:200000, otherIncomeMonthly:15000, incomeGrowth:8,
  householdExp:60000, childcareExp:20000, giftsExp:8000, vacationExp:15000, otherExp:7000,
  generalInflation:6, educationInflation:10, medicalInflation:12,
  equityReturn:13, debtReturn:7, goldReturn:8, realEstateReturn:5,
  equityAlloc:70, debtAlloc:30,
  assets:[
    { name:"Mutual Funds (SIP)", type:"Equity", value:1800000, detail:[
      { name:"Financials", value:540000, children:[ { name:"India", value:430000 }, { name:"US", value:110000 } ] },
      { name:"Information Technology", value:450000, children:[ { name:"India", value:300000 }, { name:"US", value:150000 } ] },
      { name:"Energy", value:270000, children:[ { name:"India", value:270000 } ] },
      { name:"Consumer", value:360000, children:[ { name:"India", value:280000 }, { name:"US", value:80000 } ] },
      { name:"Healthcare", value:180000, children:[ { name:"India", value:120000 }, { name:"US", value:60000 } ] },
    ] },
    { name:"PPF / EPF", type:"Debt", value:2200000 },
    { name:"Stocks (Direct)", type:"Equity", value:600000, detail:[
      { name:"Financials", value:240000, children:[ { name:"India", value:240000 } ] },
      { name:"Information Technology", value:180000, children:[ { name:"India", value:120000 }, { name:"US", value:60000 } ] },
      { name:"Consumer", value:120000, children:[ { name:"India", value:120000 } ] },
      { name:"Energy", value:60000, children:[ { name:"India", value:60000 } ] },
    ] },
    { name:"Fixed Deposits", type:"Debt", value:500000 },
    { name:"Savings Account", type:"Debt", value:300000 },
    { name:"Gold ETF", type:"Gold", value:400000 },
  ],
  physicalAssets:[
    { name:"Self-Occupied Home (Mumbai)", value:12000000 },
    { name:"Gold Jewellery", value:800000 },
  ],
  liabilities:[
    { name:"Home Loan", emi:45000, outstanding:4500000, rate:8.5 },
  ],
  goals:[
    { name:"Child's Higher Education", year:2034, currentValue:3000000, inflation:10, priority:"High" },
    { name:"Retirement Corpus", year:2043, currentValue:15000000, inflation:6, priority:"High", recurring:true },
    { name:"Daughter's Wedding", year:2040, currentValue:2500000, inflation:7, priority:"Medium" },
    { name:"Second Home / Upgrade", year:2038, currentValue:8000000, inflation:5, priority:"Low" },
  ],
  sipMonthly:40000, pfMonthly:20000,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEMO BANNER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DemoBanner = ({ onSignIn }) => (
  <div className="no-print" style={{ background:`linear-gradient(90deg, ${T.gold}22, ${T.goldLight}18, ${T.gold}22)`, borderBottom:`1px solid ${T.gold}30`, padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"center", gap:16, flexWrap:"wrap" }}>
    <span style={{ fontSize:13, fontWeight:600, color:T.navy }}>
      👀 You're exploring a <strong>Demo</strong> — data is sample only and won't be saved.
    </span>
    <button onClick={onSignIn} className="btn-gold" style={{ padding:"6px 20px", borderRadius:8, fontSize:13, fontWeight:700 }}>
      Sign In to Save Your Real Plan →
    </button>
  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD (Form + Report)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const STEPS = [
  { id:"personal", title:"Personal", icon:"👤" },
  { id:"income", title:"Income & Expenses", icon:"💰" },
  { id:"assets", title:"Assets", icon:"🏦" },
  { id:"goals", title:"Goals", icon:"🎯" },
  { id:"settings", title:"Settings", icon:"⚙️" },
];

const Dashboard = ({ user, isDemo, onAuthClick, onLogout }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(isDemo ? demoData : defaultData);
  const [showReport, setShowReport] = useState(isDemo);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showProModal, setShowProModal] = useState(false);

  const update = (k,v) => setData(p => ({...p, [k]:v}));

  const saveToSupabase = async () => {
    if (!DEMO_MODE && !isDemo && user?.id !== "guest") {
      await supabase.from("financial_plans").upsert([{ user_id: user.id, plan_data: data, updated_at: new Date().toISOString() }]);
    }
  };

  const generateReport = () => {
    saveToSupabase();
    setShowReport(true);
    setAiAnalysis(null);
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const runAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert("Please sign in to use AI analysis"); setAiLoading(false); return; }
      const response = await fetch(
        SUPABASE_URL + "/functions/v1/ai-analysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + session.access_token },
          body: JSON.stringify({ planData: data }),
        }
      );
      const result = await response.json();
      if (result.error && result.error !== "PRO_REQUIRED") { alert(result.error); setAiLoading(false); return; }
      if (!result.error) { setAiAnalysis(result.analysis); setAiLoading(false); return; }
    } catch (err) { console.error("AI error:", err); }
    // Fallback to simulated if Edge Function fails
    await new Promise(r => setTimeout(r, 2000));
    const age = getAge();
    const totalInc = data.salaryMonthly + data.otherIncomeMonthly;
    const totalExp = data.householdExp + data.childcareExp + data.giftsExp + data.vacationExp + data.otherExp;
    const savings = totalInc - totalExp;
    const savRatio = totalInc > 0 ? (savings/totalInc*100).toFixed(0) : 0;
    const totalFA = data.assets.reduce((s,a)=>s+a.value,0);
    const totalGoals = data.goals.reduce((s,g)=>s+g.currentValue,0);
    
    setAiAnalysis({
      summary: `Based on your comprehensive financial profile, you are in a ${parseFloat(savRatio) >= 30 ? 'strong' : 'moderate'} financial position with a savings ratio of ${savRatio}%. Your current financial assets of ${fmt(totalFA)} provide a reasonable foundation, though targeted optimisation can significantly accelerate your journey to financial independence.`,
      strengths: [
        parseFloat(savRatio) >= 20 ? `Your savings ratio of ${savRatio}% demonstrates strong financial discipline — you're saving well above the national average.` : `While your savings ratio needs improvement, the fact that you're planning proactively shows excellent financial awareness.`,
        data.liabilities.length === 0 ? "Being completely debt-free is a major advantage — your entire savings can compound without interest drag." : "Managing your liabilities actively shows financial maturity.",
        `Your ${data.riskProfile.toLowerCase()} risk profile with ${data.equityAlloc}% equity allocation is appropriate for your ${data.retirementAge - age}-year investment horizon.`,
      ],
      recommendations: [
        { title: "Emergency Fund Priority", detail: `Maintain ${fmt(totalExp * 6)} (6 months expenses) in a liquid fund or savings account before pursuing any investment goals. This should be your first milestone.`, urgency: "Immediate" },
        { title: "Tax Optimisation", detail: `Consider maximising Section 80C (₹1.5L via ELSS/PPF), 80CCD(1B) (₹50K via NPS), and 80D (health insurance premiums). This could save you ₹50,000–80,000 annually in taxes.`, urgency: "This Quarter" },
        { title: "SIP Step-Up Strategy", detail: `Increase your SIPs by ${data.incomeGrowth}% annually in line with salary growth. A ₹${((data.sipMonthly * data.incomeGrowth / 100)/1000).toFixed(0)}K annual SIP increase can add ${fmt(data.sipMonthly * 12 * 0.4)} to your retirement corpus.`, urgency: "Annual" },
        { title: "Portfolio Rebalancing", detail: `Review your ${data.equityAlloc}:${data.debtAlloc} equity:debt allocation every 6 months. As you approach retirement, gradually shift to a more conservative ${Math.max(data.equityAlloc-20,40)}:${Math.min(data.debtAlloc+20,60)} allocation.`, urgency: "Semi-Annual" },
        { title: "Goal Prioritisation", detail: totalGoals > totalFA * 2 ? `Your goals total ${fmt(totalGoals)} against assets of ${fmt(totalFA)}. Consider prioritising high-priority goals first and potentially adjusting lower-priority goal timelines by 2–3 years.` : `Your asset base covers your goals well. Focus on maintaining consistent investments and avoid lifestyle inflation.`, urgency: "Review" },
      ],
      riskWarnings: [
        "Inflation at 6% will halve your money's purchasing power in 12 years. Equity exposure is essential for long-term wealth preservation.",
        "Over-concentration in any single fund manager or stock beyond 20–25% of your portfolio adds unnecessary risk.",
        age > 40 ? "With retirement approaching, ensure you have adequate health insurance — medical costs inflate at 12% annually." : "Starting early gives you the power of compounding. Even small increases in SIP now have outsized effects over 20+ years.",
      ]
    });
    setAiLoading(false);
  };

  const requestAIAnalysis = async () => {
    if (isDemo) { onAuthClick?.(); return; }
    if (!user) { onAuthClick?.(); return; }

    // Create Cashfree order via Netlify Function (secret key stays server-side)
    try {
      const orderRes = await fetch("/.netlify/functions/create-cashfree-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_amount: PRO_PRICE,
          order_currency: "INR",
          order_note: "AI Pro Financial Analysis",
          customer_id: user.id,
          customer_name: user.user_metadata?.full_name || "Customer",
          customer_email: user.email || "",
          customer_phone: user.user_metadata?.phone || "9999999999",
        }),
      });

      if (!orderRes.ok) {
        const text = await orderRes.text();
        let errMsg = text;
        try { const j = JSON.parse(text); errMsg = j.details || j.error || text; } catch(e) {}
        console.error("Function error:", orderRes.status, text);
        alert("Payment error: " + errMsg);
        return;
      }

      const orderData = await orderRes.json();

      if (!orderData.payment_session_id) {
        console.error("Cashfree order creation failed:", orderData);
        alert("Payment initialization failed: " + (orderData.details || orderData.error || "Unknown error"));
        return;
      }

      // Initialize Cashfree checkout
      const cashfree = window.Cashfree({ mode: "production" });
      cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_modal",
      }).then(async (result) => {
        if (result.error) {
          console.error("Payment error:", result.error);
          return;
        }
        if (result.paymentDetails) {
          // Payment successful — store record & run AI
          try {
            await supabase.from("payments").insert([{
              user_id: user.id,
              payment_id: orderData.cf_order_id || orderData.order_id,
              amount: PRO_PRICE,
              currency: "INR",
              status: "success",
              product: "ai_pro_analysis",
              created_at: new Date().toISOString(),
            }]);
          } catch (e) { console.error("Payment log error:", e); }
          runAIAnalysis();
        }
      });
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed: " + err.message);
    }
  };

  const getAge = () => {
    if (!data.dob) return 35;
    return new Date().getFullYear() - new Date(data.dob).getFullYear();
  };

  if (showReport) {
    return <ReportView data={data} getAge={getAge} onBack={()=>setShowReport(false)} aiAnalysis={aiAnalysis} aiLoading={aiLoading} onRequestAI={requestAIAnalysis} showProModal={showProModal} setShowProModal={setShowProModal} />;
  }

  return (
    <div style={{ maxWidth:760, margin:"0 auto", padding:"24px 16px 80px" }}>
      {/* Welcome */}
      <div className="fadeUp" style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:DISPLAY, fontSize:30, fontWeight:700, color:T.navy }}>
          Welcome{data.name ? `, ${data.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p style={{ color:T.steel, fontSize:15, marginTop:4 }}>Fill in your details below to generate your financial independence plan</p>
      </div>

      {/* Step Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:28, overflowX:"auto", paddingBottom:4 }}>
        {STEPS.map((s,i) => (
          <button key={s.id} onClick={()=>setStep(i)} style={{
            padding:"10px 18px", borderRadius:12, border: i===step ? `2px solid ${T.gold}` : `1.5px solid ${T.silver}30`,
            background: i===step ? `linear-gradient(135deg, ${T.gold}12, ${T.goldLight}08)` : T.white,
            color: i===step ? T.navy : T.slate, fontFamily:BODY, fontWeight:i===step?700:500,
            fontSize:13, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.3s",
            boxShadow: i===step ? `0 4px 16px ${T.gold}15` : "0 1px 4px rgba(0,0,0,0.04)"
          }}>
            {s.icon} {s.title}
          </button>
        ))}
      </div>

      {/* Form Card */}
      <div style={{ background:T.white, borderRadius:20, padding:32, boxShadow:"0 4px 32px rgba(10,22,40,0.06)", border:`1px solid ${T.gold}10` }}>

        {step === 0 && (<div>
          <h3 style={{ fontFamily:DISPLAY, fontSize:22, fontWeight:700, color:T.navy, marginBottom:20, borderBottom:`2px solid ${T.gold}`, paddingBottom:8, display:"inline-block" }}>Personal Details</h3>
          <Field label="Full Name" value={data.name} onChange={v=>update("name",v)} placeholder="Your full name" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label="Date of Birth" type="date" value={data.dob} onChange={v=>update("dob",v)} />
            <Field label="City" value={data.city} onChange={v=>update("city",v)} placeholder="e.g. Mumbai" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label="Retirement Age" type="number" value={data.retirementAge} onChange={v=>update("retirementAge",parseInt(v)||55)} />
            <Field label="Life Expectancy" type="number" value={data.lifeExpectancy} onChange={v=>update("lifeExpectancy",parseInt(v)||85)} />
          </div>
          <Field label="Risk Profile" value={data.riskProfile} onChange={v=>update("riskProfile",v)} options={["Conservative","Balanced","Aggressive"]} />
          <div style={{ padding:18, background:`${T.teal}06`, borderRadius:14, border:`1px solid ${T.teal}15`, marginTop:8 }}>
            <div style={{ fontWeight:700, color:T.navy, marginBottom:10, fontSize:14 }}>👨‍👩‍👧‍👦 Family (Optional)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Field label="Spouse Name" value={data.spouseName} onChange={v=>update("spouseName",v)} placeholder="Optional" />
              <Field label="Spouse DOB" type="date" value={data.spouseDob} onChange={v=>update("spouseDob",v)} />
            </div>
          </div>
        </div>)}

        {step === 1 && (<div>
          <h3 style={{ fontFamily:DISPLAY, fontSize:22, fontWeight:700, color:T.navy, marginBottom:20, borderBottom:`2px solid ${T.gold}`, paddingBottom:8, display:"inline-block" }}>Income & Expenses</h3>
          <div style={{ padding:18, background:`${T.emerald}06`, borderRadius:14, border:`1px solid ${T.emerald}15`, marginBottom:20 }}>
            <div style={{ fontWeight:700, color:T.emerald, marginBottom:12, fontSize:14 }}>📈 Monthly Income</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Field label="Salary" type="number" value={data.salaryMonthly} onChange={v=>update("salaryMonthly",parseFloat(v)||0)} prefix="₹" />
              <Field label="Other Income" type="number" value={data.otherIncomeMonthly} onChange={v=>update("otherIncomeMonthly",parseFloat(v)||0)} prefix="₹" />
            </div>
            <Field label="Annual Income Growth" type="number" value={data.incomeGrowth} onChange={v=>update("incomeGrowth",parseFloat(v)||0)} suffix="% p.a." />
          </div>
          <div style={{ padding:18, background:`${T.ruby}04`, borderRadius:14, border:`1px solid ${T.ruby}12`, marginBottom:20 }}>
            <div style={{ fontWeight:700, color:T.ruby, marginBottom:12, fontSize:14 }}>📉 Monthly Expenses</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Field label="Household" type="number" value={data.householdExp} onChange={v=>update("householdExp",parseFloat(v)||0)} prefix="₹" />
              <Field label="Childcare/Education" type="number" value={data.childcareExp} onChange={v=>update("childcareExp",parseFloat(v)||0)} prefix="₹" />
              <Field label="Vacation" type="number" value={data.vacationExp} onChange={v=>update("vacationExp",parseFloat(v)||0)} prefix="₹" />
              <Field label="Gifts/Charity" type="number" value={data.giftsExp} onChange={v=>update("giftsExp",parseFloat(v)||0)} prefix="₹" />
            </div>
            <Field label="Other Expenses" type="number" value={data.otherExp} onChange={v=>update("otherExp",parseFloat(v)||0)} prefix="₹" />
          </div>
          <div style={{ padding:18, background:`${T.navy}06`, borderRadius:14, border:`1px solid ${T.navy}10` }}>
            <div style={{ fontWeight:700, color:T.navy, marginBottom:12, fontSize:14 }}>💎 Committed Investments (Monthly)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Field label="SIP Amount" type="number" value={data.sipMonthly} onChange={v=>update("sipMonthly",parseFloat(v)||0)} prefix="₹" />
              <Field label="PF/EPF/DSOP" type="number" value={data.pfMonthly} onChange={v=>update("pfMonthly",parseFloat(v)||0)} prefix="₹" />
            </div>
          </div>
        </div>)}

        {step === 2 && (<div>
          <h3 style={{ fontFamily:DISPLAY, fontSize:22, fontWeight:700, color:T.navy, marginBottom:20, borderBottom:`2px solid ${T.gold}`, paddingBottom:8, display:"inline-block" }}>Assets & Liabilities</h3>
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontWeight:700, color:T.emerald, fontSize:14 }}>📊 Financial Assets</span>
              <button onClick={()=>update("assets",[...data.assets,{name:"",type:"Equity",value:0}])} className="btn-gold" style={{ padding:"6px 14px", borderRadius:8, fontSize:12 }}>+ Add</button>
            </div>
            {data.assets.map((a,i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-end" }}>
                <div style={{flex:2}}><Field label={i===0?"Name":""} value={a.name} onChange={v=>{const n=[...data.assets];n[i].name=v;update("assets",n);}} placeholder="e.g. Mutual Funds" /></div>
                <div style={{flex:1}}><Field label={i===0?"Type":""} value={a.type} onChange={v=>{const n=[...data.assets];n[i].type=v;update("assets",n);}} options={["Equity","Debt","Gold","Other"]} /></div>
                <div style={{flex:1}}><Field label={i===0?"Value":""} type="number" value={a.value} onChange={v=>{const n=[...data.assets];n[i].value=parseFloat(v)||0;update("assets",n);}} prefix="₹" /></div>
                <button onClick={()=>update("assets",data.assets.filter((_,j)=>j!==i))} style={{ padding:"10px", background:`${T.ruby}10`, color:T.ruby, border:"none", borderRadius:8, cursor:"pointer", marginBottom:18, fontSize:14, fontWeight:700 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontWeight:700, color:T.navy, fontSize:14 }}>🏠 Physical Assets</span>
              <button onClick={()=>update("physicalAssets",[...data.physicalAssets,{name:"",value:0}])} className="btn-navy" style={{ padding:"6px 14px", borderRadius:8, fontSize:12 }}>+ Add</button>
            </div>
            {data.physicalAssets.map((a,i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-end" }}>
                <div style={{flex:2}}><Field label={i===0?"Name":""} value={a.name} onChange={v=>{const n=[...data.physicalAssets];n[i].name=v;update("physicalAssets",n);}} /></div>
                <div style={{flex:1}}><Field label={i===0?"Value":""} type="number" value={a.value} onChange={v=>{const n=[...data.physicalAssets];n[i].value=parseFloat(v)||0;update("physicalAssets",n);}} prefix="₹" /></div>
                <button onClick={()=>update("physicalAssets",data.physicalAssets.filter((_,j)=>j!==i))} style={{ padding:"10px", background:`${T.ruby}10`, color:T.ruby, border:"none", borderRadius:8, cursor:"pointer", marginBottom:18 }}>✕</button>
              </div>
            ))}
          </div>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontWeight:700, color:T.ruby, fontSize:14 }}>💳 Liabilities</span>
              <button onClick={()=>update("liabilities",[...data.liabilities,{name:"",emi:0,outstanding:0}])} style={{ padding:"6px 14px", borderRadius:8, fontSize:12, background:`${T.ruby}10`, color:T.ruby, border:"none", fontWeight:700, cursor:"pointer" }}>+ Add</button>
            </div>
            {data.liabilities.length===0 && <div style={{ padding:20, textAlign:"center", color:T.steel, fontSize:14, background:`${T.emerald}06`, borderRadius:12 }}>✅ No liabilities added — great position!</div>}
            {data.liabilities.map((l,i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-end" }}>
                <div style={{flex:2}}><Field label={i===0?"Loan":""} value={l.name} onChange={v=>{const n=[...data.liabilities];n[i].name=v;update("liabilities",n);}} /></div>
                <div style={{flex:1}}><Field label={i===0?"EMI":""} type="number" value={l.emi} onChange={v=>{const n=[...data.liabilities];n[i].emi=parseFloat(v)||0;update("liabilities",n);}} prefix="₹" /></div>
                <div style={{flex:1}}><Field label={i===0?"Outstanding":""} type="number" value={l.outstanding} onChange={v=>{const n=[...data.liabilities];n[i].outstanding=parseFloat(v)||0;update("liabilities",n);}} prefix="₹" /></div>
                <button onClick={()=>update("liabilities",data.liabilities.filter((_,j)=>j!==i))} style={{ padding:"10px", background:`${T.ruby}10`, color:T.ruby, border:"none", borderRadius:8, cursor:"pointer", marginBottom:18 }}>✕</button>
              </div>
            ))}
          </div>
        </div>)}

        {step === 3 && (<div>
          <h3 style={{ fontFamily:DISPLAY, fontSize:22, fontWeight:700, color:T.navy, marginBottom:20, borderBottom:`2px solid ${T.gold}`, paddingBottom:8, display:"inline-block" }}>Financial Goals</h3>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
            <button onClick={()=>update("goals",[...data.goals,{name:"",year:new Date().getFullYear()+5,currentValue:0,inflation:6,priority:"Medium"}])} className="btn-gold" style={{ padding:"10px 20px", borderRadius:10, fontSize:13 }}>+ Add Goal</button>
          </div>
          {data.goals.map((g,i) => (
            <div key={i} style={{ padding:18, background:T.offwhite, borderRadius:14, marginBottom:12, border:`1px solid ${g.priority==="High"?T.ruby:g.priority==="Medium"?T.amber:T.teal}20` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <Badge color={g.priority==="High"?T.ruby:g.priority==="Medium"?T.amber:T.teal}>{g.priority} Priority</Badge>
                <button onClick={()=>update("goals",data.goals.filter((_,j)=>j!==i))} style={{ background:"none", border:"none", color:T.ruby, cursor:"pointer", fontSize:18, fontWeight:700 }}>✕</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Goal Name" value={g.name} onChange={v=>{const n=[...data.goals];n[i].name=v;update("goals",n);}} placeholder="e.g. Child Education" />
                <Field label="Target Year" type="number" value={g.year} onChange={v=>{const n=[...data.goals];n[i].year=parseInt(v)||2030;update("goals",n);}} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                <Field label="Today's Value (₹)" type="number" value={g.currentValue} onChange={v=>{const n=[...data.goals];n[i].currentValue=parseFloat(v)||0;update("goals",n);}} prefix="₹" />
                <Field label="Inflation %" type="number" value={g.inflation} onChange={v=>{const n=[...data.goals];n[i].inflation=parseFloat(v)||6;update("goals",n);}} />
                <Field label="Priority" value={g.priority} onChange={v=>{const n=[...data.goals];n[i].priority=v;update("goals",n);}} options={["High","Medium","Low"]} />
              </div>
            </div>
          ))}
        </div>)}

        {step === 4 && (<div>
          <h3 style={{ fontFamily:DISPLAY, fontSize:22, fontWeight:700, color:T.navy, marginBottom:20, borderBottom:`2px solid ${T.gold}`, paddingBottom:8, display:"inline-block" }}>Plan Assumptions</h3>
          <div style={{ padding:18, background:`${T.amber}06`, borderRadius:14, border:`1px solid ${T.amber}15`, marginBottom:20 }}>
            <div style={{ fontWeight:700, color:T.amber, marginBottom:12, fontSize:14 }}>📈 Inflation Rates (% p.a.)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <Field label="General" type="number" value={data.generalInflation} onChange={v=>update("generalInflation",parseFloat(v)||6)} suffix="%" />
              <Field label="Education" type="number" value={data.educationInflation} onChange={v=>update("educationInflation",parseFloat(v)||10)} suffix="%" />
              <Field label="Medical" type="number" value={data.medicalInflation} onChange={v=>update("medicalInflation",parseFloat(v)||12)} suffix="%" />
            </div>
          </div>
          <div style={{ padding:18, background:`${T.teal}06`, borderRadius:14, border:`1px solid ${T.teal}15`, marginBottom:20 }}>
            <div style={{ fontWeight:700, color:T.teal, marginBottom:12, fontSize:14 }}>💹 Expected Returns (% p.a.)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Equity" type="number" value={data.equityReturn} onChange={v=>update("equityReturn",parseFloat(v)||13)} suffix="%" />
              <Field label="Debt/Fixed Income" type="number" value={data.debtReturn} onChange={v=>update("debtReturn",parseFloat(v)||7)} suffix="%" />
            </div>
          </div>
          <div style={{ padding:18, background:`${T.navy}06`, borderRadius:14, border:`1px solid ${T.navy}10` }}>
            <div style={{ fontWeight:700, color:T.navy, marginBottom:12, fontSize:14 }}>⚖️ Asset Allocation</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Equity %" type="number" value={data.equityAlloc} onChange={v=>{const eq=Math.min(parseFloat(v)||0,100);update("equityAlloc",eq);update("debtAlloc",100-eq);}} suffix="%" />
              <Field label="Debt %" type="number" value={data.debtAlloc} onChange={v=>{const db=Math.min(parseFloat(v)||0,100);update("debtAlloc",db);update("equityAlloc",100-db);}} suffix="%" />
            </div>
          </div>
        </div>)}

        {/* Navigation */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:28 }}>
          {step > 0 ? <button onClick={()=>setStep(step-1)} className="btn-navy" style={{ padding:"12px 28px", borderRadius:12, fontSize:15 }}>← Back</button> : <div/>}
          {step < STEPS.length-1 ? (
            <button onClick={()=>setStep(step+1)} className="btn-gold" style={{ padding:"12px 28px", borderRadius:12, fontSize:15 }}>Next →</button>
          ) : (
            <button onClick={generateReport} className="btn-gold" style={{ padding:"16px 44px", borderRadius:14, fontSize:17, boxShadow:`0 8px 32px ${T.gold}40` }}>
              🚀 Generate Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPORT VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ════════════════════════════════════════════════════
// LIFECYCLE SUPPORT VISUALISATION (trust-building, landing page)
// ════════════════════════════════════════════════════
const LIFECYCLE_STAGES = [
  { icon:"🔍", title:"Pre-Investment Due Diligence", desc:"We assess suitability, your risk profile and scheme documents — so you understand exactly what you're getting into before any money moves." },
  { icon:"🤝", title:"Transaction Execution", desc:"Clear, documented execution with full audit trails. You see every step, every fee, every confirmation — no black boxes." },
  { icon:"📈", title:"Post-Investment Reporting", desc:"Continuous (not annual) reporting on performance, allocation drift and tax position — always-on visibility into your portfolio." },
  { icon:"🚪", title:"Exit & Rebalancing", desc:"Planned, tax-aware exits and rebalancing aligned to your goals — guidance across the whole lifecycle, not just the buy." },
];

const LifecycleSupport = ({ T, DISPLAY }) => (
  <section style={{ padding:"72px 24px", maxWidth:1040, margin:"0 auto" }}>
    <div style={{ textAlign:"center", marginBottom:48 }}>
      <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ width:28, height:1, background:T.gold, display:"block" }} />
        <span style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:"2px", textTransform:"uppercase" }}>Full Lifecycle Support</span>
      </div>
      <h2 style={{ fontFamily:DISPLAY, fontSize:"clamp(28px,3.8vw,42px)", fontWeight:700, color:T.navy, lineHeight:1.12, letterSpacing:"-1px" }}>We Walk With You — End to End</h2>
      <p style={{ fontSize:15, color:T.slate, maxWidth:560, margin:"14px auto 0", lineHeight:1.75 }}>From the first question to the final exit, every stage is transparent and documented. Trust is earned before you wire a single rupee.</p>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:24 }}>
      {LIFECYCLE_STAGES.map((s, i) => (
        <div key={s.title} className="hover-lift" style={{ position:"relative", background:T.white, borderRadius:18, padding:"30px 24px", boxShadow:"0 2px 16px rgba(10,22,40,0.05)", border:`1px solid ${T.silver}30` }}>
          <div style={{ position:"absolute", top:-14, left:24, width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, color:T.navy, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, boxShadow:`0 4px 12px ${T.gold}40` }}>{i+1}</div>
          <div style={{ fontSize:32, marginBottom:14, marginTop:6 }}>{s.icon}</div>
          <h3 style={{ fontFamily:DISPLAY, fontSize:19, fontWeight:700, color:T.navy, marginBottom:8, lineHeight:1.2 }}>{s.title}</h3>
          <p style={{ fontSize:13.5, color:T.slate, lineHeight:1.65 }}>{s.desc}</p>
          {i < LIFECYCLE_STAGES.length - 1 && <div className="no-print" style={{ position:"absolute", top:"50%", right:-16, color:T.gold, fontSize:22, fontWeight:700, zIndex:2 }}>→</div>}
        </div>
      ))}
    </div>
  </section>
);

// ════════════════════════════════════════════════════
// GOAL FUNDING — on-track / off-track traffic-light model
// ════════════════════════════════════════════════════
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
const GOAL_STATUS = {
  on:   { color: T.emerald, dot: "🟢", label: "On Track" },
  risk: { color: T.amber,   dot: "🟡", label: "At Risk" },
  off:  { color: T.ruby,    dot: "🔴", label: "Off Track" },
};

// Greedily allocate current financial assets (as lumpsum) and monthly savings
// capacity (as SIP) to goals in priority order, then by urgency. Returns each
// goal annotated with a 0-1 funding `coverage` and a traffic-light `status`.
function computeGoalFunding(goals, investableAssets, monthlySavings) {
  let assetPool = Math.max(investableAssets, 0);
  let sipPool = Math.max(monthlySavings, 0);
  const order = goals
    .map((g, i) => ({ g, i }))
    .sort((a, b) =>
      ((PRIORITY_RANK[a.g.priority] ?? 1) - (PRIORITY_RANK[b.g.priority] ?? 1)) ||
      (a.g.yrs - b.g.yrs)
    );
  const result = {};
  order.forEach(({ g, i }) => {
    const lumpNeed = Math.max(g.lump, 0);
    let coverage, lumpUsed = 0, sipUsed = 0;
    if (lumpNeed <= 0) {
      coverage = 1;
    } else {
      lumpUsed = Math.min(assetPool, lumpNeed);
      assetPool -= lumpUsed;
      const assetCover = lumpUsed / lumpNeed;
      if (g.sip > 0) {
        const sipNeed = g.sip * (1 - assetCover);
        sipUsed = Math.min(sipPool, sipNeed);
        sipPool -= sipUsed;
        const sipCover = sipNeed > 0 ? sipUsed / sipNeed : 1;
        coverage = assetCover + (1 - assetCover) * sipCover;
      } else {
        coverage = assetCover;
      }
    }
    coverage = Math.max(0, Math.min(coverage, 1));
    const status = coverage >= 0.9 ? "on" : coverage >= 0.5 ? "risk" : "off";
    result[i] = { coverage, lumpUsed, sipUsed, status };
  });
  return goals.map((g, i) => ({ ...g, ...result[i] }));
}

// ════════════════════════════════════════════════════
// DRILL-DOWN ASSET ALLOCATION (class → holding → sector → geography)
// ════════════════════════════════════════════════════
const nodeValue = (n) => (n.value != null ? n.value : (n.children || []).reduce((s, c) => s + nodeValue(c), 0));

const DrillDownAllocation = ({ root }) => {
  const [path, setPath] = useState([]); // drill path of node objects
  const current = path.length ? path[path.length - 1] : root;
  const children = (current.children || []).map(c => ({ ...c, _value: nodeValue(c) })).filter(c => c._value > 0);
  const total = children.reduce((s, c) => s + c._value, 0);
  const drill = (child) => { if (child && child.children && child.children.length) setPath([...path, child]); };
  const crumbs = [root, ...path];

  return (
    <div className="report-section section-networth" style={{ background:T.white, borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:8 }}>
        <div style={{ fontWeight:700, color:T.navy }}>Asset Allocation</div>
        <div className="no-print" style={{ fontSize:11, color:T.steel, fontStyle:"italic" }}>Click any slice to zoom in →</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4, marginBottom:12, fontSize:13 }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
            {i > 0 && <span style={{ color:T.silver }}>›</span>}
            <button onClick={()=>setPath(path.slice(0, i))} style={{ background: i===crumbs.length-1?`${T.gold}15`:"transparent", border:"none", color: i===crumbs.length-1?T.navy:T.teal, fontWeight: i===crumbs.length-1?700:600, cursor:"pointer", fontFamily:BODY, fontSize:13, padding:"4px 10px", borderRadius:8 }}>
              {c.name}
            </button>
          </span>
        ))}
      </div>
      {children.length === 0 ? (
        <div style={{ padding:"30px 16px", textAlign:"center", color:T.steel, fontSize:14, background:T.offwhite, borderRadius:12 }}>
          No further breakdown for <strong>{current.name}</strong>. Add holding-level detail (sector / geography) to drill deeper.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={children} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="_value"
                   onClick={(_, idx) => drill(children[idx])}
                   isAnimationActive={false}
                   label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {children.map((c, i) => (
                  <Cell key={i} fill={T.chart[i % T.chart.length]} className={c.children && c.children.length ? "drill-slice" : ""} />
                ))}
              </Pie>
              <Tooltip formatter={v => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8, marginTop:10 }}>
            {children.map((c, i) => {
              const drillable = c.children && c.children.length;
              return (
                <button key={i} onClick={()=>drill(c)} disabled={!drillable} title={drillable?`Drill into ${c.name}`:undefined} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"8px 12px", borderRadius:10, border:`1px solid ${T.silver}30`, background: drillable?T.white:T.offwhite, cursor: drillable?"pointer":"default", textAlign:"left" }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:13, color:T.navy, fontWeight:600 }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:T.chart[i % T.chart.length], flexShrink:0 }} />
                    {c.name}{drillable && <span style={{ color:T.teal, fontSize:12 }}>›</span>}
                  </span>
                  <span style={{ fontSize:12, color:T.slate, fontWeight:700, whiteSpace:"nowrap" }}>{total>0?`${(c._value/total*100).toFixed(0)}%`:""}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════
// CUSTOMISABLE PDF EXPORT
// ════════════════════════════════════════════════════
const PDF_SECTIONS = [
  { key:"freedom", label:"Freedom Number" },
  { key:"swot", label:"SWOT Analysis" },
  { key:"cashflow", label:"Cashflow Analysis" },
  { key:"networth", label:"Net Worth & Assets" },
  { key:"goals", label:"Goal Planning" },
  { key:"retirement", label:"Retirement Planning" },
  { key:"projection", label:"5-Year Projection" },
  { key:"ai", label:"AI Pro Analysis" },
  { key:"actionables", label:"Key Actionables" },
];

const PrintStyles = ({ sections }) => (
  <style media="print">{
    Object.entries(sections).filter(([, on]) => !on).map(([k]) => `.section-${k}{display:none !important;}`).join("\n")
  }</style>
);

const PdfExportModal = ({ show, onClose, config, setConfig, onGenerate }) => {
  if (!show) return null;
  const toggle = (k) => setConfig(p => ({ ...p, sections: { ...p.sections, [k]: !p.sections[k] } }));
  return (
    <div className="fadeIn no-print" style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:50, background:"rgba(5,12,25,0.6)", backdropFilter:"blur(6px)", overflowY:"auto" }}>
      <div className="scaleIn" style={{ background:T.white, borderRadius:18, padding:28, width:"min(460px,94vw)", boxShadow:"0 24px 60px rgba(0,0,0,0.4)", marginBottom:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ fontFamily:DISPLAY, fontSize:22, fontWeight:700, color:T.navy }}>📄 Download PDF Report</h2>
          <button onClick={onClose} style={{ background:`${T.navy}08`, border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", color:T.slate, fontSize:14 }}>✕</button>
        </div>
        <p style={{ fontSize:13, color:T.steel, marginBottom:16 }}>Customise what to include, then save as PDF to forward to your CA, spouse or advisor.</p>

        <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.slate, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Sections to include</label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:18 }}>
          {PDF_SECTIONS.map(s => (
            <label key={s.key} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:10, border:`1px solid ${config.sections[s.key]?T.gold:T.silver}40`, background: config.sections[s.key]?`${T.gold}08`:T.white, cursor:"pointer", fontSize:13, color:T.navy }}>
              <input type="checkbox" checked={config.sections[s.key]} onChange={()=>toggle(s.key)} style={{ accentColor:T.gold }} />
              {s.label}
            </label>
          ))}
        </div>

        <label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, fontSize:13, color:T.navy, fontWeight:600 }}>
          <input type="checkbox" checked={config.cover} onChange={()=>setConfig(p=>({ ...p, cover:!p.cover }))} style={{ accentColor:T.gold }} />
          Include branded cover page
        </label>

        <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.slate, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>Personal note (optional)</label>
        <textarea value={config.note} onChange={e=>setConfig(p=>({ ...p, note:e.target.value }))} placeholder="e.g. For review with my CA ahead of 31 March filing." rows={3}
          style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${T.silver}40`, borderRadius:10, fontSize:14, color:T.navy, resize:"vertical", marginBottom:18, fontFamily:BODY }} />

        <button onClick={onGenerate} className="btn-gold" style={{ width:"100%", padding:"13px", borderRadius:12, fontSize:15 }}>🖨️ Generate PDF</button>
        <p style={{ fontSize:11, color:T.steel, textAlign:"center", marginTop:10 }}>Opens your browser print dialog — choose <strong>“Save as PDF”</strong> as the destination.</p>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════
// REPORT VIEW
// ════════════════════════════════════════════════════
const ReportView = ({ data, getAge, onBack, aiAnalysis, aiLoading, onRequestAI, showProModal, setShowProModal }) => {
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfConfig, setPdfConfig] = useState({
    cover: true,
    note: "",
    sections: { freedom:true, swot:true, cashflow:true, networth:true, goals:true, retirement:true, projection:true, ai:true, actionables:true },
  });
  const generatePdf = () => { setShowPdfModal(false); setTimeout(() => window.print(), 250); };

  const age = getAge();
  const yToRet = Math.max(data.retirementAge - age, 1);
  const yInRet = data.lifeExpectancy - data.retirementAge;
  const yr = new Date().getFullYear();
  const totInc = (data.salaryMonthly + data.otherIncomeMonthly) * 12;
  const totExpM = data.householdExp + data.childcareExp + data.giftsExp + data.vacationExp + data.otherExp;
  const totExp = totExpM * 12;
  const savM = data.salaryMonthly + data.otherIncomeMonthly - totExpM;
  const savRat = totInc > 0 ? (savM*12/totInc*100).toFixed(0) : 0;
  const totFA = data.assets.reduce((s,a)=>s+a.value,0);
  const totPA = data.physicalAssets.reduce((s,a)=>s+a.value,0);
  const totA = totFA + totPA;
  const totL = data.liabilities.reduce((s,l)=>s+l.outstanding,0);
  const nw = totA - totL;
  const totEMI = data.liabilities.reduce((s,l)=>s+l.emi,0);
  const debtR = (data.salaryMonthly+data.otherIncomeMonthly)>0?((totEMI/(data.salaryMonthly+data.otherIncomeMonthly))*100).toFixed(0):0;
  const faR = totA>0?((totFA/totA)*100).toFixed(0):0;
  const levR = totA>0?((totL/totA)*100).toFixed(0):0;
  const portR = (data.equityAlloc/100)*(data.equityReturn/100)+(data.debtAlloc/100)*(data.debtReturn/100);
  const postRetR = 0.10;
  const contingency = totExpM * 6;

  // Financial Freedom Number (a.k.a. FI / FIRE number): the corpus that, drawn at a
  // safe withdrawal rate, funds your regular expenses indefinitely — so earning becomes optional.
  const SWR = 0.04; // 4% safe-withdrawal rule → 25× annual expenses
  const freedomNumber = totExp / SWR;
  const freedomProgress = freedomNumber > 0 ? Math.min((totFA / freedomNumber) * 100, 100) : 100;
  const freedomGap = Math.max(freedomNumber - totFA, 0);
  const passiveIncomeM = (totFA * SWR) / 12; // monthly income current financial assets can safely generate
  const infl = data.generalInflation / 100;
  let yearsToFreedom = (totFA >= freedomNumber) ? 0 : null;
  if (yearsToFreedom === null) {
    let corpus = totFA;
    for (let y = 1; y <= 60; y++) {
      corpus = corpus * (1 + portR) + Math.max(savM, 0) * 12;
      const freedomAtY = (totExp * Math.pow(1 + infl, y)) / SWR;
      if (corpus >= freedomAtY) { yearsToFreedom = y; break; }
    }
  }

  const goalsBase = data.goals.map(g => {
    const y = g.year - yr;
    const futV = fv(g.currentValue, g.inflation/100, Math.max(y,0));
    return { ...g, yrs:y, futV, lump:pvCalc(futV,portR,Math.max(y,0)), sip:y>0?sipReq(futV,portR,y):0 };
  });
  // On-track / off-track traffic-light: greedily fund goals from current assets + monthly savings.
  const goals = computeGoalFunding(goalsBase, totFA, savM);
  const statusCounts = goals.reduce((acc, g) => { acc[g.status] = (acc[g.status]||0)+1; return acc; }, {});

  const retCorp = retCorpus(totExp, data.generalInflation/100, postRetR, yToRet, yInRet);
  const retExpAtRet = fv(totExp, data.generalInflation/100, yToRet);
  const projCorpus = fv(totFA,portR,yToRet) + (savM>0 && portR>0 ? savM*((Math.pow(1+portR/12,yToRet*12)-1)/(portR/12)) : savM*yToRet*12);

  const cf5 = Array.from({length:5},(_,i)=>({
    year:yr+i, age:age+i,
    income: totInc*Math.pow(1+data.incomeGrowth/100,i),
    expenses: totExp*Math.pow(1+data.generalInflation/100,i),
    get savings(){ return this.income-this.expenses; },
    get ratio(){ return this.income>0?(this.savings/this.income*100).toFixed(0):0; }
  }));

  const swot = {
    s: [
      ...(totL===0?["Debt-free status"]:[]),
      ...(parseFloat(savRat)>=30?[`Strong savings ratio (${savRat}%)`]:[]),
      ...(parseFloat(faR)>=70?["High financial assets ratio"]:[]),
      ...(data.sipMonthly>0?["Regular SIP discipline in place"]:[]),
      ...(totFA>totExp*3?["Solid asset base vs expenses"]:[]),
    ],
    w: [
      ...(parseFloat(savRat)<20?["Low savings ratio — needs improvement"]:[]),
      ...(parseFloat(debtR)>30?["High debt-to-income ratio"]:[]),
      ...(data.equityAlloc>85?["Over-concentrated in equity"]:[]),
      ...(goals.reduce((s,g)=>s+g.lump,0)+retCorp>totFA*3?["Significant goal-funding gap"]:[]),
    ],
    o: ["Portfolio rebalancing opportunity","Tax-saving instruments (NPS, ELSS, 80C)","Developing additional income streams"],
    t: ["Inflation eroding purchasing power","Market volatility","Unexpected health expenses","Economic downturn risk"]
  };
  if(swot.s.length===0) swot.s.push("Proactive financial planning");
  if(swot.w.length===0) swot.w.push("Room to optimise allocation");

  // Hierarchical allocation for drill-down: asset class → holding → (sector → geography, if provided).
  const classGroups = {};
  data.assets.forEach(a => {
    if (!classGroups[a.type]) classGroups[a.type] = [];
    classGroups[a.type].push({ name: a.name || "Unnamed", value: a.value, children: a.detail || null });
  });
  const allocationTree = {
    name: "All Assets",
    children: Object.entries(classGroups).map(([cls, holdings]) => ({ name: cls, children: holdings })),
  };
  const expPie = [{name:"Household",value:data.householdExp*12},{name:"Childcare",value:data.childcareExp*12},{name:"Vacation",value:data.vacationExp*12},{name:"Gifts",value:data.giftsExp*12},{name:"Other",value:data.otherExp*12}].filter(e=>e.value>0);

  return (
    <div style={{ maxWidth:920, margin:"0 auto", padding:"20px 16px 60px" }}>
      <PrintStyles sections={pdfConfig.sections} />
      <PdfExportModal show={showPdfModal} onClose={()=>setShowPdfModal(false)} config={pdfConfig} setConfig={setPdfConfig} onGenerate={generatePdf} />

      {/* PRINT-ONLY COVER PAGE (PlanMyCashflows branded) */}
      {pdfConfig.cover && (
        <div className="print-cover" style={{ flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", minHeight:"88vh", background:T.navy, color:T.white, borderRadius:0, padding:"40px", pageBreakAfter:"always" }}>
          <img src="/auris-logo.png" alt="PlanMyCashflows" style={{ height:64, objectFit:"contain", marginBottom:24 }} />
          <div style={{ fontFamily:DISPLAY, fontSize:18, letterSpacing:"2px", color:T.gold, textTransform:"uppercase" }}>PlanMyCashflows</div>
          <h1 style={{ fontFamily:DISPLAY, fontSize:40, fontWeight:700, marginTop:18 }}>Financial Independence Plan</h1>
          <p style={{ fontFamily:DISPLAY, fontStyle:"italic", fontSize:22, color:T.goldLight, marginTop:10 }}>Prepared for {data.name || "Your Name"}</p>
          <p style={{ fontSize:14, color:"#ffffff99", marginTop:8 }}>{data.city || "India"} • {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</p>
          {pdfConfig.note && <p style={{ maxWidth:520, margin:"28px auto 0", fontSize:14, color:"#ffffffcc", lineHeight:1.7, fontStyle:"italic", borderTop:`1px solid ${T.gold}40`, paddingTop:18 }}>“{pdfConfig.note}”</p>}
          <p style={{ marginTop:"auto", fontSize:11, color:"#ffffff66", paddingTop:32 }}>Auris Pvt Ltd · Educational financial planning · Not investment advice</p>
        </div>
      )}

      {/* Report Header */}
      <div className="fadeUp" style={{ background:`linear-gradient(135deg, ${T.navy} 0%, ${T.ocean} 50%, ${T.midnight} 100%)`, borderRadius:24, padding:"52px 36px", textAlign:"center", marginBottom:36, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-80, right:-80, width:250, height:250, borderRadius:"50%", background:`${T.gold}08` }} />
        <div style={{ position:"absolute", bottom:-60, left:-60, width:180, height:180, borderRadius:"50%", background:`${T.gold}06` }} />
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ fontSize:52, marginBottom:12 }}>📊</div>
          <h1 style={{ fontFamily:DISPLAY, fontSize:"clamp(28px,5vw,40px)", fontWeight:700, color:T.white, lineHeight:1.2 }}>Financial Independence Plan</h1>
          <p style={{ color:T.goldLight, fontSize:20, marginTop:8, fontFamily:DISPLAY, fontStyle:"italic" }}>for {data.name || "Your Name"}</p>
          <p style={{ color:`${T.white}60`, fontSize:14, marginTop:4 }}>{data.city || "India"} • {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</p>
          <div className="no-print" style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginTop:20 }}>
            <button onClick={onBack} style={{ padding:"10px 24px", borderRadius:10, background:`${T.white}12`, color:T.goldLight, border:`1px solid ${T.gold}30`, cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:BODY }}>← Edit Inputs</button>
            <button onClick={()=>setShowPdfModal(true)} className="btn-gold" style={{ padding:"10px 24px", borderRadius:10, fontSize:14, fontFamily:BODY }}>📄 Download PDF</button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="fadeUp" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:36 }}>
        <MetricCard icon="🎂" label="Current Age" value={age} sub={`Retire at ${data.retirementAge}`} color={T.navy} />
        <MetricCard icon="⏱️" label="Years to Retire" value={yToRet} sub={`${yInRet} yrs in retirement`} color={T.teal} />
        <MetricCard icon="💰" label="Net Worth" value={fmt(nw)} sub={`Fin. ratio: ${faR}%`} color={T.gold} />
        <MetricCard icon="📈" label="Savings Rate" value={`${savRat}%`} sub={`${fmt(savM)}/month`} color={T.emerald} />
      </div>

      {/* Financial Freedom Number */}
      <div className="fadeUp report-section section-freedom" style={{ marginBottom:36 }}>
        <div style={{ background:`linear-gradient(135deg, ${T.navy}, ${T.ocean})`, borderRadius:20, padding:32, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:`${T.gold}10` }} />
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, boxShadow:`0 4px 16px ${T.gold}30` }}>🕊️</div>
              <div>
                <h2 style={{ fontFamily:DISPLAY, fontSize:26, fontWeight:700, color:T.white }}>Your Financial Freedom Number</h2>
                <p style={{ color:`${T.white}60`, fontSize:13 }}>The corpus at which work becomes optional — your investments cover your expenses</p>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14, marginTop:18 }}>
              <div style={{ background:`${T.white}0D`, borderRadius:14, padding:18 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.goldLight, textTransform:"uppercase", letterSpacing:"0.06em" }}>Freedom Number</div>
                <div style={{ fontSize:30, fontWeight:800, color:T.white, fontFamily:DISPLAY, marginTop:2 }}>{fmt(freedomNumber)}</div>
                <div style={{ fontSize:12, color:`${T.white}55`, marginTop:2 }}>≈ 25× your annual expenses of {fmt(totExp)}</div>
              </div>
              <div style={{ background:`${T.white}0D`, borderRadius:14, padding:18 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.goldLight, textTransform:"uppercase", letterSpacing:"0.06em" }}>Already Covered</div>
                <div style={{ fontSize:30, fontWeight:800, color:T.white, fontFamily:DISPLAY, marginTop:2 }}>{fmt(totFA)}</div>
                <div style={{ fontSize:12, color:`${T.white}55`, marginTop:2 }}>generates ≈ {fmt(passiveIncomeM)}/mo passive income</div>
              </div>
              <div style={{ background:`${T.white}0D`, borderRadius:14, padding:18 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.goldLight, textTransform:"uppercase", letterSpacing:"0.06em" }}>{freedomGap > 0 ? "Still Needed" : "Status"}</div>
                <div style={{ fontSize:30, fontWeight:800, color: freedomGap > 0 ? T.white : T.emerald, fontFamily:DISPLAY, marginTop:2 }}>{freedomGap > 0 ? fmt(freedomGap) : "Free 🎉"}</div>
                <div style={{ fontSize:12, color:`${T.white}55`, marginTop:2 }}>
                  {freedomGap <= 0 ? "Your assets already cover your expenses"
                    : yearsToFreedom != null ? `≈ ${yearsToFreedom} ${yearsToFreedom===1?"year":"years"} away at current savings`
                    : "Increase savings to reach this goal"}
                </div>
              </div>
            </div>
            <div style={{ marginTop:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6, color:`${T.white}90`, fontWeight:600 }}>
                <span>Progress to financial freedom</span>
                <span style={{ color:T.goldLight }}>{freedomProgress.toFixed(0)}%</span>
              </div>
              <div style={{ height:10, borderRadius:5, background:`${T.white}1A`, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:5, width:`${freedomProgress}%`, background:`linear-gradient(90deg, ${T.gold}, ${T.goldLight})`, transition:"width 1.2s cubic-bezier(.4,0,.2,1)" }} />
              </div>
              <p style={{ fontSize:11, color:`${T.white}45`, marginTop:10, lineHeight:1.6 }}>Based on the 4% safe-withdrawal rule applied to your financial assets and current annual expenses. Projection assumes a {(portR*100).toFixed(1)}% portfolio return and {(infl*100).toFixed(0)}% expense inflation. This is an educational estimate, not investment advice.</p>
            </div>
          </div>
        </div>
      </div>

      {/* SWOT */}
      <div className="fadeUp report-section section-swot" style={{ marginBottom:36 }}>
        <SectionHead icon="🔍" sub="Auto-generated from your financial data">SWOT Analysis</SectionHead>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[{t:"Strengths",items:swot.s,c:T.emerald,i:"💪"},{t:"Weaknesses",items:swot.w,c:T.ruby,i:"⚠️"},{t:"Opportunities",items:swot.o,c:T.teal,i:"🚀"},{t:"Threats",items:swot.t,c:T.amber,i:"🛡️"}].map(s=>(
            <div key={s.t} className="hover-lift" style={{ background:T.white, borderRadius:14, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,0.04)", borderLeft:`4px solid ${s.c}` }}>
              <div style={{ fontWeight:700, color:s.c, marginBottom:10, fontSize:14 }}>{s.i} {s.t}</div>
              {s.items.map((item,i)=><div key={i} style={{ fontSize:13, color:T.navy, marginBottom:6, paddingLeft:12, borderLeft:`2px solid ${s.c}20`, lineHeight:1.5 }}>{item}</div>)}
            </div>
          ))}
        </div>
      </div>

      {/* Cashflow */}
      <div className="fadeUp report-section section-cashflow" style={{ marginBottom:36 }}>
        <SectionHead icon="💰">Cashflow Analysis</SectionHead>
        <div style={{ background:T.white, borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,0.04)", marginBottom:12 }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[{n:"Annual",income:totInc,expenses:totExp,savings:savM*12}]}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${T.silver}40`} />
              <XAxis dataKey="n" tick={{fontFamily:BODY,fontSize:12}} />
              <YAxis tickFormatter={v=>fmt(v)} tick={{fontFamily:BODY,fontSize:11}} />
              <Tooltip formatter={v=>fmt(v)} />
              <Bar dataKey="income" fill={T.emerald} name="Income" radius={[6,6,0,0]} />
              <Bar dataKey="expenses" fill={T.ruby} name="Expenses" radius={[6,6,0,0]} />
              <Bar dataKey="savings" fill={T.teal} name="Savings" radius={[6,6,0,0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {expPie.length>0 && <div style={{ background:T.white, borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ fontWeight:700, color:T.navy, marginBottom:12 }}>Expense Breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={expPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
              {expPie.map((_,i)=><Cell key={i} fill={T.chart[i%T.chart.length]} />)}
            </Pie><Tooltip formatter={v=>fmt(v)} /></PieChart>
          </ResponsiveContainer>
        </div>}
      </div>

      {/* Net Worth */}
      <div className="fadeUp report-section section-networth" style={{ marginBottom:36 }}>
        <SectionHead icon="🏦">Net Worth & Assets</SectionHead>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:16 }}>
          <MetricCard icon="📊" label="Financial Assets" value={fmt(totFA)} color={T.emerald} />
          <MetricCard icon="🏠" label="Physical Assets" value={fmt(totPA)} color={T.navy} />
          <MetricCard icon="💳" label="Liabilities" value={fmt(totL)} sub={totL===0?"Debt-free ✅":""} color={T.ruby} />
          <MetricCard icon="⚖️" label="Leverage" value={`${levR}%`} sub={parseFloat(levR)<36?"Comfortable ✅":"Needs attention"} color={parseFloat(levR)<36?T.emerald:T.ruby} />
        </div>
        <DrillDownAllocation root={allocationTree} />
        <div style={{ background:T.white, borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,0.04)", marginTop:12 }}>
          <div style={{ fontWeight:700, color:T.navy, marginBottom:14 }}>Financial Health Ratios</div>
          <ProgressBar label="Savings Ratio" value={parseFloat(savRat)} color={T.emerald} />
          <ProgressBar label="Financial Assets Ratio" value={parseFloat(faR)} color={T.teal} />
          <ProgressBar label="Debt Safety (100-Leverage)" value={Math.max(100-parseFloat(levR),0)} color={T.gold} />
          <ProgressBar label="Emergency Coverage" value={Math.min((totFA/contingency)*100/6,100)} color={T.navy} />
        </div>
      </div>

      {/* Goals */}
      <div className="fadeUp report-section section-goals" style={{ marginBottom:36 }}>
        <SectionHead icon="🎯">Goal Planning</SectionHead>
        <div style={{ background:`${T.gold}08`, borderRadius:14, padding:18, marginBottom:14, border:`1px solid ${T.gold}20` }}>
          <div style={{ fontWeight:700, color:T.navy, marginBottom:4, fontSize:15 }}>🔒 Emergency Fund</div>
          <div style={{ fontSize:14, color:T.slate }}>Maintain <strong>{fmt(contingency)}</strong> (6 months expenses) in liquid assets before pursuing investment goals.</div>
        </div>

        {/* Traffic-light summary + legend */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, background:T.white, borderRadius:14, padding:"14px 18px", marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            {[["on","On Track"],["risk","At Risk"],["off","Off Track"]].map(([k,lbl])=>(
              <div key={k} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:700, color:GOAL_STATUS[k].color }}>
                <span>{GOAL_STATUS[k].dot}</span>
                <span>{statusCounts[k]||0}</span>
                <span style={{ color:T.slate, fontWeight:500 }}>{lbl}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize:12, color:T.steel, fontStyle:"italic" }}>Based on your assets + monthly savings, allocated by priority</div>
        </div>

        {goals.map((g,i) => {
          const st = GOAL_STATUS[g.status];
          const pct = Math.round(g.coverage*100);
          return (
          <div key={i} className="hover-lift" style={{ background:T.white, borderRadius:14, padding:20, marginBottom:12, boxShadow:"0 2px 12px rgba(0,0,0,0.04)", borderLeft:`4px solid ${st.color}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, gap:10, flexWrap:"wrap" }}>
              <div><div style={{ fontWeight:700, fontSize:17, color:T.navy }}>{g.name}</div><div style={{ fontSize:13, color:T.steel }}>{g.year} • {g.yrs} years away · {g.priority} priority</div></div>
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 14px", borderRadius:20, fontSize:13, fontWeight:700, background:`${st.color}15`, color:st.color, whiteSpace:"nowrap" }}>
                {st.dot} {st.label}
              </span>
            </div>
            {/* Funding coverage bar */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
                <span style={{ color:T.slate, fontWeight:600 }}>Funding coverage</span>
                <span style={{ color:st.color, fontWeight:700 }}>{pct}% funded</span>
              </div>
              <div style={{ height:8, borderRadius:4, background:`${T.silver}30`, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:4, width:`${pct}%`, background:`linear-gradient(90deg, ${st.color}, ${st.color}BB)`, transition:"width 1s ease" }} />
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10 }}>
              {[["Today's Value",fmt(g.currentValue),T.navy],["Future Value",fmt(g.futV),T.ruby],["Lumpsum Needed",fmt(g.lump),T.teal],["Monthly SIP",fmt(g.sip),T.gold]].map(([l,v,c])=>(
                <div key={l} style={{ padding:12, background:`${c}06`, borderRadius:10 }}>
                  <div style={{ fontSize:11, color:T.steel, textTransform:"uppercase", fontWeight:600, letterSpacing:"0.05em" }}>{l}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:c, fontFamily:DISPLAY }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>

      {/* Retirement */}
      <div className="fadeUp report-section section-retirement" style={{ marginBottom:36 }}>
        <SectionHead icon="🏖️" sub="Three-scenario modeling for your retirement">Retirement Planning</SectionHead>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12, marginBottom:16 }}>
          <MetricCard icon="🎯" label="Corpus Needed" value={fmt(retCorp)} sub={`At age ${data.retirementAge}`} color={T.ruby} />
          <MetricCard icon="📅" label="Annual Exp. at Retirement" value={fmt(retExpAtRet)} sub={`${fmt(retExpAtRet/12)}/mo`} color={T.amber} />
          <MetricCard icon="📈" label="Projected Corpus" value={fmt(projCorpus)} sub={projCorpus>=retCorp?"On track ✅":"Gap exists ⚠️"} color={projCorpus>=retCorp?T.emerald:T.ruby} />
        </div>
        <div style={{ background:T.white, borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,0.04)", overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14, fontFamily:BODY }}>
            <thead><tr style={{ background:T.navy, color:T.white }}>
              <th style={{ padding:"10px 14px", textAlign:"left", borderRadius:"8px 0 0 0" }}>Scenario</th>
              <th style={{ padding:"10px 14px", textAlign:"right" }}>Return</th>
              <th style={{ padding:"10px 14px", textAlign:"right" }}>Corpus</th>
              <th style={{ padding:"10px 14px", textAlign:"right" }}>Monthly</th>
              <th style={{ padding:"10px 14px", textAlign:"right", borderRadius:"0 8px 0 0" }}>Status</th>
            </tr></thead>
            <tbody>
              {[{n:"Base",m:1,c:T.teal},{n:"Aggressive",m:1.5,c:T.amber},{n:"Highly Aggressive",m:2,c:T.ruby}].map((sc,i)=>{
                const wR=(data.equityAlloc/100)*(data.equityReturn*sc.m/100)+(data.debtAlloc/100)*(data.debtReturn/100);
                const pc = fv(totFA,wR,yToRet)+(savM>0&&wR>0?savM*((Math.pow(1+wR/12,yToRet*12)-1)/(wR/12)):savM*yToRet*12);
                const mw = pc*postRetR/12;
                return (<tr key={i} style={{ background:i%2===0?T.offwhite:T.white }}>
                  <td style={{ padding:"10px 14px", fontWeight:700, color:sc.c }}>{sc.n}</td>
                  <td style={{ padding:"10px 14px", textAlign:"right" }}>{(wR*100).toFixed(1)}%</td>
                  <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:700 }}>{fmt(pc)}</td>
                  <td style={{ padding:"10px 14px", textAlign:"right" }}>{fmt(mw)}</td>
                  <td style={{ padding:"10px 14px", textAlign:"right" }}><Badge color={pc>=retCorp?T.emerald:T.ruby}>{pc>=retCorp?"✅ On Track":"⚠️ Gap"}</Badge></td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5-Year Projection */}
      <div className="fadeUp report-section section-projection" style={{ marginBottom:36 }}>
        <SectionHead icon="📈">5-Year Cashflow Projection</SectionHead>
        <div style={{ background:T.white, borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cf5}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${T.silver}40`} />
              <XAxis dataKey="year" tick={{fontFamily:BODY,fontSize:12}} />
              <YAxis tickFormatter={v=>fmt(v)} tick={{fontFamily:BODY,fontSize:11}} />
              <Tooltip formatter={v=>fmt(v)} />
              <Area type="monotone" dataKey="income" fill={`${T.emerald}25`} stroke={T.emerald} strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expenses" fill={`${T.ruby}25`} stroke={T.ruby} strokeWidth={2} name="Expenses" />
              <Area type="monotone" dataKey="savings" fill={`${T.teal}25`} stroke={T.teal} strokeWidth={2} name="Savings" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI PRO SECTION */}
      <div className="fadeUp report-section section-ai" style={{ marginBottom:36 }}>
        <div style={{ background:`linear-gradient(135deg, ${T.navy}, ${T.ocean})`, borderRadius:20, padding:32, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:`${T.gold}10` }} />
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, boxShadow:`0 4px 16px ${T.gold}30` }}>🤖</div>
            <div>
              <h2 style={{ fontFamily:DISPLAY, fontSize:26, fontWeight:700, color:T.white }}>AI Pro Analysis</h2>
              <p style={{ color:`${T.white}60`, fontSize:13 }}>Personalised recommendations powered by AI</p>
            </div>
            <Badge color={T.goldLight}>PRO</Badge>
          </div>

          {!aiAnalysis && !aiLoading && (
            <div>
              <p style={{ color:`${T.white}80`, fontSize:15, lineHeight:1.7, marginBottom:20 }}>
                Get AI-powered personalised recommendations — including tax optimisation, portfolio rebalancing, goal prioritisation, and risk analysis. Just like having a professional wealth advisor review your plan.
              </p>
              <button onClick={onRequestAI} className="btn-gold" style={{ padding:"14px 36px", borderRadius:12, fontSize:16 }}>
                ✨ Get AI Analysis — {PRO_PRICE_DISPLAY}
              </button>
              <p style={{ color:`${T.white}40`, fontSize:12, marginTop:12 }}>One-time payment • Personalised report for your profile</p>
            </div>
          )}

          {aiLoading && (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <div style={{ width:40, height:40, border:`3px solid ${T.gold}30`, borderTopColor:T.gold, borderRadius:"50%", margin:"0 auto", animation:"pulse 1s infinite" }} />
              <p style={{ color:T.goldLight, marginTop:14, fontSize:15 }}>Analyzing your financial profile...</p>
              <p style={{ color:`${T.white}50`, fontSize:13, marginTop:4 }}>This takes a few seconds</p>
            </div>
          )}

          {aiAnalysis && (
            <div style={{ marginTop:8 }}>
              <div style={{ background:`${T.white}10`, borderRadius:14, padding:20, marginBottom:16 }}>
                <div style={{ fontWeight:700, color:T.goldLight, marginBottom:8, fontSize:14 }}>📋 Executive Summary</div>
                <p style={{ color:`${T.white}90`, fontSize:14, lineHeight:1.7 }}>{aiAnalysis.summary}</p>
              </div>
              <div style={{ background:`${T.white}10`, borderRadius:14, padding:20, marginBottom:16 }}>
                <div style={{ fontWeight:700, color:T.emerald, marginBottom:12, fontSize:14 }}>💪 Key Strengths</div>
                {aiAnalysis.strengths.map((s,i)=><div key={i} style={{ fontSize:14, color:`${T.white}85`, marginBottom:8, paddingLeft:14, borderLeft:`2px solid ${T.emerald}50`, lineHeight:1.6 }}>{s}</div>)}
              </div>
              <div style={{ background:`${T.white}10`, borderRadius:14, padding:20, marginBottom:16 }}>
                <div style={{ fontWeight:700, color:T.goldLight, marginBottom:12, fontSize:14 }}>🎯 Personalised Recommendations</div>
                {aiAnalysis.recommendations.map((r,i)=>(
                  <div key={i} style={{ marginBottom:16, paddingLeft:14, borderLeft:`2px solid ${T.gold}50` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontWeight:700, color:T.white, fontSize:14 }}>{r.title}</span>
                      <span style={{ padding:"2px 10px", borderRadius:12, fontSize:11, fontWeight:700, background:r.urgency==="Immediate"?`${T.ruby}30`:r.urgency==="This Quarter"?`${T.amber}30`:`${T.teal}30`, color:r.urgency==="Immediate"?T.ruby:r.urgency==="This Quarter"?T.amber:T.teal }}>{r.urgency}</span>
                    </div>
                    <p style={{ fontSize:13, color:`${T.white}75`, lineHeight:1.6 }}>{r.detail}</p>
                  </div>
                ))}
              </div>
              <div style={{ background:`${T.ruby}15`, borderRadius:14, padding:20 }}>
                <div style={{ fontWeight:700, color:T.ruby, marginBottom:12, fontSize:14 }}>⚠️ Risk Warnings</div>
                {aiAnalysis.riskWarnings.map((w,i)=><div key={i} style={{ fontSize:13, color:`${T.white}80`, marginBottom:8, paddingLeft:14, borderLeft:`2px solid ${T.ruby}40`, lineHeight:1.6 }}>{w}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Actionables */}
      <div className="fadeUp report-section section-actionables" style={{ marginBottom:36 }}>
        <SectionHead icon="✅">Key Actionables</SectionHead>
        {[
          {i:"💎",t:"Monthly Investments",d:`Invest your surplus of ${fmt(savM-data.sipMonthly-data.pfMonthly)} in ${data.equityAlloc}:${data.debtAlloc} Equity:Debt ratio.`},
          {i:"⚖️",t:"Rebalance Portfolio",d:`Review and maintain ${data.equityAlloc}% Equity / ${data.debtAlloc}% Debt allocation semi-annually.`},
          {i:"🔒",t:"Emergency Fund",d:`Keep ${fmt(contingency)} in liquid assets (savings, liquid MF, short FD).`},
          {i:"📋",t:"Insurance Review",d:"Review life insurance (10× income), health cover, and critical illness adequacy."},
          {i:"📝",t:"Estate Planning",d:"Update your Will when adding new assets. Set up power of attorney."},
          {i:"🔄",t:"Regular Reviews",d:"Review financial plan every 6 months. Adjust for life changes."},
        ].map((a,i)=>(
          <div key={i} className="hover-lift" style={{ background:T.white, borderRadius:14, padding:20, marginBottom:10, boxShadow:"0 2px 12px rgba(0,0,0,0.04)", display:"flex", gap:16, alignItems:"flex-start" }}>
            <div style={{ width:44, height:44, borderRadius:12, background:`${T.gold}10`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{a.i}</div>
            <div><div style={{ fontWeight:700, color:T.navy, fontSize:15, marginBottom:3 }}>{a.t}</div><div style={{ fontSize:14, color:T.slate, lineHeight:1.6 }}>{a.d}</div></div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{ background:`${T.steel}08`, borderRadius:14, padding:20, border:`1px dashed ${T.silver}`, marginBottom:28 }}>
        <div style={{ fontWeight:700, color:T.steel, marginBottom:6, fontSize:12, textTransform:"uppercase", letterSpacing:"0.06em" }}>⚠️ Disclaimer</div>
        <div style={{ fontSize:13, color:T.steel, lineHeight:1.7 }}>This is an auto-generated financial plan for informational purposes only. It is not professional financial advice. Consult a SEBI-registered investment adviser before making decisions. Projections are based on assumptions and actual results may vary significantly.</div>
      </div>

      <div className="no-print" style={{ textAlign:"center" }}>
        <button onClick={onBack} className="btn-gold" style={{ padding:"14px 44px", borderRadius:14, fontSize:16 }}>← Edit & Regenerate</button>
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SITE FOOTER (shown on all pages)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SOCIALS = [
  {
    name: "Website",
    label: "auris8.com",
    href: "https://auris8.com",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.93V18a1 1 0 00-2 0v1.93A8.001 8.001 0 014.07 13H6a1 1 0 000-2H4.07A8.001 8.001 0 0111 4.07V6a1 1 0 002 0V4.07A8.001 8.001 0 0119.93 11H18a1 1 0 000 2h1.93A8.001 8.001 0 0113 19.93z"/>
      </svg>
    ),
    color: T.gold,
  },
  {
    name: "YouTube",
    label: "YouTube @AurisWealth",
    href: "https://www.youtube.com/@AurisWealth",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/>
      </svg>
    ),
    color: "#FF0000",
  },
  {
    name: "Twitter / X",
    label: "@planmycashflows on X",
    href: "https://x.com/planmycashflows",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.727-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: "#1DA1F2",
  },
  {
    name: "Instagram",
    label: "Instagram @planmycashflows",
    href: "https://www.instagram.com/planmycashflows/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    color: "#E1306C",
  },
  {
    name: "Facebook",
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61576522393432",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
      </svg>
    ),
    color: "#1877F2",
  },
  {
    name: "Topmate",
    label: "Topmate — Book a Session",
    href: "https://topmate.io/planmycashflows/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a5 5 0 110 10A5 5 0 0112 2zm0 12c5.523 0 10 2.239 10 5v1a1 1 0 01-1 1H3a1 1 0 01-1-1v-1c0-2.761 4.477-5 10-5z"/>
      </svg>
    ),
    color: "#7C3AED",
  },
];

const SiteFooter = () => (
  <footer className="no-print" style={{ background:T.navy, padding:"32px 24px 24px", borderTop:`1px solid ${T.gold}15` }}>
    <div style={{ maxWidth:960, margin:"0 auto", display:"flex", flexDirection:"column", alignItems:"center", gap:18 }}>
      {/* Brand */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <img src="/auris-logo.png" alt="PlanMyCashflows" style={{ height:32, objectFit:"contain" }} />
        <span style={{ fontFamily:DISPLAY, fontSize:18, color:T.white }}>PlanMy<span style={{ color:T.gold }}>Cashflows</span></span>
      </div>

      {/* Social Icons */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
        {SOCIALS.map(s => (
          <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
            style={{
              width:42, height:42, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",
              background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.65)",
              border:"1px solid rgba(255,255,255,0.08)", transition:"all 0.25s", textDecoration:"none",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = s.color + "25"; e.currentTarget.style.color = s.color; e.currentTarget.style.borderColor = s.color + "60"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            {s.icon}
          </a>
        ))}
      </div>

      {/* Text links */}
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
        {SOCIALS.map(s => (
          <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer"
            style={{ fontSize:12, color:`${T.white}40`, textDecoration:"none", transition:"color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = s.color}
            onMouseLeave={e => e.currentTarget.style.color = `${T.white}40`}
          >
            {s.label}
          </a>
        ))}
      </div>

      {/* Legal */}
      <p style={{ color:`${T.white}25`, fontSize:11, textAlign:"center", marginTop:4 }}>
        © 2026 Auris Pvt Ltd · PlanMyCashflows · Not SEBI registered · For informational purposes only
      </p>
    </div>
  </footer>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ════════════════════════════════════════════════════
// GUIDED PLAN (YNAB-style) — simple questions → numbers → plan
// ════════════════════════════════════════════════════
const toNum = (v) => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };

const GUIDED_QUESTIONS = [
  // ── About You ──
  { id:"lifeStage", section:"About You", q:"Where are you in life right now?", sub:"This helps us pick the right time horizon.", type:"single",
    options:[{icon:"🌱",label:"Just starting out",value:"start"},{icon:"🚀",label:"Building my career",value:"build"},{icon:"💼",label:"Peak earning years",value:"peak"},{icon:"🏖️",label:"Near / in retirement",value:"retire"}] },
  { id:"ageBand", section:"About You", q:"Which age group are you in?", sub:"A rough range is fine — you'll confirm the exact age later.", type:"single",
    options:[{icon:"🧑",label:"20s",value:25},{icon:"🧑‍💼",label:"30s",value:35},{icon:"👨‍👩‍👧",label:"40s",value:45},{icon:"🧓",label:"50s",value:55},{icon:"👴",label:"60 or above",value:65}] },
  { id:"maritalStatus", section:"About You", q:"What's your marital status?", sub:"", type:"single",
    options:[{icon:"🧍",label:"Single",value:"single"},{icon:"💍",label:"Married",value:"married"},{icon:"💔",label:"Divorced",value:"divorced"},{icon:"🕯️",label:"Widowed",value:"widowed"}] },
  { id:"dependents", section:"About You", q:"Who depends on you financially?", sub:"Pick all that apply.", type:"multi",
    options:[{icon:"🧍",label:"Just me",value:"self"},{icon:"💑",label:"Spouse / partner",value:"spouse"},{icon:"🧒",label:"Children",value:"kids"},{icon:"👵",label:"Parents",value:"parents"}] },
  { id:"kids", section:"About You", q:"How many children do you support?", sub:"", type:"single", showIf:a=>Array.isArray(a.dependents)&&a.dependents.includes("kids"),
    options:[{icon:"1️⃣",label:"One",value:1},{icon:"2️⃣",label:"Two",value:2},{icon:"3️⃣",label:"Three or more",value:3}] },
  { id:"employment", section:"About You", q:"How do you earn your primary income?", sub:"", type:"single",
    options:[{icon:"🏢",label:"Salaried — private",value:"private"},{icon:"🏛️",label:"Salaried — government",value:"govt"},{icon:"🎖️",label:"Defence services",value:"defence"},{icon:"💻",label:"Self-employed / freelance",value:"self"},{icon:"🏭",label:"Business owner",value:"business"},{icon:"🏖️",label:"Retired",value:"retired"}] },
  { id:"cityTier", section:"About You", q:"Where do you live?", sub:"Cost of living varies a lot by city.", type:"single",
    options:[{icon:"🌆",label:"Metro (Mumbai, Delhi, etc.)",value:"metro"},{icon:"🏙️",label:"Tier-2 city",value:"tier2"},{icon:"🏡",label:"Tier-3 / town",value:"tier3"}] },
  // ── Income ──
  { id:"incomeStability", section:"Income", q:"How steady is your income?", sub:"", type:"single",
    options:[{icon:"🏢",label:"Very steady (salaried)",value:"steady"},{icon:"📊",label:"Mostly steady",value:"mostly"},{icon:"📈",label:"Variable / business",value:"variable"},{icon:"🎲",label:"Irregular",value:"irregular"}] },
  { id:"incomeSources", section:"Income", q:"How many income sources do you have?", sub:"Salary, rent, business, freelance, etc.", type:"single",
    options:[{icon:"1️⃣",label:"Just one",value:"one"},{icon:"2️⃣",label:"Two",value:"two"},{icon:"3️⃣",label:"Three or more",value:"threePlus"}] },
  { id:"incomeGrowthExp", section:"Income", q:"How fast do you expect your income to grow?", sub:"", type:"single",
    options:[{icon:"🐢",label:"Slowly (≈3%/yr)",value:"low"},{icon:"🚶",label:"Moderately (≈6%/yr)",value:"moderate"},{icon:"🏃",label:"Quickly (≈10%/yr)",value:"high"}] },
  { id:"bonusVariable", section:"Income", q:"Do you get bonuses or variable pay?", sub:"", type:"single",
    options:[{icon:"✅",label:"Yes, a meaningful chunk",value:"yes"},{icon:"➖",label:"A little",value:"some"},{icon:"❌",label:"No",value:"no"}] },
  // ── Spending ──
  { id:"trackSpending", section:"Spending", q:"How do you track your spending today?", sub:"", type:"single",
    options:[{icon:"🤷",label:"I don't track",value:"no"},{icon:"🧠",label:"Mentally",value:"mentally"},{icon:"📊",label:"A spreadsheet",value:"spreadsheet"},{icon:"📱",label:"An app",value:"app"}] },
  { id:"home", section:"Spending", q:"What's your home situation?", sub:"", type:"single",
    options:[{icon:"🔑",label:"Renting",value:"rent"},{icon:"🏠",label:"Own — with a home loan",value:"loan"},{icon:"🏡",label:"Own — fully paid",value:"owned"},{icon:"👨‍👩‍👧",label:"Live with family",value:"family"}] },
  { id:"vehicles", section:"Spending", q:"How many vehicles in your household?", sub:"", type:"single",
    options:[{icon:"🚌",label:"None",value:"0"},{icon:"🚗",label:"One",value:"1"},{icon:"🚙",label:"Two or more",value:"2plus"}] },
  { id:"car", section:"Spending", q:"Is any vehicle on a loan?", sub:"", type:"single", showIf:a=>a.vehicles==="1"||a.vehicles==="2plus",
    options:[{icon:"💸",label:"Yes — on loan",value:"loan"},{icon:"✅",label:"No — paid off",value:"paid"}] },
  { id:"eatOut", section:"Spending", q:"How often do you eat out or order in?", sub:"", type:"single",
    options:[{icon:"🍱",label:"Rarely",value:"rarely"},{icon:"🍽️",label:"Weekly",value:"weekly"},{icon:"🍔",label:"A few times a week",value:"often"},{icon:"🛵",label:"Almost daily",value:"daily"}] },
  { id:"subscriptionsCount", section:"Spending", q:"How many paid subscriptions do you have?", sub:"OTT, music, apps, gym, etc.", type:"single",
    options:[{icon:"🔹",label:"0–1",value:"few"},{icon:"🔸",label:"2–4",value:"some"},{icon:"🔶",label:"5 or more",value:"many"}] },
  { id:"supportFamily", section:"Spending", q:"Do you financially support parents or extended family?", sub:"", type:"single",
    options:[{icon:"✅",label:"Yes, regularly",value:"yes"},{icon:"➖",label:"Occasionally",value:"sometimes"},{icon:"❌",label:"No",value:"no"}] },
  { id:"spending", section:"Spending", q:"How would you describe your spending?", sub:"Be honest — there's no wrong answer.", type:"single",
    options:[{icon:"🐷",label:"I save a lot",value:"saver"},{icon:"🙂",label:"I save some",value:"some"},{icon:"⚖️",label:"I break even",value:"even"},{icon:"😅",label:"I tend to overspend",value:"over"}] },
  // ── Debt ──
  { id:"hasLoans", section:"Debt", q:"Do you currently have any loans?", sub:"", type:"single",
    options:[{icon:"✅",label:"Yes",value:"yes"},{icon:"🎉",label:"No, I'm debt-free",value:"no"}] },
  { id:"loans", section:"Debt", q:"Which loans do you have?", sub:"Pick all that apply.", type:"multi", showIf:a=>a.hasLoans==="yes",
    options:[{icon:"🏠",label:"Home loan",value:"home"},{icon:"🚗",label:"Car loan",value:"car"},{icon:"💳",label:"Credit card debt",value:"cc"},{icon:"🧾",label:"Personal loan",value:"personal"},{icon:"🎓",label:"Education loan",value:"education"}] },
  { id:"ccBehavior", section:"Debt", q:"How do you handle your credit card bill?", sub:"", type:"single",
    options:[{icon:"✅",label:"Pay in full",value:"full"},{icon:"〽️",label:"Pay minimum / partial",value:"minimum"},{icon:"🔴",label:"Carry a balance",value:"carry"},{icon:"🚫",label:"I don't use one",value:"none"}] },
  { id:"debtFeeling", section:"Debt", q:"How do you feel about your debt?", sub:"", type:"single",
    options:[{icon:"😀",label:"No debt",value:"none"},{icon:"🙂",label:"Manageable",value:"manageable"},{icon:"😟",label:"A bit stressful",value:"stressful"},{icon:"😣",label:"Overwhelming",value:"overwhelming"}] },
  { id:"debtVsInvest", section:"Debt", q:"What matters more to you right now?", sub:"", type:"single",
    options:[{icon:"💥",label:"Clearing debt fast",value:"payDebt"},{icon:"⚖️",label:"A bit of both",value:"balance"},{icon:"📈",label:"Investing for growth",value:"invest"}] },
  // ── Savings & Assets ──
  { id:"emergencyFund", section:"Savings & Assets", q:"How big is your emergency fund?", sub:"Cash you could live on if income stopped.", type:"single",
    options:[{icon:"🚫",label:"None yet",value:"none"},{icon:"🔸",label:"Under 3 months",value:"under3"},{icon:"🔹",label:"3–6 months",value:"3to6"},{icon:"🛡️",label:"6+ months",value:"6plus"}] },
  { id:"assetTypes", section:"Savings & Assets", q:"Where is your money today?", sub:"Pick all that apply — we'll ask amounts next.", type:"multi",
    options:[{icon:"🏦",label:"Savings account",value:"savings"},{icon:"📜",label:"Fixed deposits",value:"fd"},{icon:"📈",label:"Mutual funds",value:"mf"},{icon:"📊",label:"Direct stocks",value:"stocks"},{icon:"🏛️",label:"EPF / PPF / NPS",value:"epf"},{icon:"🪙",label:"Gold",value:"gold"},{icon:"🏠",label:"Real estate (extra)",value:"realestate"},{icon:"₿",label:"Crypto",value:"crypto"}] },
  { id:"investingExp", section:"Savings & Assets", q:"How experienced are you with investing?", sub:"", type:"single",
    options:[{icon:"🆕",label:"Beginner",value:"none"},{icon:"📘",label:"Some basics",value:"beginner"},{icon:"📗",label:"Fairly confident",value:"intermediate"},{icon:"📕",label:"Very experienced",value:"advanced"}] },
  { id:"investRegular", section:"Savings & Assets", q:"Do you invest regularly?", sub:"", type:"single",
    options:[{icon:"❌",label:"Not really",value:"no"},{icon:"➖",label:"Sometimes",value:"sometimes"},{icon:"📅",label:"Yes — monthly SIP",value:"monthly"}] },
  { id:"retirementAccounts", section:"Savings & Assets", q:"Which retirement accounts do you have?", sub:"Pick all that apply.", type:"multi",
    options:[{icon:"🏛️",label:"EPF",value:"epf"},{icon:"📜",label:"PPF",value:"ppf"},{icon:"📈",label:"NPS",value:"nps"},{icon:"🚫",label:"None",value:"none"}] },
  // ── Protection ──
  { id:"lifeInsurance", section:"Protection", q:"Do you have life insurance?", sub:"", type:"single",
    options:[{icon:"🚫",label:"None",value:"none"},{icon:"🔸",label:"Some cover",value:"some"},{icon:"🛡️",label:"Adequate term cover",value:"adequate"},{icon:"❓",label:"Not sure",value:"unsure"}] },
  { id:"healthInsurance", section:"Protection", q:"Do you have health insurance?", sub:"", type:"single",
    options:[{icon:"🚫",label:"None",value:"none"},{icon:"🏢",label:"Only via employer",value:"employer"},{icon:"🧾",label:"Personal policy",value:"personal"},{icon:"✅",label:"Both",value:"both"}] },
  { id:"willNominee", section:"Protection", q:"Have you set up a will & nominees?", sub:"", type:"single",
    options:[{icon:"❌",label:"Not yet",value:"no"},{icon:"〽️",label:"Partially (some nominees)",value:"partial"},{icon:"✅",label:"Yes, sorted",value:"yes"}] },
  // ── Goals ──
  { id:"goal", section:"Goals", q:"What's your #1 financial goal?", sub:"We'll build the plan around this.", type:"single",
    options:[{icon:"🏠",label:"Buy a home",value:"home"},{icon:"🎓",label:"Kids' education",value:"education"},{icon:"🏝️",label:"Retire early",value:"retire"},{icon:"📈",label:"Build wealth",value:"wealth"},{icon:"🛟",label:"Emergency safety net",value:"emergency"},{icon:"✈️",label:"Travel / lifestyle",value:"travel"}] },
  { id:"goals2", section:"Goals", q:"Any other goals on your radar?", sub:"Pick all that apply (optional).", type:"multi",
    options:[{icon:"🏠",label:"Home",value:"home"},{icon:"🎓",label:"Education",value:"education"},{icon:"🚗",label:"A car",value:"car"},{icon:"✈️",label:"Travel",value:"travel"},{icon:"🏝️",label:"Retirement",value:"retire"},{icon:"📈",label:"Wealth",value:"wealth"}] },
  { id:"retireAge", section:"Goals", q:"When do you want work to become optional?", sub:"Your target financial-freedom age.", type:"single",
    options:[{icon:"⚡",label:"By 45",value:45},{icon:"🎯",label:"By 50",value:50},{icon:"🛠️",label:"By 55",value:55},{icon:"🌅",label:"By 60",value:60},{icon:"⏳",label:"65 or later",value:65}] },
  { id:"legacy", section:"Goals", q:"How important is leaving a legacy / estate?", sub:"", type:"single",
    options:[{icon:"🔹",label:"Not a priority",value:"low"},{icon:"🔸",label:"Somewhat",value:"medium"},{icon:"🏛️",label:"Very important",value:"high"}] },
  // ── Mindset ──
  { id:"risk", section:"Mindset", q:"If your investments dropped 20% in a month, you'd…", sub:"This sets your risk profile.", type:"single",
    options:[{icon:"😱",label:"Sell everything",value:"cons"},{icon:"😟",label:"Worry, maybe sell some",value:"bal-"},{icon:"😐",label:"Hold and wait it out",value:"bal"},{icon:"😎",label:"Invest more — it's a sale!",value:"agg"}] },
  { id:"horizon", section:"Mindset", q:"How long can you leave money invested?", sub:"", type:"single",
    options:[{icon:"⏱️",label:"Under 3 years",value:"short"},{icon:"📆",label:"3–7 years",value:"medium"},{icon:"📅",label:"7+ years",value:"long"}] },
  { id:"moneyPersona", section:"Mindset", q:"Which sounds most like you?", sub:"", type:"single",
    options:[{icon:"🐷",label:"Saver",value:"saver"},{icon:"🛍️",label:"Spender",value:"spender"},{icon:"🙈",label:"Avoider",value:"avoider"},{icon:"🎯",label:"Optimizer",value:"optimizer"}] },
  { id:"freedomMeaning", section:"Mindset", q:"What does financial freedom mean to you?", sub:"", type:"single",
    options:[{icon:"🚫",label:"Being debt-free",value:"nodebt"},{icon:"💧",label:"Passive income covers expenses",value:"passive"},{icon:"🏝️",label:"Retiring early",value:"retireEarly"},{icon:"🧘",label:"Work becomes a choice",value:"optional"}] },
];

function buildGuidedData(answers, n) {
  const base = JSON.parse(JSON.stringify(defaultData));
  const yr = new Date().getFullYear();
  const age = parseInt(n.age) || answers.ageBand || 35;
  const has = (key, val) => Array.isArray(answers[key]) && answers[key].includes(val);
  base.name = (n.name || "").trim();
  base.city = (n.city || "").trim();
  base.dob = `${yr - age}-01-01`;
  base.retirementAge = answers.retireAge || 55;
  base.incomeGrowth = answers.incomeGrowthExp === "high" ? 10 : answers.incomeGrowthExp === "low" ? 3 : 6;

  const riskMap = { cons:["Conservative",40], "bal-":["Balanced",60], bal:["Balanced",70], agg:["Aggressive",85] };
  let [rp, eq] = riskMap[answers.risk] || ["Balanced",70];
  if (answers.horizon === "short" && eq > 50) eq = 50; // shorten equity for short horizon
  base.riskProfile = rp; base.equityAlloc = eq; base.debtAlloc = 100 - eq;

  base.salaryMonthly = toNum(n.income); base.otherIncomeMonthly = toNum(n.otherIncome);

  // Monthly expenses, grouped from detailed categories + monthly slice of irregular/annual costs
  const mAnnual = (v) => toNum(v) / 12;
  base.householdExp = Math.round(toNum(n.e_housing) + toNum(n.e_utilities) + toNum(n.e_groceries) + toNum(n.e_shopping));
  base.childcareExp = Math.round(toNum(n.e_education));
  base.vacationExp  = Math.round(toNum(n.e_dining) + mAnnual(n.a_vacation));
  base.giftsExp     = Math.round(toNum(n.e_subscriptions) + mAnnual(n.a_festivals));
  base.otherExp     = Math.round(toNum(n.e_transport) + toNum(n.e_health) + toNum(n.e_other) + mAnnual(n.a_insurance) + mAnnual(n.a_maintenance));
  const totExpM = base.householdExp + base.childcareExp + base.vacationExp + base.giftsExp + base.otherExp;
  const annualExp = totExpM * 12;

  base.sipMonthly = toNum(n.sip); base.pfMonthly = 0;

  // Assets by class
  base.assets = [];
  const pushA = (name, type, v) => { if (toNum(v) > 0) base.assets.push({ name, type, value: toNum(v) }); };
  pushA("Mutual Funds", "Equity", n.as_mf);
  pushA("Direct Stocks", "Equity", n.as_stocks);
  pushA("Savings Account", "Debt", n.as_savings);
  pushA("Fixed Deposits", "Debt", n.as_fd);
  pushA("EPF / PPF / NPS", "Debt", n.as_epf);
  pushA("Gold", "Gold", n.as_gold);
  pushA("Crypto", "Other", n.as_crypto);
  if (base.assets.length === 0) base.assets.push({ name:"Savings", type:"Debt", value:0 });

  base.physicalAssets = [];
  if ((answers.home==="owned" || answers.home==="loan") && toNum(n.as_homevalue) > 0) base.physicalAssets.push({ name:"Home", value: toNum(n.as_homevalue) });
  if (toNum(n.as_realestate) > 0) base.physicalAssets.push({ name:"Real Estate", value: toNum(n.as_realestate) });

  // Liabilities
  base.liabilities = [];
  const pushL = (name, out, emi, rate) => { if (toNum(out)>0 || toNum(emi)>0) base.liabilities.push({ name, outstanding:toNum(out), emi:toNum(emi), rate }); };
  const loanSel = (k) => has("loans", k) || (k==="home" && answers.home==="loan") || (k==="car" && answers.car==="loan");
  if (loanSel("home")) pushL("Home Loan", n.l_home_out, n.l_home_emi, 8.5);
  if (loanSel("car")) pushL("Car Loan", n.l_car_out, n.l_car_emi, 9.5);
  if (loanSel("personal")) pushL("Personal Loan", n.l_personal_out, n.l_personal_emi, 13);
  if (loanSel("education")) pushL("Education Loan", n.l_education_out, n.l_education_emi, 9);
  if (loanSel("cc")) pushL("Credit Card", n.l_cc_out, n.l_cc_emi, 38);

  // Insurance (stored for future use)
  base.insurance = { lifeCover: toNum(n.ins_life), healthCover: toNum(n.ins_health) };

  // Goals
  const yToRet = Math.max(base.retirementAge - age, 1);
  const hasKids = Array.isArray(answers.dependents) && answers.dependents.includes("kids");
  const goalDefs = {
    home:      () => ({ name:"Home Purchase",       year: yr+7,      currentValue: toNum(n.g_home)||8000000,       inflation:5,  priority:"High" }),
    education: () => ({ name:"Children's Education", year: yr+15,     currentValue: toNum(n.g_education)||(3000000*(answers.kids||1)), inflation:10, priority:"High" }),
    retire:    () => ({ name:"Early Retirement Fund",year: yr+yToRet, currentValue: annualExp*15||5000000,          inflation:6,  priority:"High" }),
    wealth:    () => ({ name:"Wealth Building",      year: yr+15,     currentValue: 5000000,                          inflation:6,  priority:"Medium" }),
    emergency: () => ({ name:"Emergency Fund",       year: yr+1,      currentValue: totExpM*6||300000,                inflation:6,  priority:"High" }),
    travel:    () => ({ name:"Travel / Lifestyle",   year: yr+3,      currentValue: toNum(n.g_travel)||500000,        inflation:6,  priority:"Low" }),
    car:       () => ({ name:"Car Purchase",         year: yr+4,      currentValue: toNum(n.g_car)||1000000,          inflation:6,  priority:"Medium" }),
  };
  const chosen = new Set([answers.goal, ...(Array.isArray(answers.goals2)?answers.goals2:[])].filter(Boolean));
  if (hasKids) chosen.add("education");
  const goals = [];
  if (answers.goal && goalDefs[answers.goal]) { const g = goalDefs[answers.goal](); g.priority = "High"; goals.push(g); chosen.delete(answers.goal); }
  chosen.forEach(k => { if (goalDefs[k]) goals.push(goalDefs[k]()); });
  if (![...chosen, answers.goal].includes("retire")) goals.push({ name:"Retirement Corpus", year: yr+yToRet, currentValue: annualExp*12||5000000, inflation:6, priority:"High" });
  base.goals = goals;
  return base;
}

const GuidedBudgetCard = ({ data }) => {
  const income = data.salaryMonthly + data.otherIncomeMonthly;
  const essentials = data.householdExp + data.childcareExp;
  const lifestyle = data.vacationExp + data.giftsExp + data.otherExp;
  const emis = data.liabilities.reduce((s,l)=>s+(l.emi||0),0);
  const investing = data.sipMonthly + data.pfMonthly;
  const spent = essentials + lifestyle + emis + investing;
  const leftover = Math.max(income - spent, 0);
  const overAssigned = spent > income;
  const savingsRate = income > 0 ? Math.round((income - essentials - lifestyle - emis) / income * 100) : 0;
  const segs = [
    { label:"Essentials", val:essentials, color:T.navy },
    { label:"Lifestyle", val:lifestyle, color:T.teal },
    { label:"Loan EMIs", val:emis, color:T.ruby },
    { label:"Investing", val:investing, color:T.emerald },
    { label:"Unassigned", val:leftover, color:T.gold },
  ].filter(s=>s.val>0);
  const denom = Math.max(income, spent, 1);
  return (
    <div className="no-print" style={{ background:T.white, borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,0.04)", marginTop:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
        <span style={{ fontSize:22 }}>💸</span>
        <h3 style={{ fontFamily:DISPLAY, fontSize:22, fontWeight:700, color:T.navy }}>Your Monthly Money Plan</h3>
      </div>
      <p style={{ fontSize:13, color:T.steel, marginBottom:16 }}>Give every rupee a job — here's where your {fmt(income)}/month goes.</p>
      <div style={{ display:"flex", height:26, borderRadius:8, overflow:"hidden", marginBottom:14, background:`${T.silver}20` }}>
        {segs.map((s,i)=><div key={i} title={`${s.label}: ${fmt(s.val)}`} style={{ width:`${s.val/denom*100}%`, background:s.color }} />)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
        {segs.map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
            <span style={{ width:10, height:10, borderRadius:3, background:s.color }} />
            <span style={{ color:T.slate }}>{s.label}</span>
            <span style={{ marginLeft:"auto", fontWeight:700, color:T.navy }}>{fmt(s.val)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop:16, padding:14, borderRadius:12, background: overAssigned?`${T.ruby}0D`:`${T.emerald}0D`, border:`1px solid ${overAssigned?T.ruby:T.emerald}25`, fontSize:14, color:T.navy, lineHeight:1.6 }}>
        {overAssigned
          ? <>⚠️ You're spending about <strong>{fmt(spent-income)}/month</strong> more than you earn. Trim lifestyle costs or grow income before adding new goals.</>
          : <>✅ Savings rate <strong>{savingsRate}%</strong> · <strong>{fmt(leftover)}/month</strong> still unassigned — put it to work via SIPs or toward your goals below.</>}
      </div>
    </div>
  );
};

// ── Cluster 2: Zero-based budget ("give every rupee a job") + true expenses ──
const BUDGET_GROUPS = [
  { id:"essentials", label:"Essentials", color:T.navy, items:[["housing","🏠 Housing / Rent"],["utilities","💡 Utilities"],["groceries","🛒 Groceries"],["transport","🚗 Transport"],["health","🏥 Health"]] },
  { id:"lifestyle", label:"Lifestyle", color:T.teal, items:[["dining","🍽️ Dining & fun"],["shopping","🛍️ Shopping"],["subscriptions","📺 Subscriptions"],["education","🎓 Childcare / school"],["other","➕ Other"]] },
  { id:"true", label:"True Expenses — monthly set-aside for big yearly bills", color:T.amber, items:[["insurance","🛡️ Insurance"],["festivals","🎁 Festivals & gifts"],["vacation","✈️ Vacation fund"],["maintenance","🔧 Maintenance"]] },
];
const ZeroBudget = ({ data, n }) => {
  const income = data.salaryMonthly + data.otherIncomeMonthly;
  const init = {
    housing:toNum(n.e_housing), utilities:toNum(n.e_utilities), groceries:toNum(n.e_groceries), transport:toNum(n.e_transport), health:toNum(n.e_health),
    dining:toNum(n.e_dining), shopping:toNum(n.e_shopping), subscriptions:toNum(n.e_subscriptions), education:toNum(n.e_education), other:toNum(n.e_other),
    insurance:Math.round(toNum(n.a_insurance)/12), festivals:Math.round(toNum(n.a_festivals)/12), vacation:Math.round(toNum(n.a_vacation)/12), maintenance:Math.round(toNum(n.a_maintenance)/12),
  };
  const [amts, setAmts] = useState(init);
  const set = (k) => (e) => setAmts(p => ({ ...p, [k]: e.target.value }));
  const emis = data.liabilities.reduce((s,l)=>s+(l.emi||0),0);
  const sip = data.sipMonthly + data.pfMonthly;
  const assigned = Object.values(amts).reduce((s,v)=>s+toNum(v),0) + emis + sip;
  const toAssign = income - assigned;
  const inputStyle = { width:90, padding:"6px 8px", border:`1.5px solid ${T.silver}50`, borderRadius:8, fontSize:13, textAlign:"right", color:T.navy, fontFamily:BODY };
  const banner = toAssign === 0
    ? { bg:`${T.emerald}12`, c:T.emerald, txt:"🎉 Every rupee has a job — your budget is balanced!" }
    : toAssign > 0
      ? { bg:`${T.gold}12`, c:T.goldDim, txt:`${fmt(toAssign)} still to assign — give it a job (more savings, a goal, or paying down debt).` }
      : { bg:`${T.ruby}10`, c:T.ruby, txt:`Over-assigned by ${fmt(-toAssign)} — trim a category or you'll dip into savings.` };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:10 }}>
        <div><h3 style={{ fontFamily:DISPLAY, fontSize:24, fontWeight:700, color:T.navy }}>Monthly Budget</h3>
        <p style={{ fontSize:13, color:T.steel }}>YNAB rule #1: give every one of your {fmt(income)} a job.</p></div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, color:T.steel, textTransform:"uppercase", fontWeight:600 }}>To Assign</div>
          <div style={{ fontSize:26, fontWeight:800, fontFamily:DISPLAY, color: toAssign===0?T.emerald:toAssign>0?T.goldDim:T.ruby }}>{fmt(toAssign)}</div>
        </div>
      </div>
      <div style={{ padding:"12px 16px", borderRadius:12, background:banner.bg, color:banner.c, fontSize:14, fontWeight:600, marginBottom:18 }}>{banner.txt}</div>
      {BUDGET_GROUPS.map(g => {
        const sub = g.items.reduce((s,[k])=>s+toNum(amts[k]),0);
        return (
          <div key={g.id} style={{ background:T.white, borderRadius:14, padding:18, boxShadow:"0 2px 12px rgba(0,0,0,0.04)", marginBottom:12, borderLeft:`4px solid ${g.color}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontWeight:700, color:g.color, fontSize:14 }}>{g.label}</span>
              <span style={{ fontWeight:700, color:T.navy, fontSize:14 }}>{fmt(sub)}</span>
            </div>
            {g.items.map(([k,lbl]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", fontSize:14, color:T.slate }}>
                <span>{lbl}</span>
                <span style={{ position:"relative" }}><span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:T.steel, fontSize:12 }}>₹</span><input type="number" value={amts[k]||""} onChange={set(k)} style={{ ...inputStyle, paddingLeft:18 }} /></span>
              </div>
            ))}
          </div>
        );
      })}
      <div style={{ background:T.white, borderRadius:14, padding:18, boxShadow:"0 2px 12px rgba(0,0,0,0.04)", borderLeft:`4px solid ${T.emerald}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:14, color:T.slate }}><span>💸 Loan EMIs (fixed)</span><span style={{ fontWeight:700, color:T.navy }}>{fmt(emis)}</span></div>
        <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:14, color:T.slate }}><span>📈 Investing (SIP / RD)</span><span style={{ fontWeight:700, color:T.emerald }}>{fmt(sip)}</span></div>
      </div>
      <p style={{ fontSize:12, color:T.steel, marginTop:12, lineHeight:1.6 }}>💡 <strong>True Expenses:</strong> big yearly bills (insurance, festivals, vacations, repairs) are divided into monthly set-asides so they never blindside you — that's YNAB rule #2.</p>
    </div>
  );
};

// ── Cluster 3: Debt payoff calculator (snowball / avalanche) ──
function simulateDebt(liabs, extra, strategy) {
  let L = liabs.filter(l=>(l.outstanding||0)>0).map(l=>({ bal:l.outstanding, r:(l.rate||0)/100/12, emi:l.emi||0 }));
  if (!L.length) return { months:0, interest:0 };
  let months=0, interest=0;
  while (L.some(l=>l.bal>0.5) && months<1200) {
    months++;
    let freed=0;
    L.forEach(l => {
      if (l.bal<=0) { freed+=l.emi; return; }
      const i = l.bal*l.r; interest+=i;
      const pay = Math.min(l.emi, l.bal+i);
      l.bal = l.bal+i-pay; if (l.bal<0) l.bal=0;
    });
    let extraLeft = extra + freed;
    const order = L.filter(l=>l.bal>0).sort((a,b)=> strategy==="avalanche" ? b.r-a.r : a.bal-b.bal);
    for (const l of order) { if (extraLeft<=0) break; const pay=Math.min(extraLeft,l.bal); l.bal-=pay; extraLeft-=pay; }
  }
  return { months, interest:Math.round(interest) };
}
const DebtPayoff = ({ data }) => {
  const [extra, setExtra] = useState(5000);
  const [strategy, setStrategy] = useState("avalanche");
  const loans = data.liabilities.filter(l=>(l.outstanding||0)>0);
  if (!loans.length) return (
    <div style={{ background:T.white, borderRadius:16, padding:32, textAlign:"center", boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize:40 }}>🎉</div>
      <h3 style={{ fontFamily:DISPLAY, fontSize:24, fontWeight:700, color:T.emerald, marginTop:8 }}>You're debt-free!</h3>
      <p style={{ color:T.slate, marginTop:6 }}>Nothing to pay down — channel that freedom into investing for your goals.</p>
    </div>
  );
  const base = simulateDebt(loans, 0, strategy);
  const withExtra = simulateDebt(loans, toNum(extra), strategy);
  const interestSaved = Math.max(base.interest - withExtra.interest, 0);
  const monthsSaved = Math.max(base.months - withExtra.months, 0);
  const ym = (m) => `${Math.floor(m/12)}y ${m%12}m`;
  return (
    <div>
      <h3 style={{ fontFamily:DISPLAY, fontSize:24, fontWeight:700, color:T.navy }}>Debt Payoff Planner</h3>
      <p style={{ fontSize:13, color:T.steel, marginBottom:16 }}>See how much faster — and cheaper — you clear debt by paying a little extra each month.</p>
      <div style={{ background:T.white, borderRadius:14, padding:18, boxShadow:"0 2px 12px rgba(0,0,0,0.04)", marginBottom:14 }}>
        <div style={{ fontWeight:700, color:T.navy, marginBottom:10, fontSize:14 }}>Your loans</div>
        {loans.map((l,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:14, color:T.slate, borderBottom:i<loans.length-1?`1px solid ${T.silver}25`:"none" }}>
            <span>{l.name} <span style={{ color:T.steel, fontSize:12 }}>· {l.rate}% · EMI {fmt(l.emi)}</span></span>
            <span style={{ fontWeight:700, color:T.navy }}>{fmt(l.outstanding)}</span>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:16 }}>
        <span style={{ fontSize:13, fontWeight:600, color:T.slate }}>Strategy:</span>
        {[["avalanche","Avalanche (save most interest)"],["snowball","Snowball (quick wins)"]].map(([v,lbl])=>(
          <button key={v} onClick={()=>setStrategy(v)} style={{ padding:"7px 14px", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", border:`1.5px solid ${strategy===v?T.gold:T.silver+"40"}`, background:strategy===v?`${T.gold}12`:T.white, color:T.navy }}>{lbl}</button>
        ))}
      </div>
      <div style={{ background:T.white, borderRadius:14, padding:18, boxShadow:"0 2px 12px rgba(0,0,0,0.04)", marginBottom:16 }}>
        <label style={{ fontSize:13, fontWeight:600, color:T.slate }}>Extra payment per month</label>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:8 }}>
          <input type="range" min="0" max="50000" step="1000" value={toNum(extra)} onChange={e=>setExtra(e.target.value)} style={{ flex:1, accentColor:T.gold }} />
          <div style={{ position:"relative" }}><span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:T.steel }}>₹</span><input type="number" value={extra} onChange={e=>setExtra(e.target.value)} style={{ width:110, padding:"8px 8px 8px 22px", border:`1.5px solid ${T.silver}50`, borderRadius:8, fontSize:14, color:T.navy }} /></div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
        <MetricCard icon="📅" label="Debt-free in" value={ym(withExtra.months)} sub={`was ${ym(base.months)}`} color={T.teal} />
        <MetricCard icon="⏱️" label="Time saved" value={ym(monthsSaved)} sub="vs minimums only" color={T.emerald} />
        <MetricCard icon="💸" label="Interest saved" value={fmt(interestSaved)} sub={`total interest ${fmt(withExtra.interest)}`} color={T.gold} />
      </div>
      <p style={{ fontSize:12, color:T.steel, marginTop:14, lineHeight:1.6 }}>Educational estimate based on the balances, rates and EMIs you entered. As each loan clears, its EMI rolls into the next ("rollover"). Confirm exact figures with your lender.</p>
    </div>
  );
};

// ── Cluster 4: Reports — spending, net-worth trend, Age of Money ──
const GuidedReports = ({ data }) => {
  const income = data.salaryMonthly + data.otherIncomeMonthly;
  const totExpM = data.householdExp + data.childcareExp + data.vacationExp + data.giftsExp + data.otherExp;
  const savM = income - totExpM;
  const portR = (data.equityAlloc/100)*(data.equityReturn/100) + (data.debtAlloc/100)*(data.debtReturn/100);
  const totFA = data.assets.reduce((s,a)=>s+a.value,0);
  const totPA = data.physicalAssets.reduce((s,a)=>s+a.value,0);
  let liab = data.liabilities.reduce((s,l)=>s+(l.outstanding||0),0);
  const emis = data.liabilities.reduce((s,l)=>s+(l.emi||0),0)*12;
  const spend = [
    { name:"Essentials", value:data.householdExp+data.childcareExp },
    { name:"Lifestyle", value:data.vacationExp+data.giftsExp },
    { name:"Other", value:data.otherExp },
  ].filter(s=>s.value>0);
  const yr0 = new Date().getFullYear();
  let fa=totFA, pa=totPA, lb=liab;
  const trend = [];
  for (let y=0; y<=10; y++) {
    trend.push({ year: yr0+y, networth: Math.round(fa+pa-lb) });
    fa = fa*(1+portR) + savM*12; pa = pa*(1+data.realEstateReturn/100); lb = Math.max(lb-emis,0);
  }
  const liquid = data.assets.filter(a=>a.type==="Debt").reduce((s,a)=>s+a.value,0);
  const ageOfMoney = totExpM>0 ? Math.round(liquid/totExpM*30) : 0;
  return (
    <div>
      <h3 style={{ fontFamily:DISPLAY, fontSize:24, fontWeight:700, color:T.navy }}>Reports</h3>
      <p style={{ fontSize:13, color:T.steel, marginBottom:16 }}>The fun part — watch your money work.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:16 }}>
        <MetricCard icon="⏳" label="Age of Money" value={`${ageOfMoney} days`} sub="how long your cash would last" color={T.teal} />
        <MetricCard icon="💰" label="Net Worth Today" value={fmt(totFA+totPA-liab)} color={T.gold} />
        <MetricCard icon="📈" label="Net Worth in 10y" value={fmt(trend[trend.length-1].networth)} sub="projected" color={T.emerald} />
      </div>
      <div style={{ background:T.white, borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,0.04)", marginBottom:16 }}>
        <div style={{ fontWeight:700, color:T.navy, marginBottom:12 }}>Projected net worth</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${T.silver}40`} />
            <XAxis dataKey="year" tick={{fontFamily:BODY,fontSize:12}} />
            <YAxis tickFormatter={v=>fmt(v)} tick={{fontFamily:BODY,fontSize:11}} width={70} />
            <Tooltip formatter={v=>fmt(v)} />
            <Area type="monotone" dataKey="networth" stroke={T.gold} strokeWidth={2} fill={`${T.gold}22`} name="Net worth" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {spend.length>0 && (
        <div style={{ background:T.white, borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ fontWeight:700, color:T.navy, marginBottom:12 }}>Where your money goes</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={spend} cx="50%" cy="50%" innerRadius={45} outerRadius={85} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
              {spend.map((_,i)=><Cell key={i} fill={T.chart[i%T.chart.length]} />)}
            </Pie><Tooltip formatter={v=>fmt(v)} /></PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <p style={{ fontSize:12, color:T.steel, marginTop:14, lineHeight:1.6 }}>“Age of Money” estimates how many days your liquid savings could cover expenses — higher is healthier (YNAB rule #4). Net-worth projection assumes a {(portR*100).toFixed(1)}% return and your current savings rate. Educational only.</p>
    </div>
  );
};

const GuidedPlanWizard = ({ onExit, onAuthClick }) => {
  const [phase, setPhase] = useState("quiz");   // quiz | numbers | report
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [numbers, setNumbers] = useState({});
  const [data, setData] = useState(null);
  const [showProModal, setShowProModal] = useState(false);
  const [resultTab, setResultTab] = useState("budget");

  const visible = GUIDED_QUESTIONS.filter(q => !q.showIf || q.showIf(answers));
  const idx = Math.min(step, visible.length - 1);
  const q = visible[idx];

  const next = () => { if (step >= visible.length - 1) { setPhase("numbers"); window.scrollTo({top:0}); } else setStep(step + 1); };
  const back = () => { if (step <= 0) onExit(); else setStep(step - 1); };
  const pick = (val) => { setAnswers(a => ({ ...a, [q.id]: val })); setTimeout(next, 150); };
  const toggle = (val) => setAnswers(a => { const cur = Array.isArray(a[q.id]) ? a[q.id] : []; return { ...a, [q.id]: cur.includes(val) ? cur.filter(x=>x!==val) : [...cur, val] }; });
  const isSel = (val) => q.type === "multi" ? (Array.isArray(answers[q.id]) && answers[q.id].includes(val)) : answers[q.id] === val;

  const setN = (k) => (v) => setNumbers(p => ({ ...p, [k]: v }));
  const createPlan = () => {
    if (toNum(numbers.income) <= 0) { alert("Please enter your monthly take-home income to build the plan."); return; }
    setData(buildGuidedData(answers, numbers));
    setPhase("report");
    window.scrollTo({ top:0, behavior:"smooth" });
  };
  const getAge = () => data?.dob ? new Date().getFullYear() - new Date(data.dob).getFullYear() : 35;

  const goalLabels = { home:"Approx. cost of the home today", education:"Total education cost today", travel:"Budget for this goal today" };
  const showGoalTarget = ["home","education","travel"].includes(answers.goal);

  // ── RESULT (tabbed: Budget · Plan · Debt · Reports) ──
  if (phase === "report" && data) {
    const TABS = [["budget","💸 Budget"],["plan","📊 Plan"],["debt","💳 Debt"],["reports","📈 Reports"]];
    return (
      <div>
        <div className="no-print" style={{ maxWidth:920, margin:"0 auto", padding:"16px 16px 0", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {TABS.map(([id,lbl])=>(
              <button key={id} onClick={()=>{ setResultTab(id); window.scrollTo({top:0}); }} style={{ padding:"8px 16px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", border:`1.5px solid ${resultTab===id?T.gold:T.silver+"40"}`, background: resultTab===id?`linear-gradient(135deg, ${T.gold}, ${T.goldLight})`:T.white, color:T.navy }}>{lbl}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>{ setPhase("numbers"); window.scrollTo({top:0}); }} style={{ padding:"8px 14px", borderRadius:10, fontSize:13, fontWeight:600, background:`${T.navy}08`, border:`1px solid ${T.silver}40`, color:T.slate, cursor:"pointer" }}>← Edit</button>
            <button onClick={onExit} style={{ padding:"8px 14px", borderRadius:10, fontSize:13, fontWeight:600, background:"transparent", border:`1px solid ${T.silver}40`, color:T.slate, cursor:"pointer" }}>✕ Exit</button>
          </div>
        </div>
        {resultTab === "plan" ? (
          <ReportView data={data} getAge={getAge} onBack={()=>{ setPhase("numbers"); window.scrollTo({top:0}); }} aiAnalysis={null} aiLoading={false} onRequestAI={()=> onAuthClick ? onAuthClick() : null} showProModal={showProModal} setShowProModal={setShowProModal} />
        ) : (
          <div style={{ maxWidth:920, margin:"0 auto", padding:"20px 16px 60px" }}>
            {resultTab === "budget" && <ZeroBudget data={data} n={numbers} />}
            {resultTab === "debt" && <DebtPayoff data={data} />}
            {resultTab === "reports" && <GuidedReports data={data} />}
          </div>
        )}
      </div>
    );
  }

  // ── QUIZ + NUMBERS ──────────────────────────────────
  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"28px 16px 80px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <span style={{ fontSize:13, fontWeight:700, color:T.gold, letterSpacing:"0.04em" }}>✨ GUIDED PLAN</span>
        <button onClick={onExit} style={{ padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600, background:"transparent", border:`1px solid ${T.silver}50`, color:T.slate, cursor:"pointer" }}>✕ Exit</button>
      </div>

      {phase === "quiz" && (
        <>
          <div style={{ height:6, borderRadius:3, background:`${T.silver}30`, marginBottom:10 }}>
            <div style={{ height:"100%", borderRadius:3, width:`${(idx/(visible.length))*100}%`, background:`linear-gradient(90deg, ${T.gold}, ${T.goldLight})`, transition:"width .4s" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14, fontSize:12 }}>
            <span style={{ fontWeight:700, color:T.gold, letterSpacing:"0.04em", textTransform:"uppercase" }}>{q.section}</span>
            <span style={{ color:T.steel }}>Question {idx+1} of {visible.length}</span>
          </div>
          <h2 style={{ fontFamily:DISPLAY, fontSize:"clamp(24px,4vw,30px)", fontWeight:700, color:T.navy, lineHeight:1.2 }}>{q.q}</h2>
          {q.sub && <p style={{ color:T.slate, fontSize:15, marginTop:8 }}>{q.sub}</p>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12, marginTop:24 }}>
            {q.options.map(o => (
              <button key={String(o.value)} className="g-opt" onClick={()=> q.type==="multi" ? toggle(o.value) : pick(o.value)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 18px", borderRadius:14, textAlign:"left", cursor:"pointer",
                  border:`2px solid ${isSel(o.value)?T.gold:`${T.silver}40`}`, background:isSel(o.value)?`${T.gold}10`:T.white,
                  fontFamily:BODY, fontSize:15, fontWeight:600, color:T.navy, transition:"all .2s", boxShadow: isSel(o.value)?`0 4px 16px ${T.gold}20`:"0 1px 4px rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize:24 }}>{o.icon}</span>{o.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:28 }}>
            <button onClick={back} className="btn-navy" style={{ padding:"12px 24px", borderRadius:12, fontSize:15 }}>← Back</button>
            {q.type==="multi"
              ? <button onClick={next} className="btn-gold" style={{ padding:"12px 28px", borderRadius:12, fontSize:15, opacity:(answers[q.id]&&answers[q.id].length)?1:0.5 }} disabled={!(answers[q.id]&&answers[q.id].length)}>Next →</button>
              : <span style={{ fontSize:12, color:T.steel, fontStyle:"italic" }}>Tap an option to continue</span>}
          </div>
        </>
      )}

      {phase === "numbers" && (() => {
        const hasA = (k) => Array.isArray(answers.assetTypes) && answers.assetTypes.includes(k);
        const hasL = (k) => (Array.isArray(answers.loans) && answers.loans.includes(k)) || (k==="home"&&answers.home==="loan") || (k==="car"&&answers.car==="loan");
        const wantsGoal = (k) => answers.goal===k || (Array.isArray(answers.goals2)&&answers.goals2.includes(k));
        const hasKids = Array.isArray(answers.dependents) && answers.dependents.includes("kids");
        const Card = ({ icon, title, hint, children }) => (
          <div style={{ background:T.white, borderRadius:16, padding:24, boxShadow:"0 2px 16px rgba(10,22,40,0.05)", border:`1px solid ${T.gold}10`, marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:hint?2:14 }}>
              <span style={{ fontSize:20 }}>{icon}</span>
              <h3 style={{ fontFamily:DISPLAY, fontSize:19, fontWeight:700, color:T.navy }}>{title}</h3>
            </div>
            {hint && <p style={{ fontSize:12.5, color:T.steel, marginBottom:14 }}>{hint}</p>}
            {children}
          </div>
        );
        const G2 = ({ children }) => <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>{children}</div>;
        return (
        <>
          <div style={{ height:6, borderRadius:3, background:`${T.silver}30`, marginBottom:14 }}>
            <div style={{ height:"100%", borderRadius:3, width:"92%", background:`linear-gradient(90deg, ${T.gold}, ${T.goldLight})` }} />
          </div>
          <h2 style={{ fontFamily:DISPLAY, fontSize:"clamp(24px,4vw,30px)", fontWeight:700, color:T.navy, lineHeight:1.2 }}>Now, the numbers</h2>
          <p style={{ color:T.slate, fontSize:15, marginTop:8, marginBottom:20 }}>Fill in what you can — leave the rest blank. We only ask about what you told us you have.</p>

          <Card icon="🪪" title="About you">
            <Field label="Your Name (optional)" value={numbers.name||""} onChange={setN("name")} placeholder="e.g. Rajesh Kumar" />
            <G2>
              <Field label="Your Age" type="number" value={numbers.age ?? (answers.ageBand||"")} onChange={setN("age")} />
              <Field label="City (optional)" value={numbers.city||""} onChange={setN("city")} placeholder="e.g. Pune" />
            </G2>
          </Card>

          <Card icon="📈" title="Monthly income" hint="Your take-home (in-hand) amounts per month.">
            <G2>
              <Field label="Take-home Salary" type="number" prefix="₹" value={numbers.income||""} onChange={setN("income")} />
              <Field label="Other Income" type="number" prefix="₹" value={numbers.otherIncome||""} onChange={setN("otherIncome")} note="Rent, freelance, etc." />
            </G2>
          </Card>

          <Card icon="🧾" title="Monthly expenses" hint="Roughly what you spend each month, by category.">
            <G2>
              <Field label={answers.home==="rent"?"Rent":"Housing / upkeep"} type="number" prefix="₹" value={numbers.e_housing||""} onChange={setN("e_housing")} />
              <Field label="Utilities & bills" type="number" prefix="₹" value={numbers.e_utilities||""} onChange={setN("e_utilities")} />
              <Field label="Groceries" type="number" prefix="₹" value={numbers.e_groceries||""} onChange={setN("e_groceries")} />
              <Field label="Transport / fuel" type="number" prefix="₹" value={numbers.e_transport||""} onChange={setN("e_transport")} />
              <Field label="Dining & entertainment" type="number" prefix="₹" value={numbers.e_dining||""} onChange={setN("e_dining")} />
              {hasKids && <Field label="Childcare / school" type="number" prefix="₹" value={numbers.e_education||""} onChange={setN("e_education")} />}
              <Field label="Health / medical" type="number" prefix="₹" value={numbers.e_health||""} onChange={setN("e_health")} />
              <Field label="Shopping / personal" type="number" prefix="₹" value={numbers.e_shopping||""} onChange={setN("e_shopping")} />
              <Field label="Subscriptions" type="number" prefix="₹" value={numbers.e_subscriptions||""} onChange={setN("e_subscriptions")} />
              <Field label="Anything else" type="number" prefix="₹" value={numbers.e_other||""} onChange={setN("e_other")} />
            </G2>
          </Card>

          <Card icon="🗓️" title="Irregular & annual costs (optional)" hint="Big bills that hit once or twice a year — we'll spread them across the months.">
            <G2>
              <Field label="Insurance premiums / yr" type="number" prefix="₹" value={numbers.a_insurance||""} onChange={setN("a_insurance")} />
              <Field label="Festivals & gifts / yr" type="number" prefix="₹" value={numbers.a_festivals||""} onChange={setN("a_festivals")} />
              <Field label="Vacations / yr" type="number" prefix="₹" value={numbers.a_vacation||""} onChange={setN("a_vacation")} />
              <Field label="Maintenance & repairs / yr" type="number" prefix="₹" value={numbers.a_maintenance||""} onChange={setN("a_maintenance")} />
            </G2>
          </Card>

          <Card icon="💰" title="Savings & investments" hint="Current value of what you own.">
            <Field label="Monthly amount you invest (SIP/RD)" type="number" prefix="₹" value={numbers.sip||""} onChange={setN("sip")} />
            <G2>
              {hasA("savings") && <Field label="Savings account" type="number" prefix="₹" value={numbers.as_savings||""} onChange={setN("as_savings")} />}
              {hasA("fd") && <Field label="Fixed deposits" type="number" prefix="₹" value={numbers.as_fd||""} onChange={setN("as_fd")} />}
              {hasA("mf") && <Field label="Mutual funds" type="number" prefix="₹" value={numbers.as_mf||""} onChange={setN("as_mf")} />}
              {hasA("stocks") && <Field label="Direct stocks" type="number" prefix="₹" value={numbers.as_stocks||""} onChange={setN("as_stocks")} />}
              {hasA("epf") && <Field label="EPF / PPF / NPS" type="number" prefix="₹" value={numbers.as_epf||""} onChange={setN("as_epf")} />}
              {hasA("gold") && <Field label="Gold" type="number" prefix="₹" value={numbers.as_gold||""} onChange={setN("as_gold")} />}
              {hasA("crypto") && <Field label="Crypto" type="number" prefix="₹" value={numbers.as_crypto||""} onChange={setN("as_crypto")} />}
              {hasA("realestate") && <Field label="Real estate (extra)" type="number" prefix="₹" value={numbers.as_realestate||""} onChange={setN("as_realestate")} />}
              {(answers.home==="owned"||answers.home==="loan") && <Field label="Value of your home" type="number" prefix="₹" value={numbers.as_homevalue||""} onChange={setN("as_homevalue")} />}
            </G2>
            {(!hasA("savings")&&!hasA("fd")&&!hasA("mf")&&!hasA("stocks")&&!hasA("epf")&&!hasA("gold")&&!hasA("crypto")&&!hasA("realestate")) &&
              <p style={{ fontSize:12.5, color:T.steel, fontStyle:"italic" }}>You didn't select any asset types earlier — that's fine, we'll plan from your savings rate.</p>}
          </Card>

          {answers.hasLoans==="yes" && (
            <Card icon="💳" title="Loans & liabilities" hint="Outstanding balance and the EMI you pay each month.">
              {hasL("home") && <><div style={{ fontSize:12, fontWeight:700, color:T.slate, marginBottom:4 }}>🏠 Home loan</div><G2><Field label="Outstanding" type="number" prefix="₹" value={numbers.l_home_out||""} onChange={setN("l_home_out")} /><Field label="EMI / month" type="number" prefix="₹" value={numbers.l_home_emi||""} onChange={setN("l_home_emi")} /></G2></>}
              {hasL("car") && <><div style={{ fontSize:12, fontWeight:700, color:T.slate, marginBottom:4 }}>🚗 Car loan</div><G2><Field label="Outstanding" type="number" prefix="₹" value={numbers.l_car_out||""} onChange={setN("l_car_out")} /><Field label="EMI / month" type="number" prefix="₹" value={numbers.l_car_emi||""} onChange={setN("l_car_emi")} /></G2></>}
              {hasL("personal") && <><div style={{ fontSize:12, fontWeight:700, color:T.slate, marginBottom:4 }}>🧾 Personal loan</div><G2><Field label="Outstanding" type="number" prefix="₹" value={numbers.l_personal_out||""} onChange={setN("l_personal_out")} /><Field label="EMI / month" type="number" prefix="₹" value={numbers.l_personal_emi||""} onChange={setN("l_personal_emi")} /></G2></>}
              {hasL("education") && <><div style={{ fontSize:12, fontWeight:700, color:T.slate, marginBottom:4 }}>🎓 Education loan</div><G2><Field label="Outstanding" type="number" prefix="₹" value={numbers.l_education_out||""} onChange={setN("l_education_out")} /><Field label="EMI / month" type="number" prefix="₹" value={numbers.l_education_emi||""} onChange={setN("l_education_emi")} /></G2></>}
              {hasL("cc") && <><div style={{ fontSize:12, fontWeight:700, color:T.slate, marginBottom:4 }}>💳 Credit card</div><G2><Field label="Outstanding" type="number" prefix="₹" value={numbers.l_cc_out||""} onChange={setN("l_cc_out")} /><Field label="Min. payment / month" type="number" prefix="₹" value={numbers.l_cc_emi||""} onChange={setN("l_cc_emi")} /></G2></>}
            </Card>
          )}

          <Card icon="🛡️" title="Insurance cover (optional)" hint="Total sum assured, not the premium.">
            <G2>
              <Field label="Life cover" type="number" prefix="₹" value={numbers.ins_life||""} onChange={setN("ins_life")} />
              <Field label="Health cover" type="number" prefix="₹" value={numbers.ins_health||""} onChange={setN("ins_health")} />
            </G2>
          </Card>

          {(wantsGoal("home")||wantsGoal("education")||wantsGoal("travel")||wantsGoal("car")) && (
            <Card icon="🎯" title="Goal targets (optional)" hint="Roughly what each goal costs in today's money. Leave blank for a sensible default.">
              <G2>
                {wantsGoal("home") && <Field label="Home cost today" type="number" prefix="₹" value={numbers.g_home||""} onChange={setN("g_home")} />}
                {(wantsGoal("education")||hasKids) && <Field label="Education cost today" type="number" prefix="₹" value={numbers.g_education||""} onChange={setN("g_education")} />}
                {wantsGoal("car") && <Field label="Car cost today" type="number" prefix="₹" value={numbers.g_car||""} onChange={setN("g_car")} />}
                {wantsGoal("travel") && <Field label="Travel budget today" type="number" prefix="₹" value={numbers.g_travel||""} onChange={setN("g_travel")} />}
              </G2>
            </Card>
          )}

          <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
            <button onClick={()=>{ setPhase("quiz"); setStep(visible.length-1); }} className="btn-navy" style={{ padding:"12px 24px", borderRadius:12, fontSize:15 }}>← Back</button>
            <button onClick={createPlan} className="btn-gold" style={{ padding:"14px 36px", borderRadius:14, fontSize:16, boxShadow:`0 8px 32px ${T.gold}40` }}>Create My Plan →</button>
          </div>
        </>
        );
      })()}
    </div>
  );
};

export default function App({ initialPage, embedded } = {}) {
  // Deep-link shortcut. When the URL has ?app=1 / ?planner=1 or the path is
  // /app, /app/dashboard or /planner, the user came from the marketing site
  // explicitly intending to open the planner — skip the in-app landing page
  // and open the auth modal straight away if they aren't signed in yet.
  // (/app/guided is excluded: the Guided Plan wizard works without sign-in.)
  const deepLinkToApp = (() => {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    if (url.searchParams.get("app") === "1") return true;
    if (url.searchParams.get("planner") === "1") return true;
    const path = url.pathname.replace(/\/+$/, "");
    return path === "/app" || path === "/app/dashboard" || path === "/planner";
  })();

  const [page, setPage] = useState(initialPage || "landing"); // landing | dashboard | guided
  const [user, setUser] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const autoPopupDone = useRef(false);

  // If deep-linked, open the auth modal immediately so the user can sign in
  // and land on the dashboard in one click. If they're already signed in,
  // the session-check effect below will push them to the dashboard anyway.
  useEffect(() => {
    if (deepLinkToApp && !user && !isDemo) {
      setShowAuth(true);
      autoPopupDone.current = true; // suppress the 20-second auto-popup
    }
  }, [deepLinkToApp, user, isDemo]);

  // Auto-popup Google login after 20 seconds (skip in demo mode)
  useEffect(() => {
    if (user || isDemo || autoPopupDone.current) return;
    const timer = setTimeout(() => {
      if (!user && !isDemo && !autoPopupDone.current) {
        autoPopupDone.current = true;
        setShowAuth(true);
      }
    }, 20000);
    return () => clearTimeout(timer);
  }, [user, isDemo]);

  // Check existing session on mount
  useEffect(() => {
    if (!DEMO_MODE) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) { setUser(session.user); setShowAuth(false); setPage("dashboard"); }
      });
      // Also closes the auth modal: after an OAuth return the deep-link
      // effect has already opened it, and nothing else would dismiss it.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_,session) => {
        if (session?.user) { setUser(session.user); setIsDemo(false); setShowAuth(false); setPage("dashboard"); }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSignIn = (u) => {
    setUser(u);
    setIsDemo(false);
    setShowAuth(false);
    setPage("dashboard");
  };

  const handleDemo = () => {
    setIsDemo(true);
    setShowAuth(false);
    setPage("dashboard");
  };

  const handleLogout = async () => {
    if (!DEMO_MODE && !isDemo) await supabase.auth.signOut();
    setUser(null);
    setIsDemo(false);
    setPage("landing");
    autoPopupDone.current = false;
  };

  const openAuth = () => setShowAuth(true);

  return (
    <div className="pmc-app" style={{ minHeight:"100vh", background:T.cream }}>
      <GlobalCSS />
      {/* When embedded inside the marketing site (/app), the site supplies its
          own Header + Footer. Suppress the planner's internal chrome so the
          page reads as one continuous site instead of an app stacked on an
          app. The Guided-Plan tab still works via the site's Planners menu,
          and sign-in/out is handled by the site header's account button
          (shared Supabase session). */}
      {!embedded && (
        <Navbar user={user} isDemo={isDemo} onAuthClick={openAuth} onLogout={handleLogout} onLogoClick={()=>setPage(user||isDemo?"dashboard":"landing")} onGuided={()=>setPage("guided")} guidedActive={page==="guided"} />
      )}
      {isDemo && <DemoBanner onSignIn={openAuth} />}
      <AuthModal show={showAuth} onClose={()=>setShowAuth(false)} onSignIn={handleSignIn} onDemo={handleDemo} />
      {page === "landing" && <Landing onGetStarted={()=>{ if(user)setPage("dashboard"); else setShowAuth(true); }} onAuth={openAuth} />}
      {page === "dashboard" && <Dashboard user={user} isDemo={isDemo} onAuthClick={openAuth} onLogout={handleLogout} />}
      {page === "guided" && <GuidedPlanWizard onExit={()=>setPage(user||isDemo?"dashboard":"landing")} onAuthClick={openAuth} />}
      {!embedded && <SiteFooter />}
    </div>
  );
}
