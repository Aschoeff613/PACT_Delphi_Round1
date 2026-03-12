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
