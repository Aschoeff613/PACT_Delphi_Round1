-- Enable RLS on tables that were missing it.
-- All app queries on these tables use the service role (createAdminClient),
-- which bypasses RLS entirely — so no policies are needed for the app to function.
-- This blocks unauthenticated anon access via the public REST API.

alter table public.reviewers enable row level security;
alter table public.reviewer_sessions enable row level security;
alter table public.section_time_logs enable row level security;
alter table public.ratings_archive enable row level security;
