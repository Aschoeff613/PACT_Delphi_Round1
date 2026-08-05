-- 023_single_task_section.sql
--
-- Collapse the three review sections (Management / Diagnostic Reasoning /
-- Communication) into one section holding all 17 Erasmus V6 constructs.
--
-- Why: the V6 constructs cut across those categories. Metacognitive
-- self-regulation is neither diagnosis nor communication; multi-patient
-- monitoring is neither management nor diagnosis. The three-way split was
-- inherited from the Stanford V3 taxonomy and misdescribes V6, so reviewers
-- were being shown a grouping the task set does not support.
--
-- Ratings are preserved. Case rows are updated in place — same case ids, so
-- ratings.case_id keeps resolving — rather than deleted and re-inserted, which
-- would cascade every rating away.
--
-- Order becomes codebook order, T1..T17 at order_index 0..16, matching
-- lib/case-content.ts. That numbering is load-bearing: each construct's
-- boundary text refers to its siblings by it.
--
-- Safe to re-run.

BEGIN;

-- 0. Migration 017 added CHECK (name IN ('Management','Communication',
--    'Diagnostic Reasoning')), which hard-codes the old three-way split and
--    rejects any new section name. Drop it; the section set is now data, not a
--    schema-level enumeration.
ALTER TABLE public.sections DROP CONSTRAINT IF EXISTS sections_name_check;

-- 1. The single destination section.
INSERT INTO public.sections (slug, name, description)
SELECT 'all-tasks', 'Cognitive Tasks', 'Rate all 17 candidate cognitive tasks. Each is graded on its own, grounded by one Emergency Department and one Primary Care example.'
 WHERE NOT EXISTS (SELECT 1 FROM public.sections WHERE slug = 'all-tasks');

UPDATE public.sections
   SET name = 'Cognitive Tasks', description = 'Rate all 17 candidate cognitive tasks. Each is graded on its own, grounded by one Emergency Department and one Primary Care example.'
 WHERE slug = 'all-tasks';

-- 2. Re-home every case onto it, in codebook order, matched by title so the
--    existing case ids (and therefore any ratings) survive.
CREATE TEMP TABLE v6_order (order_index int, title text) ON COMMIT DROP;
INSERT INTO v6_order (order_index, title) VALUES
  (0, 'Rapid acuity appraisal'),
  (1, 'Prioritisation & resource management'),
  (2, 'Directed information gathering & sufficiency'),
  (3, 'Diagnostic reasoning'),
  (4, 'Managing uncertainty'),
  (5, 'Risk stratification & risk tolerance'),
  (6, 'Judging credibility & completeness'),
  (7, 'Weighing & integrating information'),
  (8, 'Knowledge & protocol retrieval'),
  (9, 'Anticipatory planning & forward projection'),
  (10, 'Committing to an endpoint & disposition'),
  (11, 'Patient-centred reasoning & communication'),
  (12, 'Team & distributed cognition'),
  (13, 'Metacognitive self-regulation'),
  (14, 'Multi-patient monitoring'),
  (15, 'Feasibility & system navigation'),
  (16, 'Encounter scoping');

-- order_index is UNIQUE per section in some deployments; park the rows out of
-- range first so the rewrite cannot collide with values still in use.
UPDATE public.cases SET order_index = order_index + 1000;

UPDATE public.cases c
   SET section_id  = (SELECT id FROM public.sections WHERE slug = 'all-tasks'),
       order_index = v.order_index
  FROM v6_order v
 WHERE c.title = v.title;

-- 3. Anything left parked did not match a V6 title: report rather than guess.
DO $guard$
DECLARE stray int;
BEGIN
  SELECT count(*) INTO stray FROM public.cases WHERE order_index >= 1000;
  IF stray > 0 THEN
    RAISE EXCEPTION 'migration 023: % case row(s) did not match a V6 title; '
                    'resolve manually before re-running', stray;
  END IF;
END $guard$;

-- 4. Drop the now-empty former sections.
DELETE FROM public.sections
 WHERE slug <> 'all-tasks'
   AND NOT EXISTS (SELECT 1 FROM public.cases c WHERE c.section_id = sections.id);

COMMIT;

-- Verification — expect one row: all-tasks | 17
SELECT s.slug, count(c.id) AS tasks
  FROM public.sections s LEFT JOIN public.cases c ON c.section_id = s.id
 GROUP BY s.slug ORDER BY s.slug;
