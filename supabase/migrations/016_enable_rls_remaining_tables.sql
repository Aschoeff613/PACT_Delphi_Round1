-- Enable RLS on tables that were missing it.
-- All app queries on these tables use the service role (createAdminClient),
-- which bypasses RLS entirely — so no policies are needed for the app to function.
-- This blocks unauthenticated anon access via the public REST API.

alter table public.reviewers enable row level security;
alter table public.reviewer_sessions enable row level security;
alter table public.section_time_logs enable row level security;

-- ratings_archive was created ad hoc in the hosted project rather than by a
-- migration, so it is absent from a freshly initialised database. Guard the
-- statement so this migration can apply cleanly from scratch.
do $$
begin
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'ratings_archive'
  ) then
    alter table public.ratings_archive enable row level security;
  end if;
end
$$;
