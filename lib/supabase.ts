"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sharedCookieStorage } from "./shared-cookie-storage";

/**
 * Supabase client for the marketing site. Uses the SAME project as the
 * WealthWise app (app.auriscashflow.com) AND the SAME cookie-based storage
 * scoped to `.auriscashflow.com`, so a session created on the marketing
 * site is automatically visible to the app and vice-versa (single
 * sign-on across both subdomains).
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
        storage: sharedCookieStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}
