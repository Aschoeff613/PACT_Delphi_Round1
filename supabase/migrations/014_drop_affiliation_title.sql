-- Drop legacy affiliation_title column from profiles table.
-- Data was migrated to the institution column in migration 006.
-- Column has had no app references since then.
alter table public.profiles drop column if exists affiliation_title;
