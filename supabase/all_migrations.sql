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
alter table public.reviewers
add column if not exists last_name text not null default '',
add column if not exists email text;
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
