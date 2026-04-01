-- Remove merge review feature tables.
-- This feature was removed from the app — data is no longer collected or displayed.
drop table if exists public.case_merge_feedback;
drop table if exists public.post_review_feedback;
