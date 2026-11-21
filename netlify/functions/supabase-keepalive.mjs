// Scheduled function: touches Supabase so the Free project never auto-pauses
// (Supabase pauses Free projects after 7 days of inactivity). Runs Mon + Thu,
// so there is never a 7-day gap even if one run fails.
export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("supabase-keepalive: Supabase env vars missing");
    return;
  }
  try {
    const res = await fetch(`${url}/rest/v1/rpc/keepalive`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
    });
    console.log(`supabase-keepalive: HTTP ${res.status}`);
  } catch (err) {
    console.error("supabase-keepalive failed", err);
  }
};

export const config = { schedule: "0 6 * * 1,4" };
