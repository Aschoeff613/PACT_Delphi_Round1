create or replace function public.save_reviewer_rating(
  p_reviewer_id uuid,
  p_case_id uuid,
  p_risk_severity smallint,
  p_cognitive_complexity smallint,
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
    risk_severity = p_risk_severity,
    cognitive_complexity = p_cognitive_complexity,
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
      risk_severity,
      cognitive_complexity,
      performance_variability,
      ai_relevance,
      comment,
      marked_for_discussion,
      completed_at
    )
    values (
      p_reviewer_id,
      p_case_id,
      p_risk_severity,
      p_cognitive_complexity,
      p_performance_variability,
      p_ai_relevance,
      p_comment,
      p_marked_for_discussion,
      p_completed_at
    );
  end if;
end;
$$;

create or replace function public.save_reviewer_merge_feedback(
  p_reviewer_id uuid,
  p_section_id uuid,
  p_source_case_id uuid,
  p_decision text,
  p_target_case_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.case_merge_feedback
  set
    section_id = p_section_id,
    decision = p_decision,
    target_case_id = p_target_case_id
  where reviewer_id = p_reviewer_id
    and source_case_id = p_source_case_id;

  if not found then
    insert into public.case_merge_feedback (
      reviewer_id,
      section_id,
      source_case_id,
      decision,
      target_case_id
    )
    values (
      p_reviewer_id,
      p_section_id,
      p_source_case_id,
      p_decision,
      p_target_case_id
    );
  end if;
end;
$$;

create or replace function public.save_reviewer_post_review_feedback(
  p_reviewer_id uuid,
  p_section_id uuid,
  p_merge_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.post_review_feedback
  set
    merge_notes = p_merge_notes
  where reviewer_id = p_reviewer_id
    and section_id = p_section_id;

  if not found then
    insert into public.post_review_feedback (
      reviewer_id,
      section_id,
      merge_notes
    )
    values (
      p_reviewer_id,
      p_section_id,
      p_merge_notes
    );
  end if;
end;
$$;
