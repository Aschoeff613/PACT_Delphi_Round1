-- ============================================================
-- Expert Case Review PACT — consolidated schema (fresh install)
-- Safe to run top-to-bottom in the Supabase SQL Editor.
-- Idempotent: uses "if not exists" / "or replace" throughout.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Shared trigger fn: keep updated_at current
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- profiles (legacy Supabase-auth linked; kept for compatibility)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'reviewer' check (role in ('reviewer', 'admin')),
  affiliation_title text,
  institution text,
  title text,
  created_at timestamptz not null default now()
);

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- sections
-- ------------------------------------------------------------
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique check (name in ('Management', 'Communication', 'Diagnostic')),
  description text
);

-- seed the three sections (no-op if already present)
insert into public.sections (slug, name) values
  ('management', 'Management'),
  ('communication', 'Communication'),
  ('diagnostic', 'Diagnostic')
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- cases
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- reviewers (custom reviewer-code auth)
-- ------------------------------------------------------------
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

create index if not exists reviewer_sessions_reviewer_idx
on public.reviewer_sessions(reviewer_id);

-- ------------------------------------------------------------
-- ratings (3 dimensions: clinical_relevance, performance_gap, ai_relevance)
-- ------------------------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.reviewers(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  clinical_relevance smallint check (clinical_relevance between 1 and 7),
  performance_gap smallint check (performance_gap between 1 and 7),
  ai_relevance smallint check (ai_relevance between 1 and 7),
  comment text,
  marked_for_discussion boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, case_id)
);

drop trigger if exists set_ratings_updated_at on public.ratings;
create trigger set_ratings_updated_at
before update on public.ratings
for each row execute procedure public.set_updated_at();

create unique index if not exists ratings_reviewer_case_idx
on public.ratings(reviewer_id, case_id)
where reviewer_id is not null;

-- ------------------------------------------------------------
-- post_review_feedback
-- ------------------------------------------------------------
create table if not exists public.post_review_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.reviewers(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  merge_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_post_review_feedback_updated_at on public.post_review_feedback;
create trigger set_post_review_feedback_updated_at
before update on public.post_review_feedback
for each row execute procedure public.set_updated_at();

create unique index if not exists post_review_feedback_user_section_idx
on public.post_review_feedback(user_id, section_id);

create unique index if not exists post_review_feedback_reviewer_section_idx
on public.post_review_feedback(reviewer_id, section_id)
where reviewer_id is not null;

-- ------------------------------------------------------------
-- case_merge_feedback
-- ------------------------------------------------------------
create table if not exists public.case_merge_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.reviewers(id) on delete cascade,
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

create unique index if not exists case_merge_feedback_reviewer_source_idx
on public.case_merge_feedback(reviewer_id, source_case_id)
where reviewer_id is not null;

-- ------------------------------------------------------------
-- section_time_logs
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- RPC functions used by the app
-- ------------------------------------------------------------
-- Drop older signatures of save_reviewer_rating so the parameter
-- rename (performance_variability -> performance_gap) can apply.
drop function if exists public.save_reviewer_rating(uuid,uuid,smallint,smallint,smallint,text,boolean,timestamptz);
drop function if exists public.save_reviewer_rating(uuid,uuid,smallint,smallint,smallint,smallint,text,boolean,timestamptz);

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
      reviewer_id, case_id, clinical_relevance, performance_gap,
      ai_relevance, comment, marked_for_discussion, completed_at
    )
    values (
      p_reviewer_id, p_case_id, p_clinical_relevance, p_performance_gap,
      p_ai_relevance, p_comment, p_marked_for_discussion, p_completed_at
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
  set section_id = p_section_id, decision = p_decision, target_case_id = p_target_case_id
  where reviewer_id = p_reviewer_id and source_case_id = p_source_case_id;

  if not found then
    insert into public.case_merge_feedback (reviewer_id, section_id, source_case_id, decision, target_case_id)
    values (p_reviewer_id, p_section_id, p_source_case_id, p_decision, p_target_case_id);
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
  set merge_notes = p_merge_notes
  where reviewer_id = p_reviewer_id and section_id = p_section_id;

  if not found then
    insert into public.post_review_feedback (reviewer_id, section_id, merge_notes)
    values (p_reviewer_id, p_section_id, p_merge_notes);
  end if;
end;
$$;

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

-- ------------------------------------------------------------
-- Force PostgREST to pick up the new schema immediately
-- ------------------------------------------------------------
notify pgrst, 'reload schema';
