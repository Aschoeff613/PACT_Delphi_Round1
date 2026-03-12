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
