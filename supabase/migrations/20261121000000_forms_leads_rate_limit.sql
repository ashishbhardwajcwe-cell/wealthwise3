-- ============================================================
-- PlanMyCashflows: everything the public forms need.
-- Paste into Supabase Dashboard -> SQL Editor and run. Idempotent:
-- safe to re-run, and a no-op for objects that already exist.
--
--   public.leads         enquiry modal (submitPmsLead)
--   public.subscribers   newsletter / brief signup (subscribeToBrief)
--   public.rate_limits   per-IP rate limiting (replaces Upstash)
--   check_rate_limit()   SECURITY DEFINER limiter, callable by anon
--   keepalive()          touched weekly by a Netlify scheduled function
--
-- All tables are write-only/inaccessible for the anon key: RLS is on, and
-- leads/subscribers get insert-only policies. rate_limits has NO policies,
-- so the anon role cannot read or write it except through check_rate_limit.
-- ============================================================

-- ---------- leads ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null,
  phone text,
  strategy text,
  source text
);
alter table public.leads enable row level security;
drop policy if exists "anyone can submit a lead" on public.leads;
create policy "anyone can submit a lead" on public.leads
  for insert to anon with check (true);

-- ---------- subscribers ----------
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null unique,
  source text
);
alter table public.subscribers enable row level security;
drop policy if exists "anyone can subscribe" on public.subscribers;
create policy "anyone can subscribe" on public.subscribers
  for insert to anon with check (true);

-- ---------- rate limiting ----------
-- Only a SHA-256 hash of (bucket, key) is stored, never the raw IP.
create table if not exists public.rate_limits (
  id bigint generated always as identity primary key,
  bucket text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_lookup_idx
  on public.rate_limits (bucket, key_hash, created_at desc);
alter table public.rate_limits enable row level security;
-- (deliberately no policies)

-- Sliding-window limiter. Returns allowed + seconds until a slot frees up.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_key text,
  p_limit int,
  p_window_seconds int
) returns table (allowed boolean, retry_after int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(sha256(convert_to(p_bucket || '|' || p_key, 'utf8')), 'hex');
  v_since timestamptz := now() - make_interval(secs => p_window_seconds);
  v_count int;
  v_oldest timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_bucket) > 64 or length(p_key) > 200 then
    raise exception 'invalid rate limit arguments';
  end if;

  -- Serialise concurrent calls for the same key so the count can't race.
  perform pg_advisory_xact_lock(hashtextextended(v_hash, 0));

  -- Housekeeping: drop anything older than a day.
  delete from public.rate_limits where created_at < now() - interval '1 day';

  select count(*), min(created_at) into v_count, v_oldest
    from public.rate_limits
   where bucket = p_bucket and key_hash = v_hash and created_at > v_since;

  if v_count >= p_limit then
    return query select false,
      greatest(1, ceil(extract(epoch from (v_oldest + make_interval(secs => p_window_seconds) - now()))))::int;
    return;
  end if;

  insert into public.rate_limits (bucket, key_hash) values (p_bucket, v_hash);
  return query select true, 0;
end;
$$;
revoke all on function public.check_rate_limit(text, text, int, int) from public;
grant execute on function public.check_rate_limit(text, text, int, int) to anon, authenticated;

-- ---------- keep-alive (free projects pause after 7 idle days) ----------
create or replace function public.keepalive() returns int
language sql security definer set search_path = public as 'select 1';
revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
