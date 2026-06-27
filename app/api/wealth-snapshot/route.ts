import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { redis, snapshotRateLimit, inputHash, isRedisConfigured, getClientIp } from "@/lib/redis";
import { notifySlack, escapeSlack } from "@/lib/slack";

export const runtime = "nodejs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `You are a SEBI-compliant financial planning assistant generating a brief wealth snapshot for a global investor. Use ONLY the data provided. Output strictly as JSON with this structure:

{
  "where_you_stand": "2-paragraph honest assessment, max 120 words",
  "trajectory_summary": "1 paragraph on projected net worth at retirement",
  "projected_corpus": <number>,
  "yearly_projection": [{"year": 2026, "value": <number>}, ...],
  "three_levers": [{"lever": "...", "impact": "..."}, {...}, {...}],
  "next_step": "1 sentence specific recommendation"
}

CRITICAL RULES:
- Do NOT recommend specific securities, funds, or companies
- Do NOT promise guaranteed returns — use "could," "may," "historically"
- Use educational framing: "you may wish to consider," "one approach is"
- Account for the user's country: India context for INR users, US for USD, UAE for AED, UK for GBP, Singapore for SGD
- Returns assumption: 10–12% for equity, 6–7% for debt — clearly mention these are assumptions, not guarantees
- Inflation assumption: 6% for India, 3% for US/UK, 2.5% for UAE/Singapore
- Keep tone calm, military-precise, no exclamation marks
- yearly_projection should include one entry per year from current year to retirement age
- projected_corpus should be in the same currency the user reports income in`;

interface SnapshotInput {
  age: number;
  country: string;
  monthlyIncome: number;
  currentSavings: number;
  monthlyExpenses: number;
  hasDebt: boolean;
  debtAmount?: number;
  ownsHome: boolean;
  retirementAge: number;
  primaryGoal: string;
  riskTolerance: "conservative" | "balanced" | "aggressive";
  dependents: number;
}

function validate(input: Partial<SnapshotInput>): input is SnapshotInput {
  return (
    typeof input.age === "number" && input.age >= 18 && input.age <= 80 &&
    typeof input.country === "string" && input.country.length > 0 &&
    typeof input.monthlyIncome === "number" && input.monthlyIncome >= 0 &&
    typeof input.currentSavings === "number" && input.currentSavings >= 0 &&
    typeof input.monthlyExpenses === "number" && input.monthlyExpenses >= 0 &&
    typeof input.retirementAge === "number" && input.retirementAge > input.age &&
    typeof input.primaryGoal === "string" &&
    ["conservative", "balanced", "aggressive"].includes(input.riskTolerance ?? "")
  );
}

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h

export async function POST(req: NextRequest) {
  try {
    const data: Partial<SnapshotInput> = await req.json();

    if (!validate(data)) {
      return NextResponse.json(
        { error: "Invalid input. Please check your form values and try again." },
        { status: 400 },
      );
    }

    // Rate limit per IP (3 / hour). Skipped silently if Upstash isn't configured.
    if (snapshotRateLimit) {
      const ip = getClientIp(req);
      const result = await snapshotRateLimit.limit(ip);
      if (!result.success) {
        const reset = Math.max(0, result.reset - Date.now());
        return NextResponse.json(
          {
            error: "Rate limit reached. You can generate up to 3 snapshots per hour from this IP.",
            retryInSeconds: Math.ceil(reset / 1000),
          },
          { status: 429 },
        );
      }
    }

    // Cache lookup by stable input hash
    const cacheKey = isRedisConfigured() ? `auris:snapshot:cache:${await inputHash(data)}` : null;
    if (cacheKey && redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        // Upstash auto-deserialises JSON, but tolerate either shape
        const value = typeof cached === "string" ? JSON.parse(cached) : cached;
        return NextResponse.json(value, { headers: { "X-Cache": "HIT" } });
      }
    }

    const currency = data.country === "India" ? "INR" : data.country === "US" ? "USD" : data.country === "UK" ? "GBP" : data.country === "UAE" ? "AED" : data.country === "Singapore" ? "SGD" : "USD";

    const userPrompt = `Generate a wealth snapshot for the following anonymised investor:

- Age: ${data.age}
- Country of residence: ${data.country} (currency: ${currency})
- Number of dependents: ${data.dependents}
- Current monthly income: ${data.monthlyIncome} ${currency}
- Current total savings/investments: ${data.currentSavings} ${currency}
- Current monthly expenses: ${data.monthlyExpenses} ${currency}
- Has major debt: ${data.hasDebt ? `Yes, approximately ${data.debtAmount ?? 0} ${currency}` : "No"}
- Owns primary home: ${data.ownsHome ? "Yes" : "No"}
- Target retirement age: ${data.retirementAge}
- Primary goal: ${data.primaryGoal}
- Risk tolerance: ${data.riskTolerance}

Provide a calm, honest assessment. Use educational language only. Output JSON only — no markdown, no preamble.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from model");
    }

    const text = content.text.trim();
    const jsonText = text.startsWith("```")
      ? text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
      : text;

    const parsed = JSON.parse(jsonText);

    // Cache, audit metrics, and team notification are all independent of the
    // response and of each other — run them concurrently so none blocks the
    // reply, and a failure in one (e.g. a cache write) doesn't fail the request.
    // Only runs on a fresh generation; cache hits returned earlier.
    const sideEffects: Promise<unknown>[] = [
      // Anonymised (no PII), consistent with the audit log below.
      notifySlack(`:bar_chart: New AI wealth snapshot — ${escapeSlack(data.country)}, age ${data.age}, ${data.riskTolerance}`),
    ];
    if (cacheKey && redis) {
      sideEffects.push(redis.set(cacheKey, JSON.stringify(parsed), { ex: CACHE_TTL_SECONDS }));
    }
    if (redis) {
      const r = redis;
      // Anonymised audit log (just shape of input + country/age bucket).
      // hincrby must precede expire, so chain those two; run the chain in parallel.
      const metricsKey = `auris:snapshot:metrics:${new Date().toISOString().slice(0, 10)}`;
      sideEffects.push(
        r.hincrby(metricsKey, `${data.country}|${data.riskTolerance}`, 1)
          .then(() => r.expire(metricsKey, 60 * 60 * 24 * 90)),
      );
    }

    const results = await Promise.allSettled(sideEffects);
    for (const settled of results) {
      if (settled.status === "rejected") console.error("snapshot side-effect failed", settled.reason);
    }

    return NextResponse.json(parsed, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Wealth snapshot error:", error);
    return NextResponse.json(
      { error: "Failed to generate snapshot. Please try again." },
      { status: 500 },
    );
  }
}
