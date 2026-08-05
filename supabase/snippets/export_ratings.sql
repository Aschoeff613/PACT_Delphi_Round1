-- ============================================================================
-- export_ratings.sql — get the rating data out, ready for analysis
-- ============================================================================
--
-- HOW TO USE
--   Supabase dashboard → SQL Editor → New query → paste → Run,
--   then use the "Download CSV" button above the results.
--
-- One row per reviewer per task. The ratings table itself stores only ID
-- references, so reading it raw is unhelpful; this joins reviewer and task
-- names back on.
--
-- The three 1-5 scales:
--   clinical_relevance   — how clinically significant the task is
--   performance_variance — how much clinicians would disagree on the approach
--   ai_relevance         — AI augmentation potential
--
-- completed_at is non-null only when all three scales were answered.
-- ============================================================================

select
  rv.code                                as reviewer_code,
  rv.display_name || ' ' || rv.last_name  as reviewer_name,
  rv.institution,
  rv.title                               as specialty,
  c.order_index + 1                      as task_number,   -- 1-17, matches T1-T17
  c.title                                as task_name,
  r.clinical_relevance,
  r.performance_variance,
  r.ai_relevance,
  r.marked_for_discussion                as flagged_for_discussion,
  r.comment,
  r.completed_at
from ratings r
join reviewers rv on rv.id = r.reviewer_id
join cases     c  on c.id  = r.case_id
order by rv.code, c.order_index;


-- ── Per-reviewer progress ───────────────────────────────────────────────────
-- select
--   rv.code,
--   rv.display_name || ' ' || rv.last_name as reviewer_name,
--   count(r.id)                            as tasks_rated,
--   count(r.completed_at)                  as tasks_complete
-- from reviewers rv
-- left join ratings r on r.reviewer_id = rv.id
-- group by rv.code, rv.display_name, rv.last_name
-- order by tasks_complete desc;


-- ── Mean score per task, the Delphi summary view ────────────────────────────
-- Only complete ratings count, so partial entries cannot skew the means.
-- select
--   c.order_index + 1                              as task_number,
--   c.title                                        as task_name,
--   count(*)                                       as n_reviewers,
--   round(avg(r.clinical_relevance)::numeric, 2)   as mean_clinical_relevance,
--   round(avg(r.performance_variance)::numeric, 2) as mean_performance_variance,
--   round(avg(r.ai_relevance)::numeric, 2)         as mean_ai_relevance,
--   count(*) filter (where r.marked_for_discussion) as n_flagged
-- from ratings r
-- join cases c on c.id = r.case_id
-- where r.completed_at is not null
-- group by c.order_index, c.title
-- order by mean_clinical_relevance desc;


-- ── Every written comment ───────────────────────────────────────────────────
-- select rv.code, c.order_index + 1 as task_number, c.title as task_name, r.comment
-- from ratings r
-- join reviewers rv on rv.id = r.reviewer_id
-- join cases     c  on c.id  = r.case_id
-- where coalesce(r.comment, '') <> ''
-- order by c.order_index;
