alter table public.reviewers
add column if not exists last_name text not null default '',
add column if not exists email text;
