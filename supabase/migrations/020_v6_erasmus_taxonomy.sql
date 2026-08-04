-- 020_v6_erasmus_taxonomy.sql
--
-- Replace the Stanford V3 task set (17: 5 management / 7 diagnostic / 5
-- communication) with the Erasmus V6 taxonomy (17: 6 / 8 / 3).
--
-- Source: PACT_EMC_V6_Tasks_CaseSeeds_1.xlsx, sheet "Cognitive Tasks"
--         (ARPA/PACT Round-1 Codebook V6, 4 Aug 2026)
-- Sections inherit from the Stanford V3 task(s) each V6 construct maps to in
--         PACT_Taxonomy_Crosswalk_EMC.xlsx.
--
-- Ratings: ratings.case_id is ON DELETE CASCADE, so replacing case rows drops
-- every rating. The taxonomy changed underneath them, so a V3 rating cannot be
-- carried onto a V6 construct without silently mislabelling it. Prior ratings
-- are copied to ratings_archive_v3 (with the V3 task title denormalised so the
-- archive stays readable after the case rows are gone) and then reset.
--
-- Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS ratings_archive_v3 (
  id                    uuid,
  reviewer_id           uuid,
  user_id               uuid,
  case_id               uuid,
  section_slug          text,
  order_index           int,
  task_title            text,
  clinical_relevance    int,
  benchmarkability      int,
  ai_relevance          int,
  comment               text,
  marked_for_discussion boolean,
  completed_at          timestamptz,
  updated_at            timestamptz,
  archived_at           timestamptz DEFAULT now(),
  archived_reason       text
);

ALTER TABLE ratings_archive_v3 ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON ratings_archive_v3 TO service_role;

-- Archive once; re-running must not duplicate rows.
INSERT INTO ratings_archive_v3 (
  id, reviewer_id, user_id, case_id, section_slug, order_index, task_title,
  clinical_relevance, benchmarkability, ai_relevance, comment,
  marked_for_discussion, completed_at, updated_at, archived_reason)
SELECT r.id, r.reviewer_id, r.user_id, r.case_id, s.slug, c.order_index, c.title,
       r.clinical_relevance, r.benchmarkability, r.ai_relevance, r.comment,
       r.marked_for_discussion, r.completed_at, r.updated_at,
       'V3 -> Erasmus V6 taxonomy replacement'
  FROM ratings r
  JOIN cases c    ON c.id = r.case_id
  JOIN sections s ON s.id = c.section_id
 WHERE NOT EXISTS (SELECT 1 FROM ratings_archive_v3 a WHERE a.id = r.id);

-- Section time logs refer to the old task set's pacing; clear them too.
DELETE FROM section_time_logs;

-- Replaces the case rows. CASCADE clears ratings, which is the intent.
DELETE FROM cases;

INSERT INTO cases (section_id, order_index, title, scenario, task_definition)
SELECT s.id, v.order_index, v.title, v.scenario, v.task_definition
  FROM (VALUES
  ('management', 0, 'Prioritisation & resource management',
   'Emergency Department — Four patients need attention at once: chest pain awaiting a second troponin, a laceration, a septic-appearing nursing home transfer, and a new intoxicated patient. One CT slot has opened and the nurse is asking who gets the room.

Primary Care — The session is running 40 minutes behind with a double-booked slot, a same-day add-on for chest tightness, and two urgent portal messages. Decide what gets attention in the next hour and what is deferred.',
   'Deciding what or whom to deal with next, and how to spend limited resources: attention, time, beds, staff, equipment, when several things compete.'),
  ('management', 1, 'Knowledge & protocol retrieval',
   'Emergency Department — A patient on apixaban has an intracranial bleed. Retrieve the reversal agent, the dose and the time window, and say where recall stops and an outside resource is needed.

Primary Care — A 67-year-old asks about pneumococcal vaccination, with a prior dose at 63. Recall the current interval and sequence, and recognise that the schedule has changed and needs looking up.',
   'Retrieving stored medical knowledge, rules or standards out of memory, or looking them up, and applying them to the case, including recognising the edge of what they know.'),
  ('management', 2, 'Anticipatory planning & forward projection',
   'Emergency Department — A probable small bowel obstruction, not yet confirmed. Plan forward: if the CT confirms it, surgery is called and a nasogastric tube goes in now; if it is negative, the patient goes home. Stage the present work against both branches.

Primary Care — A patient with early dementia is still driving and living alone. Project the next 12 months, decide this is a two-part visit, and start capacity and safety groundwork before it is clinically forced.',
   'Looking ahead to the likely trajectory, endpoint and next moves, and letting that forecast change what they do now, before reaching a decision.'),
  ('management', 3, 'Committing to an endpoint & disposition',
   'Emergency Department — Flank pain with a known stone history, pain controlled and creatinine normal. Settle that the disposition hangs on the urinalysis alone, and say whether the CT is worth doing given that the result would not change management.

Primary Care — Three weeks of low back pain with no red flags, and the patient is asking for an MRI. Decide whether the scan would change the plan, commit to a management course with a follow-up interval, and close the visit on that reasoning.',
   'Integrating everything into a settled endpoint and the plan that gets there, including deciding whether a test or action is worth doing because of whether the result would change anything.'),
  ('management', 4, 'Feasibility & system navigation',
   'Emergency Department — The patient needs an MRI this hospital does not perform overnight, and the on-call neurosurgeon covers a second site. Reason about boarding until morning, transferring, or managing without the study.

Primary Care — The guideline-preferred agent is not covered, prior authorisation takes three weeks, and the next endocrinology appointment is five months out. Work out which available route actually gets treatment started.',
   'Judging whether a plan can actually be carried out, given coverage, cost, appointment supply, service hours and who controls access, and working out a route around the block when there is one.'),
  ('management', 5, 'Encounter scoping',
   'Emergency Department — A frequent attender arrives with five active complaints and a request for a work note. Fix which single problem this visit will carry, and say why the others are not opened today.

Primary Care — The visit is booked as routine diabetes and hypertension follow-up. At minute 12 the patient mentions exertional chest tightness. Re-frame what this contact is now for, and what is left for next time.',
   'Fixing what this contact is meant to be for and which of the patient''s problems it will carry, including deciding to open something the patient did not come in about, or deliberately to leave something out.'),
  ('diagnostic', 0, 'Rapid acuity appraisal',
   'Emergency Department — A 78-year-old arrives by ambulance for generalized weakness with a heart rate of 96 and a normal blood pressure. From the doorway she is grey, quiet and not tracking. State how sick she is, and how fast this needs to move, before any data returns.

Primary Care — A same-day walk-in with two days of vomiting has normal recorded vital signs but looks exhausted and cannot sit up on the exam table. State how unwell she is right now, and whether that changes the tempo of the visit.',
   'A fast, holistic judgement of how unwell someone is, or how likely they are to get worse, formed at a glance rather than reasoned out. This first read sets the tempo of everything after it.'),
  ('diagnostic', 1, 'Directed information gathering & sufficiency',
   'Emergency Department — Ninety seconds of chart time before entering the room for an 82-year-old with syncope. Choose which few items to pull, prior ECGs, medication list, or last echocardiogram, and say when that is enough to start.

Primary Care — Three months of fatigue with an open history to take in a 15-minute visit. Choose the questions that would actually separate thyroid disease, anaemia, depression and sleep apnoea, and stop when the picture is sufficient to order from.',
   'Steering their own search for information: what to look for or ask about, how to get it, and when there is enough to move on.'),
  ('diagnostic', 2, 'Diagnostic reasoning',
   'Emergency Department — A 45-year-old with epigastric pain and diaphoresis has a normal ECG and a lipase of 60. ACS, pancreatitis, biliary disease and aortic pathology all remain live, and each returning result should move the ranking.

Primary Care — A 60-year-old reports six weeks of cough without fever. Post-viral cough, ACE inhibitor effect, reflux, asthma and malignancy are all in play, and a normal chest film moves some candidates without clearing the list.',
   'Building a set of possible explanations for the presentation and moving them up or down as evidence arrives, including noticing when the case does not fit the expected pattern.'),
  ('diagnostic', 3, 'Managing uncertainty',
   'Emergency Department — A 30-year-old with 12 hours of periumbilical pain has an equivocal ultrasound and a normal white count. Appendicitis cannot be excluded tonight. State that, and set the return threshold and recheck interval that make discharge acceptable.

Primary Care — An isolated mildly elevated alkaline phosphatase in an asymptomatic patient. State that the cause is not knowable yet, leave it deliberately alone, and name the repeat interval and the value that would trigger a workup.',
   'Explicitly acknowledging what is unknown and choosing a next step that either tolerates it or resolves it, instead of forcing an answer too early. Includes safety-netting and setting trip-wires.'),
  ('diagnostic', 4, 'Risk stratification & risk tolerance',
   'Emergency Department — A 55-year-old with atypical chest pain and a HEART score of 3. Reason explicitly about how low the acceptable miss rate for ACS is, and whether that threshold justifies observation rather than discharge.

Primary Care — A 40-year-old with a new severe headache and a normal neurological examination. Weigh how bad a missed subarachnoid haemorrhage would be against the yield and cost of sending her to the ED today, and say where your own threshold sits.',
   'Weighing how dangerous it would be to be wrong: keeping cannot-miss diagnoses in play, matching how aggressive to be to the worst case, and locating their own threshold for acting.'),
  ('diagnostic', 5, 'Judging credibility & completeness',
   'Emergency Department — The only history for an unresponsive patient runs from a bystander to a paramedic to a triage note. Judge how much of that chain to believe, and decide what to re-check personally before committing.

Primary Care — An outside note asserts a normal stress test 14 months ago, with no report attached and no images available. Decide whether that assertion can carry weight, or whether the study must be obtained or repeated.',
   'Judging whether incoming information can be trusted and whether anything is missing: checking the source, deciding whether to verify it first-hand, and flagging the gap.'),
  ('diagnostic', 6, 'Weighing & integrating information',
   'Emergency Department — An 85-year-old''s blood pressure is 104/60, normal by population standards but 40 points below his own documented baseline, and his creatinine is up from a value six months ago. Read the pieces against each other and against him.

Primary Care — The patient feels well, her A1c is 11.2, her home glucose log shows values in the 120s, and last year''s A1c was 6.8. All three are accepted as accurate. Produce one coherent reading.',
   'Relating several pieces of already-accepted information to each other, to this patient''s own normal, and to how they were before, to reach one reading.'),
  ('diagnostic', 7, 'Multi-patient monitoring',
   'Emergency Department — Mid-shift sweep of the whole board. Bed 16 has blood running and imaging back, bed 36''s labs are reassuring and she can wait, bed 22 has been waiting two hours on an ultrasound that has not moved. Confirm nothing on the list has been dropped.

Primary Care — End-of-week panel sweep: three abnormal results with no documented follow-up, two referrals never scheduled, and one biopsy result still outstanding. Establish what has stalled and what needs action now.',
   'Going back over the whole set of patients mid-shift: re-triaging across patients by acuity, tracking that orders and results are moving, and confirming nothing has been missed.'),
  ('communication', 0, 'Patient-centred reasoning & communication',
   'Emergency Department — New atrial fibrillation in a patient who lives alone, has limited health literacy and no reliable transport. Let that situation change both the anticoagulation choice and the way return precautions are explained.

Primary Care — An 82-year-old with an abnormal screening result says she does not want anything invasive. Work out what she actually understands and fears, and let that reshape both the plan and how the result is delivered.',
   'Folding the patient''s situation, goals, understanding, preferences and feelings into the reasoning and the plan, and deliberately shaping how things are communicated to fit them.'),
  ('communication', 1, 'Team & distributed cognition',
   'Emergency Department — A second-year resident presents a syncope patient as low risk. Judge how far to trust this particular resident, decide whether to see the patient personally, and check the plan for what a resident at that level would likely miss.

Primary Care — A patient''s insulin was adjusted by an endocrinologist last week, and the assistant has recorded home readings that conflict with that plan. Work out who owns the prescription now and what the specialist is actually planning.',
   'Reasoning about and through other people: how far to trust a colleague, what to do themselves versus hand over, checking someone else''s plan, passing on responsibility, and coordinating with other services.'),
  ('communication', 2, 'Metacognitive self-regulation',
   'Emergency Department — The handoff framed the patient as a psych patient. Name that the framing has anchored you, deliberately reopen the case, and set a reminder so the pending glucose is not lost across the next interruption.

Primary Care — At the end of a long session, notice your own engagement dropping and that you are rushing a complex patient. Slow down deliberately and re-check the medication list you have just reviewed.',
   'Watching their own reasoning, confidence and biases, and deliberately managing their own attention, effort and memory.')
  ) AS v(section_slug, order_index, title, scenario, task_definition)
  JOIN sections s ON s.slug = v.section_slug;

COMMIT;
