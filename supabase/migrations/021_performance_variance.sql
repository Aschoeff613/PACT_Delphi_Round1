-- 021_performance_variance.sql
--
-- Rename the second scoring dimension from "benchmarkability" to
-- "performance_variance" and change what it asks.
--
-- Old construct: could this task be turned into a meaningful benchmark, or is
--                measurable performance already saturated?
-- New construct: how much would clinicians disagree about the right path
--                forward on this task?
--
-- These are different questions, so the column is renamed rather than
-- reinterpreted — leaving V6 disagreement ratings in a column called
-- `benchmarkability` would silently mislabel the exported dataset.
--
-- Timing: `ratings` is empty following 020 (the V3 ratings are preserved in
-- ratings_archive_v3), so no values need reinterpreting. ratings_archive_v3
-- keeps its own `benchmarkability` column untouched — those rows really were
-- benchmarkability ratings and the archive is a historical record.
--
-- Safe to re-run.

BEGIN;

-- ── 1. Rename the column, only if the old name is still present ─────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'ratings'
       AND column_name = 'benchmarkability'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'ratings'
       AND column_name = 'performance_variance'
  ) THEN
    ALTER TABLE public.ratings RENAME COLUMN benchmarkability TO performance_variance;
  END IF;
END $$;

-- ── 2. Drop both prior RPC signatures ───────────────────────────────────
-- The p_risk_severity/p_cognitive_complexity/p_performance_variability
-- overload is dead (superseded by 012_three_dimensions) but still resolvable.
-- PostgREST dispatches on named arguments, so leaving two live overloads
-- invites calling the wrong one.
DROP FUNCTION IF EXISTS public.save_reviewer_rating(
  uuid, uuid, smallint, smallint, smallint, text, boolean, timestamptz
);
DROP FUNCTION IF EXISTS public.save_reviewer_rating(
  uuid, uuid, smallint, smallint, smallint, smallint, text, boolean, timestamptz
);

-- ── 3. Recreate the upsert against the new column name ──────────────────
CREATE OR REPLACE FUNCTION public.save_reviewer_rating(
  p_reviewer_id uuid,
  p_case_id uuid,
  p_clinical_relevance smallint,
  p_performance_variance smallint,
  p_ai_relevance smallint,
  p_comment text,
  p_marked_for_discussion boolean,
  p_completed_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ratings (
    reviewer_id,
    case_id,
    clinical_relevance,
    performance_variance,
    ai_relevance,
    comment,
    marked_for_discussion,
    completed_at,
    updated_at
  )
  VALUES (
    p_reviewer_id,
    p_case_id,
    p_clinical_relevance,
    p_performance_variance,
    p_ai_relevance,
    p_comment,
    p_marked_for_discussion,
    p_completed_at,
    now()
  )
  ON CONFLICT (reviewer_id, case_id) DO UPDATE
  SET
    clinical_relevance    = excluded.clinical_relevance,
    performance_variance  = excluded.performance_variance,
    ai_relevance          = excluded.ai_relevance,
    comment               = excluded.comment,
    marked_for_discussion = excluded.marked_for_discussion,
    completed_at          = excluded.completed_at,
    updated_at            = now();
END;
$$;

COMMIT;
