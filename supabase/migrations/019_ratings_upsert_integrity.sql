-- Prevent duplicate rating rows per reviewer + case.
--
-- save_reviewer_rating() previously did UPDATE-then-INSERT-if-not-found. With
-- the 350ms debounced autosave in ReviewPanel, two saves can interleave so both
-- see "not found" and both insert, leaving two rows for one (reviewer, case) —
-- typically one partial and one complete. The pre-existing
-- UNIQUE (user_id, case_id) does not catch this: reviewer-based sessions leave
-- user_id NULL, and NULLs never collide in a unique index.
--
-- Fix: dedupe, add a real unique index on (reviewer_id, case_id), and make the
-- RPC a genuine upsert so concurrent saves converge on one row.

-- ── 1. Collapse existing duplicates, keeping the best row per pair ──────
with ranked as (
  select
    id,
    row_number() over (
      partition by reviewer_id, case_id
      order by
        completed_at desc nulls last,
        (
          (clinical_relevance is not null)::int
          + (benchmarkability is not null)::int
          + (ai_relevance is not null)::int
        ) desc,
        updated_at desc,
        id desc
    ) as rn
  from public.ratings
  where reviewer_id is not null
)
delete from public.ratings
where id in (select id from ranked where rn > 1);

-- ── 2. Enforce one row per reviewer + case ──────────────────────────────
create unique index if not exists ratings_reviewer_id_case_id_key
  on public.ratings (reviewer_id, case_id);

-- ── 3. Make the RPC an actual upsert ────────────────────────────────────
drop function if exists public.save_reviewer_rating(
  uuid, uuid, smallint, smallint, smallint, text, boolean, timestamptz
);

create or replace function public.save_reviewer_rating(
  p_reviewer_id uuid,
  p_case_id uuid,
  p_clinical_relevance smallint,
  p_benchmarkability smallint,
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
  insert into public.ratings (
    reviewer_id,
    case_id,
    clinical_relevance,
    benchmarkability,
    ai_relevance,
    comment,
    marked_for_discussion,
    completed_at,
    updated_at
  )
  values (
    p_reviewer_id,
    p_case_id,
    p_clinical_relevance,
    p_benchmarkability,
    p_ai_relevance,
    p_comment,
    p_marked_for_discussion,
    p_completed_at,
    now()
  )
  on conflict (reviewer_id, case_id) do update
  set
    clinical_relevance    = excluded.clinical_relevance,
    benchmarkability      = excluded.benchmarkability,
    ai_relevance          = excluded.ai_relevance,
    comment               = excluded.comment,
    marked_for_discussion = excluded.marked_for_discussion,
    completed_at          = excluded.completed_at,
    updated_at            = now();
end;
$$;
