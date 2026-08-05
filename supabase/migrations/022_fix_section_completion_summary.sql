-- 022_fix_section_completion_summary.sql
--
-- Migration 021 renamed ratings.benchmarkability to performance_variance but
-- missed this function, whose body still referenced the old column. The
-- rename swept the application code; SQL living inside a stored function is
-- invisible to a repo-wide search, so it was left behind.
--
-- Effect of the bug: section_completion_summary() raised
--   ERROR: column r.benchmarkability does not exist
-- which broke the /admin page's completion stats entirely (the export route
-- was unaffected — it selects columns directly).
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.section_completion_summary()
 RETURNS TABLE(section_name text, not_started_count bigint, in_progress_count bigint, completed_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with reviewer_case_status as (
    select
      s.name as section_name,
      rv.id as reviewer_id,
      c.id as case_id,
      case
        when r.id is null then 'not_started'
        when r.clinical_relevance is not null
         and r.performance_variance is not null
         and r.ai_relevance is not null then 'completed'
        else 'in_progress'
      end as status
    from public.sections s
    join public.cases c on c.section_id = s.id
    cross join public.reviewers rv
    left join public.ratings r on r.case_id = c.id and r.reviewer_id = rv.id
  )
  select
    section_name,
    count(*) filter (where status = 'not_started') as not_started_count,
    count(*) filter (where status = 'in_progress') as in_progress_count,
    count(*) filter (where status = 'completed') as completed_count
  from reviewer_case_status
  group by section_name
  order by section_name;
$function$;
