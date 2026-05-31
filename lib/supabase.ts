"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for the marketing site. Uses the SAME project as the
 * WealthWise app (app.auriswealth.co), so a user account created here also
 * works in the app. Auth UI on the marketing site is optional — the site
 * stays fully open and crawlable.
 *
 * Env vars (add to Netlify):
 *   NEXT_PUBLIC_SUPABASE_URL       e.g. https://hbddsvwghboftjsgtate.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  the public anon key (safe to expose)
 *
 * If these aren't set, the login button hides itself and the site works
 * exactly as before.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(url && anonKey);

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!_client) {
    _client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}
