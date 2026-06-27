import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { planData } = await req.json();
    if (!planData) return new Response(JSON.stringify({ error: "Missing planData" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const age = planData.dob ? new Date().getFullYear() - new Date(planData.dob).getFullYear() : 35;
    const totalInc = (planData.salaryMonthly || 0) + (planData.otherIncomeMonthly || 0);
    const totalExp = (planData.householdExp||0)+(planData.childcareExp||0)+(planData.giftsExp||0)+(planData.vacationExp||0)+(planData.otherExp||0);
    const savings = totalInc - totalExp;
    const savRatio = totalInc > 0 ? ((savings/totalInc)*100).toFixed(1) : "0";
    const totalFA = (planData.assets||[]).reduce((s,a) => s+(a.value||0), 0);
    const totalPA = (planData.physicalAssets||[]).reduce((s,a) => s+(a.value||0), 0);
    const totalLiab = (planData.liabilities||[]).reduce((s,l) => s+(l.outstanding||0), 0);

    const prompt = "Analyze this Indian clients financial profile:\n\nCLIENT: " + (planData.name||"Client") + ", Age " + age + ", " + (planData.city||"India") + ", Risk: " + (planData.riskProfile||"Balanced") + "\nRetirement Age: " + (planData.retirementAge||55) + ", Life Expectancy: " + (planData.lifeExpectancy||85) + "\n\nMONTHLY: Income Rs." + totalInc + ", Expenses Rs." + totalExp + ", Savings Rs." + savings + " (" + savRatio + "%)\nSIPs: Rs." + (planData.sipMonthly||0) + "/mo, PF: Rs." + (planData.pfMonthly||0) + "/mo\nIncome Growth: " + (planData.incomeGrowth||5) + "% p.a.\n\nASSETS: Financial Rs." + totalFA + " " + JSON.stringify(planData.assets||[]) + "\nPhysical Rs." + totalPA + " " + JSON.stringify(planData.physicalAssets||[]) + "\nLiabilities Rs." + totalLiab + " " + JSON.stringify(planData.liabilities||[]) + "\nNet Worth: Rs." + (totalFA+totalPA-totalLiab) + "\n\nALLOCATION: " + (planData.equityAlloc||70) + "% Equity / " + (planData.debtAlloc||30) + "% Debt\nReturns: Equity " + (planData.equityReturn||13) + "%, Debt " + (planData.debtReturn||7) + "%\n\nGOALS:\n" + (planData.goals||[]).map(function(g){ return "- " + g.name + ": Rs." + (g.currentValue||0) + " by " + g.year + ", inflation " + g.inflation + "%, " + g.priority + " priority"; }).join("\n") + "\n\nINFLATION: General " + (planData.generalInflation||6) + "%, Education " + (planData.educationInflation||10) + "%, Medical " + (planData.medicalInflation||12) + "%\n\nRespond ONLY in JSON with this structure:\n{\"summary\":\"2-3 sentence executive summary\",\"strengths\":[\"s1\",\"s2\",\"s3\"],\"recommendations\":[{\"title\":\"Title\",\"detail\":\"Specific advice with numbers\",\"urgency\":\"Immediate|This Quarter|Semi-Annual|Annual|Review\"}],\"riskWarnings\":[\"w1\",\"w2\",\"w3\"],\"taxOptimisation\":\"Specific tax saving tips\",\"portfolioAdvice\":\"Rebalancing advice\",\"goalPriority\":\"Which goals to prioritize\"}";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: "You are an expert Indian financial planner. Give specific actionable advice with exact numbers in Indian Rupees. Respond ONLY in valid JSON, no markdown no backticks.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) return new Response(JSON.stringify({ error: "AI service unavailable" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const claudeData = await claudeRes.json();
    const aiText = claudeData.content?.[0]?.text || "{}";
    let analysis;
    try { analysis = JSON.parse(aiText.replace(/```json\n?|\n?```/g, "").trim()); }
    catch { analysis = { summary: aiText.substring(0,500), strengths: ["See summary"], recommendations: [{ title:"Review", detail: aiText.substring(0,1000), urgency:"Review" }], riskWarnings: ["Review the analysis"] }; }

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
