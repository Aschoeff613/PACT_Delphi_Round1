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
