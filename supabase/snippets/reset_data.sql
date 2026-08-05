-- ============================================================================
-- reset_data.sql — clear collected data without rebuilding the database
-- ============================================================================
--
-- HOW TO USE
--   Supabase dashboard → SQL Editor → New query → paste ONE of the levels
--   below → Run. Read the level headings first; level 2 is not reversible.
--
--   EXPORT FIRST. supabase/snippets/export_ratings.sql produces a CSV of
--   everything about to be deleted. Once deleted it is gone — this database has
--   no undo, and Supabase's point-in-time recovery is a paid add-on.
--
-- WHAT SURVIVES EACH LEVEL
--   Level 1  reviewers, ratings, sessions, timings deleted.
--            The 17 tasks and the section stay. Use this between Delphi rounds.
--   Level 2  the above plus the tasks and section. Leaves empty tables; you
--            must re-run supabase/bootstrap_v6.sql afterwards to reseed.
--
-- Both levels are safe to re-run.
-- ============================================================================


-- ── LEVEL 1 — clear participants and their ratings, keep the tasks ──────────
-- The usual reset: wipe test or prior-round responses, leave the instrument
-- intact so reviewers can start immediately.

begin;

-- Order matters only for readability: ratings.reviewer_id and .case_id are
-- ON DELETE CASCADE, so deleting reviewers would take ratings with them.
delete from ratings;
delete from section_time_logs;
delete from reviewer_sessions;   -- logs everyone out
delete from reviewers;

commit;

-- Verify: expect 0, 0, 0, 0, then 17 and 1.
select
  (select count(*) from reviewers)         as reviewers,
  (select count(*) from ratings)           as ratings,
  (select count(*) from reviewer_sessions) as sessions,
  (select count(*) from section_time_logs) as time_logs,
  (select count(*) from cases)             as tasks_kept,
  (select count(*) from sections)          as sections_kept;


-- ── LEVEL 2 — also remove the tasks and section ─────────────────────────────
-- Only for rebuilding the instrument from scratch. After this the app shows
-- nothing until you re-run supabase/bootstrap_v6.sql.
--
-- begin;
-- delete from ratings;
-- delete from section_time_logs;
-- delete from reviewer_sessions;
-- delete from reviewers;
-- delete from cases;      -- cascades to any remaining ratings
-- delete from sections;
-- commit;


-- ── Keep one account, clear everyone else ───────────────────────────────────
-- Useful for keeping your own admin login while dropping test panelists.
-- Replace the code with the one to keep.
--
-- begin;
-- delete from ratings           where reviewer_id not in (select id from reviewers where code = 'RXXXXXX');
-- delete from section_time_logs where reviewer_id not in (select id from reviewers where code = 'RXXXXXX');
-- delete from reviewer_sessions where reviewer_id not in (select id from reviewers where code = 'RXXXXXX');
-- delete from reviewers         where code <> 'RXXXXXX';
-- commit;


-- ── Note on ratings_archive_v3 ──────────────────────────────────────────────
-- Deliberately untouched by every level above. It holds the superseded Stanford
-- V3 ratings preserved by migration 020 and is a historical record, not live
-- data. It is also empty in this database — the 136 Round 1 ratings live in the
-- earlier Supabase project, not here.
