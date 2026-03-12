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
