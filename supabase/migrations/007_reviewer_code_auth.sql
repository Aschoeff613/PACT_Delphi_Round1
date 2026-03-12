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
