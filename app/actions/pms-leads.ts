"use server";

import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase-server";
import { formRateLimit } from "@/lib/redis";

/**
 * Lead-capture server actions for the PMS explorer and strategy pages.
 * Running on the server keeps every Supabase credential out of this flow's
 * client bundle; RLS on the tables is insert-only for the anon role, so
 * even the key itself can never read data back.
 *
 * Env vars (read in lib/supabase-server.ts, set in Netlify / .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Runtime allow-list. MUST list every LeadSource — a source present in the
 *  type but missing here is rejected as a generic error at submit time, which
 *  is how the homepage's Featured grid enquiries were silently failing. */
const SOURCES = ["pms-explorer", "pms-strategy-page", "aif-directory", "unlisted-page", "homepage-featured", "compare"];

export type LeadSource = "pms-explorer" | "pms-strategy-page" | "aif-directory" | "unlisted-page" | "homepage-featured" | "compare";

export interface LeadInput {
  name: string;
  email: string;
  phone?: string;
  strategy: string;
  source: LeadSource;
  /** Honeypot — humans never see the field; any value means a bot. */
  website?: string;
}

export type LeadResult = { ok: true } | { ok: false; error: string };
export type SubscribeResult = { ok: true; already: boolean } | { ok: false; error: string };

const GENERIC_ERROR = "Something went wrong. Please try again, or email hello@planmycashflows.com.";

async function rateLimited(bucket: string): Promise<boolean> {
  if (!formRateLimit) return false; // Upstash not configured — skip silently
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
  const { success } = await formRateLimit.limit(`${bucket}:${ip}`);
  return !success;
}

/** Enquiry from a strategy card, the brief sheet, or a strategy page → public.leads. */
export async function submitPmsLead(input: LeadInput): Promise<LeadResult> {
  // Honeypot tripped: swallow the submission but report success, so the
  // bot learns nothing.
  if (input.website) return { ok: true };

  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const phone = (input.phone ?? "").trim();
  const strategy = (input.strategy ?? "").trim();

  if (name.length < 2 || name.length > 120) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "Please enter a valid email address." };
  if (phone.length > 40) return { ok: false, error: "That phone number looks too long." };
  if (!strategy || strategy.length > 200 || !SOURCES.includes(input.source)) {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (await rateLimited("pms-lead")) {
    return { ok: false, error: "Too many requests — please try again in a little while." };
  }

  const supabase = getServerSupabase();
  if (!supabase) return { ok: false, error: GENERIC_ERROR };

  const { error } = await supabase.from("leads").insert({
    name,
    email,
    phone: phone || null,
    strategy,
    source: input.source,
  });
  if (error) {
    console.error("pms lead insert failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true };
}

/** Newsletter band signup → public.subscribers. Duplicate email → already: true. */
export async function subscribeToBrief(input: {
  email: string;
  source: LeadSource;
  website?: string; // honeypot
}): Promise<SubscribeResult> {
  if (input.website) return { ok: true, already: false };

  const email = (input.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!SOURCES.includes(input.source)) return { ok: false, error: GENERIC_ERROR };

  if (await rateLimited("pms-subscribe")) {
    return { ok: false, error: "Too many requests — please try again in a little while." };
  }

  const supabase = getServerSupabase();
  if (!supabase) return { ok: false, error: GENERIC_ERROR };

  const { error } = await supabase.from("subscribers").insert({ email, source: input.source });
  if (error) {
    // 23505 = unique_violation on subscribers.email — they're already in.
    if (error.code === "23505") return { ok: true, already: true };
    console.error("subscriber insert failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true, already: false };
}
