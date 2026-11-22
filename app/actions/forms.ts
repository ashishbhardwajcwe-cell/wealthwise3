"use server";

import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase-server";
import { checkFormRateLimit } from "@/lib/rate-limit";
import { DOWNLOAD_CATALOG, notifyContact, notifyDownload } from "@/lib/form-notifications";

/**
 * Contact-form and guide-download server actions → Supabase
 * (public.contact_messages, public.download_requests). Same contract as
 * submitPmsLead: never throws, always { ok, error }, honeypot swallowed.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_ERROR = "Something went wrong. Please try again, or email hello@planmycashflows.com.";
const TOO_MANY = "Too many requests — please try again in a little while.";

export type FormResult = { ok: true } | { ok: false; error: string };

async function rateLimited(bucket: string): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
  const { success } = await checkFormRateLimit(bucket, ip);
  return !success;
}

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  topic: string;
  message: string;
  /** Honeypot — humans never see it. */
  website?: string;
}

export async function submitContactMessage(input: ContactInput): Promise<FormResult> {
  if (input.website) return { ok: true };

  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const phone = (input.phone ?? "").trim();
  const topic = (input.topic ?? "").trim();
  const message = (input.message ?? "").trim();

  if (name.length < 2 || name.length > 120) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "Please enter a valid email address." };
  if (phone.length > 40) return { ok: false, error: "That phone number looks too long." };
  if (topic.length > 120) return { ok: false, error: GENERIC_ERROR };
  if (message.length < 2) return { ok: false, error: "Please enter a message." };
  if (message.length > 5000) return { ok: false, error: "That message is too long — please shorten it." };

  try {
    if (await rateLimited("contact")) return { ok: false, error: TOO_MANY };
    const supabase = getServerSupabase();
    if (!supabase) return { ok: false, error: GENERIC_ERROR };

    const { error } = await supabase.from("contact_messages").insert({
      name, email, phone: phone || null, topic: topic || null, message,
    });
    if (error) {
      console.error("contact insert failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await notifyContact({ name, email, topic: topic || "General", message }); // best-effort
    return { ok: true };
  } catch (err) {
    console.error("contact unexpected failure", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function requestDownload(input: { email: string; slug: string; website?: string }): Promise<FormResult> {
  if (input.website) return { ok: true };

  const email = (input.email ?? "").trim().toLowerCase();
  const slug = (input.slug ?? "").trim();
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "Please enter a valid email address." };
  if (!Object.prototype.hasOwnProperty.call(DOWNLOAD_CATALOG, slug)) return { ok: false, error: GENERIC_ERROR };

  try {
    if (await rateLimited("download")) return { ok: false, error: TOO_MANY };
    const supabase = getServerSupabase();
    if (!supabase) return { ok: false, error: GENERIC_ERROR };

    const { error } = await supabase.from("download_requests").insert({ email, slug });
    if (error) {
      console.error("download insert failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await notifyDownload(email, slug); // best-effort
    return { ok: true };
  } catch (err) {
    console.error("download unexpected failure", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
