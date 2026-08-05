-- ==========================================================
-- PACT — full schema setup, migrations 001 through 019.
-- Paste into the SQL Editor of a FRESH Supabase project and Run.
-- Generated from supabase/migrations/*.sql in order.
-- ==========================================================


-- ==========================================================
-- 001_init.sql
-- ==========================================================
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'reviewer' check (role in ('reviewer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique check (name in ('Management', 'Communication', 'Diagnostic')),
  description text
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  title text not null,
  scenario text not null,
  task_definition text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (section_id, order_index)
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  risk_severity smallint check (risk_severity between 1 and 7),
  cognitive_complexity smallint check (cognitive_complexity between 1 and 7),
  performance_variability smallint check (performance_variability between 1 and 7),
  ai_relevance smallint check (ai_relevance between 1 and 7),
  comment text,
  marked_for_discussion boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, case_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ratings_updated_at on public.ratings;
create trigger set_ratings_updated_at
before update on public.ratings
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.sections enable row level security;
alter table public.cases enable row level security;
alter table public.ratings enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

create policy "sections_read_authenticated" on public.sections
for select using (auth.role() = 'authenticated');

create policy "cases_read_authenticated" on public.cases
for select using (auth.role() = 'authenticated');

create policy "ratings_read_own" on public.ratings
for select using (auth.uid() = user_id);

create policy "ratings_insert_own" on public.ratings
for insert with check (auth.uid() = user_id);

create policy "ratings_update_own" on public.ratings
for update using (auth.uid() = user_id);

create or replace function public.section_completion_summary()
returns table (
  section_name text,
  not_started_count bigint,
  in_progress_count bigint,
  completed_count bigint
)
language sql
security definer
set search_path = public
as $$
  with user_case_status as (
    select
      s.name as section_name,
      p.id as user_id,
      c.id as case_id,
      case
        when r.id is null then 'not_started'
        when r.risk_severity is not null
         and r.cognitive_complexity is not null
         and r.performance_variability is not null
         and r.ai_relevance is not null then 'completed'
        else 'in_progress'
      end as status
    from public.sections s
    join public.cases c on c.section_id = s.id
    cross join public.profiles p
    left join public.ratings r on r.case_id = c.id and r.user_id = p.id
  )
  select
    section_name,
    count(*) filter (where status = 'not_started') as not_started_count,
    count(*) filter (where status = 'in_progress') as in_progress_count,
    count(*) filter (where status = 'completed') as completed_count
  from user_case_status
  group by section_name
  order by section_name;
$$;

-- ==========================================================
-- 002_post_review_feedback.sql
-- ==========================================================
create table if not exists public.post_review_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  merge_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_post_review_feedback_updated_at on public.post_review_feedback;
create trigger set_post_review_feedback_updated_at
before update on public.post_review_feedback
for each row execute procedure public.set_updated_at();

alter table public.post_review_feedback enable row level security;

create policy "post_review_feedback_read_own" on public.post_review_feedback
for select using (auth.uid() = user_id);

create policy "post_review_feedback_insert_own" on public.post_review_feedback
for insert with check (auth.uid() = user_id);

create policy "post_review_feedback_update_own" on public.post_review_feedback
for update using (auth.uid() = user_id);

-- ==========================================================
-- 003_section_feedback.sql
-- ==========================================================
alter table public.post_review_feedback
add column if not exists section_id uuid references public.sections(id) on delete cascade;

update public.post_review_feedback
set section_id = s.id
from public.sections s
where public.post_review_feedback.section_id is null
  and s.slug = 'management';

alter table public.post_review_feedback
alter column section_id set not null;

alter table public.post_review_feedback
drop constraint if exists post_review_feedback_user_id_key;

create unique index if not exists post_review_feedback_user_section_idx
on public.post_review_feedback(user_id, section_id);

-- ==========================================================
-- 004_case_merge_feedback.sql
-- ==========================================================
create table if not exists public.case_merge_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  source_case_id uuid not null references public.cases(id) on delete cascade,
  decision text not null default 'none' check (decision in ('none', 'possible_merge')),
  target_case_id uuid references public.cases(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_case_id)
);

drop trigger if exists set_case_merge_feedback_updated_at on public.case_merge_feedback;
create trigger set_case_merge_feedback_updated_at
before update on public.case_merge_feedback
for each row execute procedure public.set_updated_at();

alter table public.case_merge_feedback enable row level security;

create policy "case_merge_feedback_read_own" on public.case_merge_feedback
for select using (auth.uid() = user_id);

create policy "case_merge_feedback_insert_own" on public.case_merge_feedback
for insert with check (auth.uid() = user_id);

create policy "case_merge_feedback_update_own" on public.case_merge_feedback
for update using (auth.uid() = user_id);

-- ==========================================================
-- 005_profile_fields.sql
-- ==========================================================
alter table public.profiles
add column if not exists affiliation_title text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, affiliation_title)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'affiliation_title', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
    affiliation_title = coalesce(nullif(excluded.affiliation_title, ''), public.profiles.affiliation_title);
  return new;
end;
$$;

-- ==========================================================
-- 006_profile_institution_title.sql
-- ==========================================================
alter table public.profiles
add column if not exists institution text,
add column if not exists title text;

update public.profiles
set institution = coalesce(institution, affiliation_title)
where institution is null and affiliation_title is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, affiliation_title, institution, title)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'affiliation_title', ''),
    coalesce(new.raw_user_meta_data ->> 'institution', ''),
    coalesce(new.raw_user_meta_data ->> 'title', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
    affiliation_title = coalesce(nullif(excluded.affiliation_title, ''), public.profiles.affiliation_title),
    institution = coalesce(nullif(excluded.institution, ''), public.profiles.institution),
    title = coalesce(nullif(excluded.title, ''), public.profiles.title);
  return new;
end;
$$;

-- ==========================================================
-- 007_reviewer_code_auth.sql
-- ==========================================================
create table if not exists public.reviewers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  last_name text not null default '',
  email text,
  institution text,
  title text,
  role text not null default 'reviewer' check (role in ('reviewer', 'admin')),
  locked_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_reviewers_updated_at on public.reviewers;
create trigger set_reviewers_updated_at
before update on public.reviewers
for each row execute procedure public.set_updated_at();

create table if not exists public.reviewer_sessions (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.reviewers(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.ratings
add column if not exists reviewer_id uuid references public.reviewers(id) on delete cascade;

alter table public.post_review_feedback
add column if not exists reviewer_id uuid references public.reviewers(id) on delete cascade;

alter table public.case_merge_feedback
add column if not exists reviewer_id uuid references public.reviewers(id) on delete cascade;

alter table public.ratings
alter column user_id drop not null;

alter table public.post_review_feedback
alter column user_id drop not null;

alter table public.case_merge_feedback
alter column user_id drop not null;

create unique index if not exists ratings_reviewer_case_idx
on public.ratings(reviewer_id, case_id)
where reviewer_id is not null;

create unique index if not exists post_review_feedback_reviewer_section_idx
on public.post_review_feedback(reviewer_id, section_id)
where reviewer_id is not null;

create unique index if not exists case_merge_feedback_reviewer_source_idx
on public.case_merge_feedback(reviewer_id, source_case_id)
where reviewer_id is not null;

create index if not exists reviewer_sessions_reviewer_idx
on public.reviewer_sessions(reviewer_id);

-- ==========================================================
-- 008_reviewer_self_registration.sql
-- ==========================================================
alter table public.reviewers
add column if not exists last_name text not null default '',
add column if not exists email text;

-- ==========================================================
-- 009_reviewer_upsert_functions.sql
-- ==========================================================
create or replace function public.save_reviewer_rating(
  p_reviewer_id uuid,
  p_case_id uuid,
  p_risk_severity smallint,
  p_cognitive_complexity smallint,
  p_performance_variability smallint,
  p_ai_relevance smallint,
  p_comment text,
  p_marked_for_discussion boolean,
  p_completed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ratings
  set
    risk_severity = p_risk_severity,
    cognitive_complexity = p_cognitive_complexity,
    performance_variability = p_performance_variability,
    ai_relevance = p_ai_relevance,
    comment = p_comment,
    marked_for_discussion = p_marked_for_discussion,
    completed_at = p_completed_at
  where reviewer_id = p_reviewer_id
    and case_id = p_case_id;

  if not found then
    insert into public.ratings (
      reviewer_id,
      case_id,
      risk_severity,
      cognitive_complexity,
      performance_variability,
      ai_relevance,
      comment,
      marked_for_discussion,
      completed_at
    )
    values (
      p_reviewer_id,
      p_case_id,
      p_risk_severity,
      p_cognitive_complexity,
      p_performance_variability,
      p_ai_relevance,
      p_comment,
      p_marked_for_discussion,
      p_completed_at
    );
  end if;
end;
$$;

create or replace function public.save_reviewer_merge_feedback(
  p_reviewer_id uuid,
  p_section_id uuid,
  p_source_case_id uuid,
  p_decision text,
  p_target_case_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.case_merge_feedback
  set
    section_id = p_section_id,
    decision = p_decision,
    target_case_id = p_target_case_id
  where reviewer_id = p_reviewer_id
    and source_case_id = p_source_case_id;

  if not found then
    insert into public.case_merge_feedback (
      reviewer_id,
      section_id,
      source_case_id,
      decision,
      target_case_id
    )
    values (
      p_reviewer_id,
      p_section_id,
      p_source_case_id,
      p_decision,
      p_target_case_id
    );
  end if;
end;
$$;

create or replace function public.save_reviewer_post_review_feedback(
  p_reviewer_id uuid,
  p_section_id uuid,
  p_merge_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.post_review_feedback
  set
    merge_notes = p_merge_notes
  where reviewer_id = p_reviewer_id
    and section_id = p_section_id;

  if not found then
    insert into public.post_review_feedback (
      reviewer_id,
      section_id,
      merge_notes
    )
    values (
      p_reviewer_id,
      p_section_id,
      p_merge_notes
    );
  end if;
end;
$$;

-- ==========================================================
-- 010_section_time_tracking.sql
-- ==========================================================
create table if not exists public.section_time_logs (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.reviewers(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  total_seconds integer not null default 0,
  first_visited_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  unique (reviewer_id, section_id)
);

create index if not exists section_time_logs_reviewer_idx
on public.section_time_logs(reviewer_id);

create index if not exists section_time_logs_section_idx
on public.section_time_logs(section_id);

-- ==========================================================
-- 011_section_time_rpc.sql
-- ==========================================================
create or replace function public.upsert_section_time(
  p_reviewer_id uuid,
  p_section_id uuid,
  p_seconds_delta integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.section_time_logs (reviewer_id, section_id, total_seconds, first_visited_at, last_active_at)
  values (p_reviewer_id, p_section_id, p_seconds_delta, now(), now())
  on conflict (reviewer_id, section_id)
  do update set
    total_seconds = section_time_logs.total_seconds + p_seconds_delta,
    last_active_at = now();
end;
$$;

-- ==========================================================
-- 012_three_dimensions.sql
-- ==========================================================
-- Reduce rating dimensions from 4 to 3:
--   risk_severity    → clinical_relevance (renamed)
--   cognitive_complexity → dropped
--   performance_variability → kept
--   ai_relevance → kept

-- Add new column, migrate data from risk_severity, then drop old columns
alter table public.ratings add column if not exists clinical_relevance smallint check (clinical_relevance between 1 and 7);

-- Migrate existing risk_severity data into clinical_relevance
update public.ratings set clinical_relevance = risk_severity where risk_severity is not null;

-- Drop old columns
alter table public.ratings drop column if exists risk_severity;
alter table public.ratings drop column if exists cognitive_complexity;

-- Update the completion check in section_completion_summary
create or replace function public.section_completion_summary()
returns table (
  section_name text,
  not_started_count bigint,
  in_progress_count bigint,
  completed_count bigint
)
language sql
security definer
set search_path = public
as $$
  with user_case_status as (
    select
      s.name as section_name,
      p.id as user_id,
      c.id as case_id,
      case
        when r.id is null then 'not_started'
        when r.clinical_relevance is not null
         and r.performance_variability is not null
         and r.ai_relevance is not null then 'completed'
        else 'in_progress'
      end as status
    from public.sections s
    join public.cases c on c.section_id = s.id
    cross join public.profiles p
    left join public.ratings r on r.case_id = c.id and r.user_id = p.id
  )
  select
    section_name,
    count(*) filter (where status = 'not_started') as not_started_count,
    count(*) filter (where status = 'in_progress') as in_progress_count,
    count(*) filter (where status = 'completed') as completed_count
  from user_case_status
  group by section_name
  order by section_name;
$$;

-- Update the save_reviewer_rating RPC function
create or replace function public.save_reviewer_rating(
  p_reviewer_id uuid,
  p_case_id uuid,
  p_clinical_relevance smallint,
  p_performance_variability smallint,
  p_ai_relevance smallint,
  p_comment text,
  p_marked_for_discussion boolean,
  p_completed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ratings
  set
    clinical_relevance = p_clinical_relevance,
    performance_variability = p_performance_variability,
    ai_relevance = p_ai_relevance,
    comment = p_comment,
    marked_for_discussion = p_marked_for_discussion,
    completed_at = p_completed_at
  where reviewer_id = p_reviewer_id
    and case_id = p_case_id;

  if not found then
    insert into public.ratings (
      reviewer_id,
      case_id,
      clinical_relevance,
      performance_variability,
      ai_relevance,
      comment,
      marked_for_discussion,
      completed_at
    )
    values (
      p_reviewer_id,
      p_case_id,
      p_clinical_relevance,
      p_performance_variability,
      p_ai_relevance,
      p_comment,
      p_marked_for_discussion,
      p_completed_at
    );
  end if;
end;
$$;

-- ==========================================================
-- 013_rename_performance_variability_to_gap.sql
-- ==========================================================
-- Rename performance_variability → performance_gap
-- Reflects new dimension: "Physician Performance Gap"

alter table public.ratings rename column performance_variability to performance_gap;

-- Update the completion check in section_completion_summary
create or replace function public.section_completion_summary()
returns table (
  section_name text,
  not_started_count bigint,
  in_progress_count bigint,
  completed_count bigint
)
language sql
security definer
set search_path = public
as $$
  with user_case_status as (
    select
      s.name as section_name,
      p.id as user_id,
      c.id as case_id,
      case
        when r.id is null then 'not_started'
        when r.clinical_relevance is not null
         and r.performance_gap is not null
         and r.ai_relevance is not null then 'completed'
        else 'in_progress'
      end as status
    from public.sections s
    join public.cases c on c.section_id = s.id
    cross join public.profiles p
    left join public.ratings r on r.case_id = c.id and r.user_id = p.id
  )
  select
    section_name,
    count(*) filter (where status = 'not_started') as not_started_count,
    count(*) filter (where status = 'in_progress') as in_progress_count,
    count(*) filter (where status = 'completed') as completed_count
  from user_case_status
  group by section_name
  order by section_name;
$$;

-- Update the save_reviewer_rating RPC function
-- Postgres cannot rename an input parameter via CREATE OR REPLACE
-- (p_performance_variability -> p_performance_gap), so drop the old
-- signature first. Required for this migration to apply to a fresh database.
drop function if exists public.save_reviewer_rating(
  uuid, uuid, smallint, smallint, smallint, text, boolean, timestamptz
);

create or replace function public.save_reviewer_rating(
  p_reviewer_id uuid,
  p_case_id uuid,
  p_clinical_relevance smallint,
  p_performance_gap smallint,
  p_ai_relevance smallint,
  p_comment text,
  p_marked_for_discussion boolean,
  p_completed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ratings
  set
    clinical_relevance = p_clinical_relevance,
    performance_gap = p_performance_gap,
    ai_relevance = p_ai_relevance,
    comment = p_comment,
    marked_for_discussion = p_marked_for_discussion,
    completed_at = p_completed_at
  where reviewer_id = p_reviewer_id
    and case_id = p_case_id;

  if not found then
    insert into public.ratings (
      reviewer_id,
      case_id,
      clinical_relevance,
      performance_gap,
      ai_relevance,
      comment,
      marked_for_discussion,
      completed_at
    )
    values (
      p_reviewer_id,
      p_case_id,
      p_clinical_relevance,
      p_performance_gap,
      p_ai_relevance,
      p_comment,
      p_marked_for_discussion,
      p_completed_at
    );
  end if;
end;
$$;

-- ==========================================================
-- 014_drop_affiliation_title.sql
-- ==========================================================
-- Drop legacy affiliation_title column from profiles table.
-- Data was migrated to the institution column in migration 006.
-- Column has had no app references since then.
alter table public.profiles drop column if exists affiliation_title;

-- ==========================================================
-- 015_drop_merge_review_tables.sql
-- ==========================================================
-- Remove merge review feature tables.
-- This feature was removed from the app — data is no longer collected or displayed.
drop table if exists public.case_merge_feedback;
drop table if exists public.post_review_feedback;

-- ==========================================================
-- 016_enable_rls_remaining_tables.sql
-- ==========================================================
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

-- ==========================================================
-- 017_v3_taxonomy_benchmarkability.sql
-- ==========================================================
-- Migration 017: V3 taxonomy + benchmarkability dimension
--
-- 1. Third rating dimension becomes "Benchmarkability / Saturation",
--    replacing "Physician Performance Gap".
-- 2. Section display name: Diagnostic -> Diagnostic Reasoning.
-- 3. Reseed cases with the V3 17-task taxonomy (5 Management,
--    7 Diagnostic, 5 Communication), replacing the 34-task V2 set.
--
-- Prior ratings referenced V2 tasks that no longer exist and are dropped.

-- ── 1. Rename the dimension ─────────────────────────────────────────────
alter table public.ratings rename column performance_gap to benchmarkability;

-- ── 2. Section naming ───────────────────────────────────────────────────
-- The name check constraint pins the old vocabulary; widen it first.
alter table public.sections drop constraint if exists sections_name_check;
update public.sections set name = 'Diagnostic Reasoning' where slug = 'diagnostic';
alter table public.sections
  add constraint sections_name_check
  check (name in ('Management', 'Communication', 'Diagnostic Reasoning'));

-- The check constraint name still referenced the pre-rename column.
alter table public.ratings
  rename constraint ratings_performance_variability_check
  to ratings_benchmarkability_check;

-- ── 3. Ensure the three sections exist ──────────────────────────────────
-- Sections were seeded by hand in the hosted project and never by a
-- migration, so a freshly initialised database has none of them.
insert into public.sections (slug, name, description) values
  ('management', 'Management',
   'Treatment selection, medication titration, disposition, resource allocation, anticipatory reasoning, and goals-concordant care.'),
  ('diagnostic', 'Diagnostic Reasoning',
   'Risk stratification, time-critical recognition, reasoning under degraded data, bias resistance, and longitudinal tracking.'),
  ('communication', 'Communication',
   'High-stakes disclosure, adaptive patient communication, workflow integrity, handoffs, and human-AI teaming.')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description;

-- ── 4. Reseed cases to the V3 taxonomy ──────────────────────────────────
-- Ratings cascade from cases; clear them explicitly so intent is on record.
delete from public.ratings;
delete from public.cases;

insert into public.cases (section_id, order_index, title, task_definition, scenario)
select s.id, v.order_index, v.title, v.task_definition, v.scenario
from (values
    ('management', 0, 'Treatment selection where evidence permits wide variation', 'Choosing among multiple defensible treatment options where the evidence is weak, conflicting, or absent for the patient in front of you. Spans empiric antimicrobial selection against local resistance and allergy history, opioid prescribing balanced against addiction and diversion risk, and adjudicating guidelines that directly conflict across co-existing conditions. Requires integration of patient-specific factors, local context, calibrated guideline application, and explicit weighing of competing risks with no single authoritative answer available.', 'Emergency Department — 70yo with chronic UTIs and prior fluoroquinolone resistance — which empiric regimen? Kidney stone patient with pain controlled — prescribe opioids for home, how many, and check the PDMP? Septic patient with CHF where resuscitation conflicts with volume restriction; beta-blocker for AFib RVR in acute asthma.

Primary Care — 65yo with cellulitis failing first-line oral antibiotics — escalate outpatient, IV, or refer to ED? Chronic low back pain patient requesting a refill with multiple prescribers on the PDMP. CHF patient with CKD and diabetes where cardiology, nephrology, and endocrine each want a different call on an SGLT2 inhibitor.'),
    ('management', 1, 'Chronic medication titration and reconciliation', 'Overcoming the cognitive and social bias toward inaction in chronic disease management when adjustment is indicated — both escalating therapy in patients not at goal and deprescribing in polypharmacy. Requires active override of status quo bias, accurate estimation of treatment benefit, integration of acute context against chronic trajectory, and reconciliation of incomplete or conflicting medication records while filtering clinically significant alerts from noise and navigating ownership ambiguity across prescribers.', 'Emergency Department — Patient in ED with BP in the 170s, chronically on antihypertensives, negative workup — increase amlodipine before discharge? 60yo admitted with confusion on diuretics, benzodiazepines, and sleeping pills — which medications are contributing, and what should be held?

Primary Care — Diabetic with A1c 8.5 on metformin and glipizide — add a third agent vs. insulin, guideline vs. patient preference? 80yo on 14 medications at a wellness visit with statin plus new muscle pain — deprescribing cascade risk.'),
    ('management', 2, 'Disposition, testing, and resource allocation under constraint', 'Allocating patients, tests, and clinician attention under competing demands, risk tolerance constraints, and resource limitations. Spans determining level of care for borderline presentations where both admission and discharge are defensible, declining low-yield testing despite medicolegal and patient-expectation pressure, and dynamically reprioritizing across multiple patients when time or diagnostic capacity is constrained. Requires threshold calibration, risk-benefit estimation, and resistance to both over- and under-triage without losing track of deferred needs.', 'Emergency Department — CHF exacerbation, sat 91% on room air, chronically ill, poor follow-up — admit or discharge with close follow-up? Does this pediatric bronchiolitis patient really need a chest X-ray? Multiple patients boarding with one CT slot — who needs frequent reassessment?

Primary Care — 28yo with migraine history and new hand sensory changes, normal office neuro exam — send to ED for stroke evaluation? Back pain under 6 weeks with no red flags and a patient insisting on MRI. End of day with 3 abnormal-lab callbacks and limited time — prioritize by severity.'),
    ('management', 3, 'Predicting clinical deterioration and acting preemptively', 'Projecting the clinical trajectory forward to act on early signals before formal intervention criteria are met — integrating subtle vital sign trends, behavioral change, and experiential pattern recognition that fall below algorithmic thresholds. Requires pattern extrapolation, acting on probabilistic concern rather than certainty, and resistance to both wait-and-see inertia and anchoring on a currently stable presentation.', 'Emergency Department — Patient with borderline vitals who is "looking sick" but not yet meeting sepsis criteria — the experienced clinician starts antibiotics early. Setting up for intubation on a patient not yet in respiratory failure but trending toward it.

Primary Care — Stable CHF patient whose weight is trending up 2 lbs/week for 3 weeks — intervene now or wait for symptoms? Diabetic with gradually worsening renal function — when to refer to nephrology?'),
    ('management', 4, 'Goals- and capacity-concordant decision-making', 'Aligning clinical decisions with patient preferences, values, and decisional capacity when the patient cannot fully participate in real-time decision-making. Spans acting on documented goals during acute deterioration under time pressure with ambiguous directives and family disagreement, and assessing capacity while simultaneously communicating risk to obtain valid consent. Requires surrogate reasoning, ethical judgment, integration of prior expressed preferences, and resistance to defaulting to aggressive intervention.', 'Emergency Department — DNR/DNI patient with reversible hypoxia — is BiPAP consistent with goals when the family disagrees? Intoxicated patient needing laceration repair — capacity to consent, proceed, wait, or find a surrogate?

Primary Care — Advanced cancer patient with new pneumonia — aggressive treatment vs. comfort per prior discussions, with unclear documentation. Early dementia patient consenting to colonoscopy who understands the benefits but not the risks.'),
    ('diagnostic', 0, 'Risk stratification in undifferentiated high-risk presentations', 'Estimating pre- and post-test probability and setting explicit action thresholds for undifferentiated presentations where neither intervention nor safe discharge is obvious. Spans chest pain, suspected PE, and altered mental status: synthesizing history, exam, ECG, biomarker kinetics, and risk scores; selecting a diagnostic pathway; and calibrating the asymmetric consequences of over- and under-testing. Requires Bayesian reasoning, calibrated confidence, and a broad differential that prioritizes reversible and immediately dangerous causes.', 'Emergency Department — 45yo M with atypical chest pain, normal ECG, mildly elevated troponin — ACS vs. dissection vs. musculoskeletal; admit, obs, or discharge? 32yo F post-partum with pleuritic pain and tachycardia, elevated D-dimer — CT-PA vs. V/Q? 30yo with substance use history, severely confused, abnormal vitals — toxic-metabolic vs. CNS infection vs. structural; CT, LP?

Primary Care — 55yo F with exertional chest tightness and 2 cardiac risk factors, normal office ECG — ED vs. outpatient stress test vs. reassurance? 32yo F on OCPs with shortness of breath — send to the ER? 75yo brought by family for progressive confusion over 2 weeks — UTI vs. medication effect vs. early dementia vs. subdural?'),
    ('diagnostic', 1, 'Time-critical recognition of evolving high-stakes diagnoses', 'Matching an evolving, atypical presentation to a known high-stakes prototype under time pressure, where delay directly worsens outcome. Spans early sepsis in vague or incomplete symptom profiles and stroke — particularly posterior circulation — whose symptoms overlap with benign conditions. Draws on System 1 pattern recognition across subtle physiologic signals while requiring the clinician to override premature reassurance from a normal initial exam or unmet formal criteria.', 'Emergency Department — Immunocompromised patient with WBC elevation but minimal symptoms and borderline vitals. Elderly female with nystagmus, NIH 0, and dizziness with equivocal CT — activate stroke protocol and TNK?

Primary Care — Elderly diabetic with fatigue and mild confusion, afebrile — UTI vs. early sepsis vs. dehydration; send to ED? 65yo M with 2 days of episodic vertigo and gait unsteadiness — TIA vs. BPPV, and how urgent is imaging?'),
    ('diagnostic', 2, 'Diagnosis under degraded or overloaded information', 'Reaching sound diagnostic conclusions when the information environment is degraded at either extreme — too little signal or too much noise. Spans reasoning toward a diagnosis without key tests, interpreting studies stripped of clinical context, and extracting actionable findings from records saturated with copy-forward text and low-value alerts. Requires selective attention, active filtering, calibrating confidence to what is genuinely unknown versus merely unmeasured, and resistance to alert fatigue.', 'Emergency Department — CT without contrast due to allergy — can you rule out PE? An ECG arrives in triage with no clinical context: NSTEMI vs. STEMI vs. baseline changes? Chest pain patient whose chart holds 400+ largely copied-forward notes, one of which documents prior cocaine use and QTc prolongation.

Primary Care — Patient declines bloodwork for religious reasons — assessing anemia clinically only. Abnormal mammogram with implants and prior radiation — true positive vs. artifact? Complex patient with 12 years of records where the prior colonoscopy and pathology report must be located to set a screening interval.'),
    ('diagnostic', 3, 'Sustaining the diagnostic search after an initial finding', 'Maintaining an active, complete diagnostic search after an initial plausible explanation has been identified — resisting the metacognitive pull to stop once there is "an answer." Requires deliberate activation of System 2 reasoning, structured self-monitoring, and explicit consideration of co-existing conditions, secondary injuries, and findings left unexplained by the leading hypothesis.', 'Emergency Department — Trauma patient with an obvious femur fracture — missed C-spine injury because attention locked onto the dramatic finding. Polysubstance overdose treated for opioids, missing a concurrent benzodiazepine ingestion.

Primary Care — Patient with confirmed UTI and dysuria — missed concurrent diabetes from the glucose on the UA. Treating depression while missing the hypothyroidism producing the same symptoms.'),
    ('diagnostic', 4, 'Revising a working diagnosis against contradictory data', 'Recognizing when a working diagnosis is no longer supported by accumulating evidence and actively revising or abandoning it. Requires metacognitive awareness of anchoring, willingness to reframe the clinical picture from scratch, active hypothesis disconfirmation rather than passive data accumulation, and the ability to separate meaningful contradictory signal from noise.', 'Emergency Department — Patient admitted for CHF exacerbation not improving with diuresis — actually a PE. EMS report says "psych patient" — actually hypoglycemic.

Primary Care — Treating recurrent "GERD" for months — actually eosinophilic esophagitis. Attributing fatigue to depression — actually new-onset anemia from colon cancer.'),
    ('diagnostic', 5, 'Integrating discordant diagnostic information', 'Synthesizing conflicting signals across history, physical exam, labs, and imaging when they point toward different diagnoses, without prematurely defaulting to any single data source. Requires explicit weighting of evidence quality, adjudication of discordant information, tolerance for irresolvable ambiguity, and transparent reasoning about which signals carry more weight and why.', 'Emergency Department — Chest pain patient: history suggests ACS, troponin borderline, ECG shows non-specific changes, CT-A shows no PE but an incidental finding. Which signal dominates?

Primary Care — Patient reports feeling fine, A1c is 11, home glucometer readings are all normal. Which data do you trust — device malfunction, non-adherence, or lab error?'),
    ('diagnostic', 6, 'Closed-loop tracking of results, screening, and incidental findings', 'Maintaining awareness of results, findings, and clinical state across time and care transitions until they reach resolution. Spans ensuring abnormal or actionable results trigger a response and are tracked to closure; interpreting ambiguous cancer screening results and setting follow-up intensity; and determining workup and ownership for unexpected incidental findings. Requires prospective memory, closed-loop tracking, establishing ownership in fragmented systems, and recognizing deviation from an expected trajectory.', 'Emergency Department — Aortic dilation to 5.2cm on CT — when can the patient follow up, and who tracks it? Incidental lung nodule on trauma CT — Fleischner application. CT abdomen for appendicitis reveals an adrenal mass — workup now or outpatient, and who owns it?

Primary Care — Mildly elevated liver enzymes on routine labs — repeat vs. workup, and ensuring the patient returns. PSA 5.2 in a 62yo — biopsy vs. repeat vs. MRI. Chest X-ray for cough shows a small pleural effusion — pursue or monitor?'),
    ('communication', 0, 'Serious-news disclosure and goals-of-care decision-making', 'Delivering a serious new diagnosis, prognosis, or end-of-life framing while simultaneously supporting emotional processing and moving the patient or family toward an immediate, documented decision. Requires emotional regulation, calibrated information framing, and patient-centered sequencing under time pressure, while holding prognostic uncertainty without retreating into false reassurance or defaulting to aggressive intervention.', 'Emergency Department — Telling a patient their CT shows a large mass concerning for cancer and framing next steps in the ED. Critically ill patient with family at the bedside: full code vs. comfort care, with minutes mattering for an ICU bed.

Primary Care — Delivering a new cancer diagnosis at a follow-up visit — treatment options, prognosis, referrals. Initiating an advance directive conversation with an advanced COPD patient at an annual visit.'),
    ('communication', 1, 'Adaptive patient communication and history elicitation', 'Adjusting clinical communication — in both directions — to the patient''s actual health literacy, language, cognitive state, or emotional capacity. Spans explaining diagnosis, treatment, and uncertainty in a way that produces genuine understanding rather than surface acknowledgment, and eliciting a reliable history from patients whose communication is impaired, including triangulation across collateral sources and records. Requires real-time assessment of comprehension and flexible strategy without patronizing the patient.', 'Emergency Department — Discharging a patient with new AFib, anticoagulation instructions, and return precautions. "Your CT was negative but I can''t fully rule out appendicitis — here''s what to come back for." Elderly patient with dementia arriving via EMS with altered behavior and no family available.

Primary Care — Explaining insulin initiation to a patient with limited English proficiency and a 4th-grade reading level. "It''s probably nothing, but we need to follow it" for an indeterminate lung nodule. Non-English-speaking diabetic with no interpreter available at a follow-up visit.'),
    ('communication', 2, 'Maintaining accuracy across interruptions and asynchronous load', 'Preserving clinical accuracy when workflow works against attention — returning to a complex task after an interruption without losing context or skipping steps, and applying clinical judgment at scale to asynchronous, patient-initiated messages arriving in a channel not designed for acute decision-making. Requires prospective encoding of task state, reliable resumption strategies, and error-checking after every context shift.', 'Emergency Department — Calculating medication dosing for a critical patient, interrupted by a code blue, then returning to the original task. Post-discharge portal message: "My pain is worse since discharge yesterday and now I have a fever."

Primary Care — Reviewing a complex lab panel, interrupted by an urgent phone call, resuming the review and missing an abnormal value. Patient messages at 9pm: "I''ve had chest pain all day but didn''t want to bother you" — seen the next morning.'),
    ('communication', 3, 'Handoffs and consultant communication', 'Compressing and transmitting critical clinical information across providers, teams, or care settings so that the receiving clinician develops an accurate shared mental model of the situation, the decisions already made, and the specific question being asked. Requires anticipating information gaps, framing urgency appropriately, and verifying comprehension rather than assuming that transmission equals understanding.', 'Emergency Department — Shift-change handoff where pending labs and vital sign trends are lost because nothing was documented in the EHR. Calling cardiology for an NSTEMI consult — your concern is RV strain, their mental model is "another troponin leak."

Primary Care — End-of-day handoff of a deteriorating patient to a covering physician with a critical lab still pending. Referring elevated liver enzymes to GI worried about autoimmune hepatitis; GI assumes fatty liver and schedules routine follow-up in 3 months.'),
    ('communication', 4, 'Human-AI disagreement management', 'Evaluating AI- or algorithm-generated recommendations against independent clinical judgment — determining when to defer, when to override, and how to weight algorithmic confidence against experiential pattern recognition. Requires metacognitive monitoring of one''s own reasoning, calibrated trust in AI output, and working awareness of the model''s likely failure modes, resisting both over-reliance and reflexive rejection.', 'Emergency Department — AI suggests a PE workup for a patient you''ve assessed as low-risk. Override, or order the CT-PA?

Primary Care — AI flags a medication interaction you''ve been prescribing around for years without issue. Change practice, or dismiss the alert?')
) as v(slug, order_index, title, task_definition, scenario)
join public.sections s on s.slug = v.slug;

-- ── 5. Rebuild the completion summary against the new column ────────────
create or replace function public.section_completion_summary()
returns table (
  section_name text,
  not_started_count bigint,
  in_progress_count bigint,
  completed_count bigint
)
language sql
security definer
set search_path = public
as $$
  with reviewer_case_status as (
    select
      s.name as section_name,
      rv.id as reviewer_id,
      c.id as case_id,
      case
        when r.id is null then 'not_started'
        when r.clinical_relevance is not null
         and r.benchmarkability is not null
         and r.ai_relevance is not null then 'completed'
        else 'in_progress'
      end as status
    from public.sections s
    join public.cases c on c.section_id = s.id
    cross join public.reviewers rv
    left join public.ratings r on r.case_id = c.id and r.reviewer_id = rv.id
  )
  select
    section_name,
    count(*) filter (where status = 'not_started') as not_started_count,
    count(*) filter (where status = 'in_progress') as in_progress_count,
    count(*) filter (where status = 'completed') as completed_count
  from reviewer_case_status
  group by section_name
  order by section_name;
$$;

-- ── 6. Rebuild the save RPC against the new column ──────────────────────
drop function if exists public.save_reviewer_rating(
  uuid, uuid, smallint, smallint, smallint, text, boolean, timestamptz
);

create or replace function public.save_reviewer_rating(
  p_reviewer_id uuid,
  p_case_id uuid,
  p_clinical_relevance smallint,
  p_benchmarkability smallint,
  p_ai_relevance smallint,
  p_comment text,
  p_marked_for_discussion boolean,
  p_completed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ratings
  set
    clinical_relevance = p_clinical_relevance,
    benchmarkability = p_benchmarkability,
    ai_relevance = p_ai_relevance,
    comment = p_comment,
    marked_for_discussion = p_marked_for_discussion,
    completed_at = p_completed_at
  where reviewer_id = p_reviewer_id
    and case_id = p_case_id;

  if not found then
    insert into public.ratings (
      reviewer_id,
      case_id,
      clinical_relevance,
      benchmarkability,
      ai_relevance,
      comment,
      marked_for_discussion,
      completed_at
    )
    values (
      p_reviewer_id,
      p_case_id,
      p_clinical_relevance,
      p_benchmarkability,
      p_ai_relevance,
      p_comment,
      p_marked_for_discussion,
      p_completed_at
    );
  end if;
end;
$$;

-- ==========================================================
-- 018_grant_service_role_privileges.sql
-- ==========================================================
-- Grant table/function privileges to service_role.
--
-- Hosted Supabase projects ship with ALTER DEFAULT PRIVILEGES configured, so
-- any table created through the dashboard implicitly grants to anon,
-- authenticated, and service_role. A database initialised locally
-- (`supabase start`) has no such defaults, so every query from the app's admin
-- client fails with "42501 permission denied for table ...".
--
-- Granting explicitly makes the schema portable: identical behaviour whether
-- the migrations are applied to a fresh local stack or a hosted project.
--
-- Only service_role is granted. Every app query goes through
-- createAdminClient() (service role), and RLS from migration 016 is what keeps
-- anon out of the public REST API — so anon deliberately gets nothing here.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Cover objects created by any later migration.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;

-- ==========================================================
-- 019_ratings_upsert_integrity.sql
-- ==========================================================
-- Prevent duplicate rating rows per reviewer + case.
--
-- save_reviewer_rating() previously did UPDATE-then-INSERT-if-not-found. With
-- the 350ms debounced autosave in ReviewPanel, two saves can interleave so both
-- see "not found" and both insert, leaving two rows for one (reviewer, case) —
-- typically one partial and one complete. The pre-existing
-- UNIQUE (user_id, case_id) does not catch this: reviewer-based sessions leave
-- user_id NULL, and NULLs never collide in a unique index.
--
-- Fix: dedupe, add a real unique index on (reviewer_id, case_id), and make the
-- RPC a genuine upsert so concurrent saves converge on one row.

-- ── 1. Collapse existing duplicates, keeping the best row per pair ──────
with ranked as (
  select
    id,
    row_number() over (
      partition by reviewer_id, case_id
      order by
        completed_at desc nulls last,
        (
          (clinical_relevance is not null)::int
          + (benchmarkability is not null)::int
          + (ai_relevance is not null)::int
        ) desc,
        updated_at desc,
        id desc
    ) as rn
  from public.ratings
  where reviewer_id is not null
)
delete from public.ratings
where id in (select id from ranked where rn > 1);

-- ── 2. Enforce one row per reviewer + case ──────────────────────────────
create unique index if not exists ratings_reviewer_id_case_id_key
  on public.ratings (reviewer_id, case_id);

-- ── 3. Make the RPC an actual upsert ────────────────────────────────────
drop function if exists public.save_reviewer_rating(
  uuid, uuid, smallint, smallint, smallint, text, boolean, timestamptz
);

create or replace function public.save_reviewer_rating(
  p_reviewer_id uuid,
  p_case_id uuid,
  p_clinical_relevance smallint,
  p_benchmarkability smallint,
  p_ai_relevance smallint,
  p_comment text,
  p_marked_for_discussion boolean,
  p_completed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ratings (
    reviewer_id,
    case_id,
    clinical_relevance,
    benchmarkability,
    ai_relevance,
    comment,
    marked_for_discussion,
    completed_at,
    updated_at
  )
  values (
    p_reviewer_id,
    p_case_id,
    p_clinical_relevance,
    p_benchmarkability,
    p_ai_relevance,
    p_comment,
    p_marked_for_discussion,
    p_completed_at,
    now()
  )
  on conflict (reviewer_id, case_id) do update
  set
    clinical_relevance    = excluded.clinical_relevance,
    benchmarkability      = excluded.benchmarkability,
    ai_relevance          = excluded.ai_relevance,
    comment               = excluded.comment,
    marked_for_discussion = excluded.marked_for_discussion,
    completed_at          = excluded.completed_at,
    updated_at            = now();
end;
$$;
