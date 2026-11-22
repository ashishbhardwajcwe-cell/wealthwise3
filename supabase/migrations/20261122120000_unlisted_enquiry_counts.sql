-- ============================================================
-- Count-only view of unlisted-share enquiries for the monthly snapshot
-- (scripts/unlisted-snapshot.mjs). Paste into Supabase SQL Editor and run.
--
-- public.leads stays insert-only for anon. This SECURITY DEFINER function
-- returns ONLY (company label, count) for source = 'unlisted-page' within a
-- time window — never a name, email or phone. Callable with the anon key so
-- no service-role key is needed on a laptop; the counts it returns are
-- published in the snapshot anyway.
-- ============================================================

create or replace function public.unlisted_enquiry_counts(p_start timestamptz, p_end timestamptz)
returns table (strategy text, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select l.strategy, count(*)::bigint
    from public.leads l
   where l.source = 'unlisted-page'
     and l.created_at >= p_start
     and l.created_at <  p_end
     and p_end - p_start <= interval '32 days'
   group by l.strategy
$$;
revoke all on function public.unlisted_enquiry_counts(timestamptz, timestamptz) from public;
grant execute on function public.unlisted_enquiry_counts(timestamptz, timestamptz) to anon, authenticated;
