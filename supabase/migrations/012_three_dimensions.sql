-- Reduce rating dimensions from 4 to 3:
--   risk_severity    → clinical_relevance (renamed)
--   cognitive_complexity → dropped
--   performance_variability → kept
--   ai_relevance → kept

-- Add new column, migrate data from risk_severity, then drop old columns
alter table public.ratings add column if not exists clinical_relevance smallint check (clinical_relevance between 1 and 7);

-- Migrate existing risk_severity data into clinical_relevance
update public.ratings set clinical_relevance = risk_severity where risk_severity is not null;

-- Drop old columns
alter table public.ratings drop column if exists risk_severity;
alter table public.ratings drop column if exists cognitive_complexity;

-- Update the completion check in section_completion_summary
create or replace function public.section_completion_summary()
returns table (
  section_name text,
  not_started_count bigint,
  in_progress_count bigint,
  completed_count bigint
)
language sql
security definer
set search_path = public
as $$
  with user_case_status as (
    select
      s.name as section_name,
      p.id as user_id,
      c.id as case_id,
      case
        when r.id is null then 'not_started'
        when r.clinical_relevance is not null
         and r.performance_variability is not null
         and r.ai_relevance is not null then 'completed'
        else 'in_progress'
      end as status
    from public.sections s
    join public.cases c on c.section_id = s.id
    cross join public.profiles p
    left join public.ratings r on r.case_id = c.id and r.user_id = p.id
  )
  select
    section_name,
    count(*) filter (where status = 'not_started') as not_started_count,
    count(*) filter (where status = 'in_progress') as in_progress_count,
    count(*) filter (where status = 'completed') as completed_count
  from user_case_status
  group by section_name
  order by section_name;
$$;

-- Update the save_reviewer_rating RPC function
create or replace function public.save_reviewer_rating(
  p_reviewer_id uuid,
  p_case_id uuid,
  p_clinical_relevance smallint,
  p_performance_variability smallint,
  p_ai_relevance smallint,
  p_comment text,
  p_marked_for_discussion boolean,
  p_completed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ratings
  set
    clinical_relevance = p_clinical_relevance,
    performance_variability = p_performance_variability,
    ai_relevance = p_ai_relevance,
    comment = p_comment,
    marked_for_discussion = p_marked_for_discussion,
    completed_at = p_completed_at
  where reviewer_id = p_reviewer_id
    and case_id = p_case_id;

  if not found then
    insert into public.ratings (
      reviewer_id,
      case_id,
      clinical_relevance,
      performance_variability,
      ai_relevance,
      comment,
      marked_for_discussion,
      completed_at
    )
    values (
      p_reviewer_id,
      p_case_id,
      p_clinical_relevance,
      p_performance_variability,
      p_ai_relevance,
      p_comment,
      p_marked_for_discussion,
      p_completed_at
    );
  end if;
end;
$$;
