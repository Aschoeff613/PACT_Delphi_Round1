/**
 * Hardcoded cognitive-task content, so every environment shows identical
 * wording regardless of database state.
 *
 * Source of truth: "PACT_EMC_V6_Tasks_CaseSeeds_1.xlsx", sheet "Cognitive Tasks"
 * (ARPA/PACT Round-1 Codebook V6, 4 Aug 2026) — 17 Erasmus V6 constructs.
 *
 * Sections follow the Stanford V3 task(s) each V6 construct maps to in
 * "PACT_Taxonomy_Crosswalk_EMC.xlsx": Diagnostic 8, Management 6,
 * Communication 3. Tasks 5 and 17 have no Stanford equivalent, so their
 * section is a judgment call (noted inline).
 *
 * task_code carries the codebook number, which is load-bearing:
 * construct_boundary refers to sibling constructs by it ("drifted to task 4").
 *
 * Each task carries two case seeds — one Emergency Department, one Primary
 * Care. A seed is a one-sentence clinical situation plus the decision the
 * clinician must make out loud; it is not a full vignette.
 */

export type CaseContent = {
  /** Codebook number, e.g. "T1", "T15". */
  task_code: string;
  /** The question this construct answers, shown under the task title. */
  guiding_question: string;
  /** Legacy V3 field; empty for V6, which has no subcategory layer. */
  cognitive_demand: string;
  /** Stanford V4 crosswalk note for this construct. */
  cluster: string;
  task_definition: string;
  /** Worked example set in the Emergency Department. */
  example_ed: string;
  /** Worked example set in Primary Care. */
  example_primary_care: string;
  /**
   * What this construct is NOT. Load-bearing per the V6 workbook: every seed
   * drifts toward a neighbouring construct if left unchecked.
   */
  construct_boundary: string;
  /** Case format the construct requires (6 of 17 cannot be static vignettes). */
  case_format: string;
  /** "V5 core" or "New in V6". */
  status: string;
};

// Keyed by `${sectionSlug}:${orderIndex}`
const CASE_CONTENT: Record<string, CaseContent> = {
  // ── Management ────────────────────────────────────────────────────
  "management:0": {
    task_code: "T2",
    guiding_question: "What or whom next, and what do I spend on it?",
    cognitive_demand: "",
    cluster: "Partly inside Stanford V4 M2 (disposition and resource allocation)",
    task_definition: "Deciding what or whom to deal with next, and how to spend limited resources: attention, time, beds, staff, equipment, when several things compete.",
    example_ed: "Four patients need attention at once: chest pain awaiting a second troponin, a laceration, a septic-appearing nursing home transfer, and a new intoxicated patient. One CT slot has opened and the nurse is asking who gets the room.",
    example_primary_care: "The session is running 40 minutes behind with a double-booked slot, a same-day add-on for chest tightness, and two urgent portal messages. Decide what gets attention in the next hour and what is deferred.",
    construct_boundary: "Not the severity read that feeds the ranking (task 1), and not the clinician managing their own memory or attention (task 14).",
    case_format: "Multi-patient board state, not a single-patient vignette",
    status: "V5 core",
  },
  "management:1": {
    task_code: "T9",
    guiding_question: "What do I know, or need to look up?",
    cognitive_demand: "",
    cluster: "Partly inside Stanford V4 M3 (guideline-discordant selection)",
    task_definition: "Retrieving stored medical knowledge, rules or standards out of memory, or looking them up, and applying them to the case, including recognising the edge of what they know.",
    example_ed: "A patient on apixaban has an intracranial bleed. Retrieve the reversal agent, the dose and the time window, and say where recall stops and an outside resource is needed.",
    example_primary_care: "A 67-year-old asks about pneumococcal vaccination, with a prior dose at 63. Recall the current interval and sequence, and recognise that the schedule has changed and needs looking up.",
    construct_boundary: "Not looking up the patient's own chart data (task 3 or 8). A passage that merely sounds medical, with nothing retrieved and no gap named, does not qualify.",
    case_format: "Static vignette; the edge-of-knowledge admission is the scoreable behaviour",
    status: "V5 core",
  },
  "management:2": {
    task_code: "T10",
    guiding_question: "Where is this heading, and what does that change now?",
    cognitive_demand: "",
    cluster: "Stanford V4 M4 (anticipatory recognition of deterioration), which is narrower",
    task_definition: "Looking ahead to the likely trajectory, endpoint and next moves, and letting that forecast change what they do now, before reaching a decision.",
    example_ed: "A probable small bowel obstruction, not yet confirmed. Plan forward: if the CT confirms it, surgery is called and a nasogastric tube goes in now; if it is negative, the patient goes home. Stage the present work against both branches.",
    example_primary_care: "A patient with early dementia is still driving and living alone. Project the next 12 months, decide this is a two-part visit, and start capacity and safety groundwork before it is clinically forced.",
    construct_boundary: "Two or more futures must still be open. One settled endpoint, or a single pending result that will decide it, is task 11. Parking a to-do so as not to forget it is task 14.",
    case_format: "Static vignette with an explicit branch point; score the if-then structure",
    status: "V5 core",
  },
  "management:3": {
    task_code: "T11",
    guiding_question: "Where does this patient end up, and what settles it?",
    cognitive_demand: "",
    cluster: "Stanford V4 M2 (disposition under uncertainty). Closest one-to-one match in the set",
    task_definition: "Integrating everything into a settled endpoint and the plan that gets there, including deciding whether a test or action is worth doing because of whether the result would change anything.",
    example_ed: "Flank pain with a known stone history, pain controlled and creatinine normal. Settle that the disposition hangs on the urinalysis alone, and say whether the CT is worth doing given that the result would not change management.",
    example_primary_care: "Three weeks of low back pain with no red flags, and the patient is asking for an MRI. Decide whether the scan would change the plan, commit to a management course with a follow-up interval, and close the visit on that reasoning.",
    construct_boundary: "The reasoning toward the endpoint must be present, not the endpoint alone. Predicting a likely endpoint before the data is back is task 10. Bare words like admit or discharge are not codable.",
    case_format: "Static vignette with a bounded choice set. Current DispoBench architecture applies directly",
    status: "V5 core",
  },
  "management:4": {
    task_code: "T16",
    guiding_question: "Can this even happen here, and if not, how?",
    cognitive_demand: "",
    cluster: "Gap. No Stanford construct at any version",
    task_definition: "Judging whether a plan can actually be carried out, given coverage, cost, appointment supply, service hours and who controls access, and working out a route around the block when there is one.",
    example_ed: "The patient needs an MRI this hospital does not perform overnight, and the on-call neurosurgeon covers a second site. Reason about boarding until morning, transferring, or managing without the study.",
    example_primary_care: "The guideline-preferred agent is not covered, prior authorisation takes three weeks, and the next endocrinology appointment is five months out. Work out which available route actually gets treatment started.",
    construct_boundary: "The constraint must belong to the system, not the patient. What the patient can afford or get to is task 12. Cost as one factor in choosing between treatments is task 11.",
    case_format: "Static vignette plus a local system context block, which makes ground truth site-specific",
    status: "New in V6",
  },
  "management:5": {
    task_code: "T17",
    guiding_question: "What is this visit about, and what else goes in it?",
    cognitive_demand: "",
    cluster: "Gap. No Stanford construct at any version; scope selection is presupposed by every Stanford task",
    task_definition: "Fixing what this contact is meant to be for and which of the patient's problems it will carry, including deciding to open something the patient did not come in about, or deliberately to leave something out.",
    example_ed: "A frequent attender arrives with five active complaints and a request for a work note. Fix which single problem this visit will carry, and say why the others are not opened today.",
    example_primary_care: "The visit is booked as routine diabetes and hypertension follow-up. At minute 12 the patient mentions exertional chest tightness. Re-frame what this contact is now for, and what is left for next time.",
    construct_boundary: "The subject is what the contact will cover, not what information to look for (task 3) or where the illness is heading (task 10). Deciding a problem belongs to someone else is task 13.",
    case_format: "Multi-turn, with the agenda emerging mid-visit rather than stated in the stem",
    status: "New in V6",
  },
  // ── Diagnostic Reasoning ──────────────────────────────────────────
  "diagnostic:0": {
    task_code: "T1",
    guiding_question: "How sick is this person? (a state, judged fast)",
    cognitive_demand: "",
    cluster: "Partly inside Stanford V4 D1 (high-risk rule-out); no standalone equivalent",
    task_definition: "A fast, holistic judgement of how unwell someone is, or how likely they are to get worse, formed at a glance rather than reasoned out. This first read sets the tempo of everything after it.",
    example_ed: "A 78-year-old arrives by ambulance for generalized weakness with a heart rate of 96 and a normal blood pressure. From the doorway she is grey, quiet and not tracking. State how sick she is, and how fast this needs to move, before any data returns.",
    example_primary_care: "A same-day walk-in with two days of vomiting has normal recorded vital signs but looks exhausted and cannot sit up on the exam table. State how unwell she is right now, and whether that changes the tempo of the visit.",
    construct_boundary: "Not a diagnosis and not an action. If the case forces a differential it has drifted to task 4; if it forces an admit or order decision it has drifted to task 11 or 2.",
    case_format: "Static vignette, but the stem must stop before data arrives",
    status: "V5 core",
  },
  "diagnostic:1": {
    task_code: "T3",
    guiding_question: "What do I look for, and when have I got enough?",
    cognitive_demand: "",
    cluster: "Partly inside Stanford V4 D2 (degraded or overloaded information); steering the search is uncovered",
    task_definition: "Steering their own search for information: what to look for or ask about, how to get it, and when there is enough to move on.",
    example_ed: "Ninety seconds of chart time before entering the room for an 82-year-old with syncope. Choose which few items to pull, prior ECGs, medication list, or last echocardiogram, and say when that is enough to start.",
    example_primary_care: "Three months of fatigue with an open history to take in a 15-minute visit. Choose the questions that would actually separate thyroid disease, anaemia, depression and sleep apnoea, and stop when the picture is sufficient to order from.",
    construct_boundary: "Not whether the information can be trusted (task 7), and not putting already-accepted pieces together (task 8). Stopping the search is this task; an unresolvable unknown is task 5.",
    case_format: "Interactive or agentic: the physician must be able to request items one at a time",
    status: "V5 core",
  },
  "diagnostic:2": {
    task_code: "T4",
    guiding_question: "What explains this, and how do the candidates move?",
    cognitive_demand: "",
    cluster: "Stanford V4 D1 and D4",
    task_definition: "Building a set of possible explanations for the presentation and moving them up or down as evidence arrives, including noticing when the case does not fit the expected pattern.",
    example_ed: "A 45-year-old with epigastric pain and diaphoresis has a normal ECG and a lipase of 60. ACS, pancreatitis, biliary disease and aortic pathology all remain live, and each returning result should move the ranking.",
    example_primary_care: "A 60-year-old reports six weeks of cough without fever. Post-viral cough, ACE inhibitor effect, reflux, asthma and malignancy are all in play, and a normal chest film moves some candidates without clearing the list.",
    construct_boundary: "Not the overall sick or not-sick read (task 1), and not keeping a diagnosis alive because of the danger of missing it (task 6).",
    case_format: "Static vignette with staged result release, or multi-turn",
    status: "V5 core",
  },
  "diagnostic:3": {
    task_code: "T5",
    guiding_question: "What cannot be known, and what do I do anyway?",
    cognitive_demand: "",
    cluster: "Gap. No Stanford construct at any version; uncertainty appears only as a modifier",
    task_definition: "Explicitly acknowledging what is unknown and choosing a next step that either tolerates it or resolves it, instead of forcing an answer too early. Includes safety-netting and setting trip-wires.",
    example_ed: "A 30-year-old with 12 hours of periumbilical pain has an equivocal ultrasound and a normal white count. Appendicitis cannot be excluded tonight. State that, and set the return threshold and recheck interval that make discharge acceptable.",
    example_primary_care: "An isolated mildly elevated alkaline phosphatase in an asymptomatic patient. State that the cause is not knowable yet, leave it deliberately alone, and name the repeat interval and the value that would trigger a workup.",
    construct_boundary: "The unknown must be stated explicitly. If the case moves a diagnosis up or down it is task 4; if the point is how dangerous a miss would be it is task 6.",
    case_format: "Static vignette with a free-text plan; score the presence and adequacy of the trip-wire",
    status: "V5 core",
  },
  "diagnostic:4": {
    task_code: "T6",
    guiding_question: "How bad is it to be wrong here?",
    cognitive_demand: "",
    cluster: "Stanford V4 D1 contains it as threshold-setting",
    task_definition: "Weighing how dangerous it would be to be wrong: keeping cannot-miss diagnoses in play, matching how aggressive to be to the worst case, and locating their own threshold for acting.",
    example_ed: "A 55-year-old with atypical chest pain and a HEART score of 3. Reason explicitly about how low the acceptable miss rate for ACS is, and whether that threshold justifies observation rather than discharge.",
    example_primary_care: "A 40-year-old with a new severe headache and a normal neurological examination. Weigh how bad a missed subarachnoid haemorrhage would be against the yield and cost of sending her to the ED today, and say where your own threshold sits.",
    construct_boundary: "Risk words alone do not qualify. Something must be balanced, and the subject is how bad it is to be wrong, not how likely the diagnosis is (task 4).",
    case_format: "Static vignette; elicit the threshold explicitly, not just the disposition",
    status: "V5 core",
  },
  "diagnostic:5": {
    task_code: "T7",
    guiding_question: "Can I trust this source, and what is missing?",
    cognitive_demand: "",
    cluster: "Partly inside Stanford V4 D2; explicit weighting of evidence quality only",
    task_definition: "Judging whether incoming information can be trusted and whether anything is missing: checking the source, deciding whether to verify it first-hand, and flagging the gap.",
    example_ed: "The only history for an unresponsive patient runs from a bystander to a paramedic to a triage note. Judge how much of that chain to believe, and decide what to re-check personally before committing.",
    example_primary_care: "An outside note asserts a normal stress test 14 months ago, with no report attached and no images available. Decide whether that assertion can carry weight, or whether the study must be obtained or repeated.",
    construct_boundary: "Not information simply acknowledged as missing (task 5), and not trusting a person's judgement or work (task 13). This is about the source, not the person.",
    case_format: "Static vignette with a deliberately seeded unreliable source",
    status: "V5 core",
  },
  "diagnostic:6": {
    task_code: "T8",
    guiding_question: "What do these accepted pieces mean together?",
    cognitive_demand: "",
    cluster: "Stanford V4 D4 contains integration inside the merged bias-resistance definition",
    task_definition: "Relating several pieces of already-accepted information to each other, to this patient's own normal, and to how they were before, to reach one reading.",
    example_ed: "An 85-year-old's blood pressure is 104/60, normal by population standards but 40 points below his own documented baseline, and his creatinine is up from a value six months ago. Read the pieces against each other and against him.",
    example_primary_care: "The patient feels well, her A1c is 11.2, her home glucose log shows values in the 120s, and last year's A1c was 6.8. All three are accepted as accurate. Produce one coherent reading.",
    construct_boundary: "Not judging whether a source is trustworthy (task 7), and not ranking candidate diagnoses (task 4). The pieces are already accepted.",
    case_format: "Static vignette; baseline and prior values must be supplied in the stem",
    status: "V5 core",
  },
  "diagnostic:7": {
    task_code: "T15",
    guiding_question: "Across all my patients, is everything moving and is anything missed?",
    cognitive_demand: "",
    cluster: "Partly inside Stanford V4 D3 (closed-loop tracking), at a different scope and timescale",
    task_definition: "Going back over the whole set of patients mid-shift: re-triaging across patients by acuity, tracking that orders and results are moving, and confirming nothing has been missed.",
    example_ed: "Mid-shift sweep of the whole board. Bed 16 has blood running and imaging back, bed 36's labs are reassuring and she can wait, bed 22 has been waiting two hours on an ultrasound that has not moved. Confirm nothing on the list has been dropped.",
    example_primary_care: "End-of-week panel sweep: three abnormal results with no documented follow-up, two referrals never scheduled, and one biopsy result still outstanding. Establish what has stalled and what needs action now.",
    construct_boundary: "Set-level, not one patient. A single endpoint decision is task 11, a single severity read is task 1, and choosing who to see next as an attention call is task 2.",
    case_format: "Board or panel simulation with a state list. Cannot be a single-patient vignette",
    status: "V5 core",
  },
  // ── Communication ─────────────────────────────────────────────────
  "communication:0": {
    task_code: "T12",
    guiding_question: "What does this patient need, and how do I say it?",
    cognitive_demand: "",
    cluster: "Stanford V4 C1 (serious-news disclosure) and C2 (adaptive communication)",
    task_definition: "Folding the patient's situation, goals, understanding, preferences and feelings into the reasoning and the plan, and deliberately shaping how things are communicated to fit them.",
    example_ed: "New atrial fibrillation in a patient who lives alone, has limited health literacy and no reliable transport. Let that situation change both the anticoagulation choice and the way return precautions are explained.",
    example_primary_care: "An 82-year-old with an abnormal screening result says she does not want anything invasive. Work out what she actually understands and fears, and let that reshape both the plan and how the result is delivered.",
    construct_boundary: "Not talking to other clinicians (task 13), and not judging whether the patient's account is reliable (task 7). Noticing a communication habit without changing anything is task 14.",
    case_format: "Multi-turn simulated patient. Autograder concordance is the open question here",
    status: "V5 core",
  },
  "communication:1": {
    task_code: "T13",
    guiding_question: "What is someone else thinking, doing, or responsible for?",
    cognitive_demand: "",
    cluster: "Stanford V4 C3 (handoff and consult) covers the transfer half; entrustment is uncovered",
    task_definition: "Reasoning about and through other people: how far to trust a colleague, what to do themselves versus hand over, checking someone else's plan, passing on responsibility, and coordinating with other services.",
    example_ed: "A second-year resident presents a syncope patient as low risk. Judge how far to trust this particular resident, decide whether to see the patient personally, and check the plan for what a resident at that level would likely miss.",
    example_primary_care: "A patient's insulin was adjusted by an endocrinologist last week, and the assistant has recorded home readings that conflict with that plan. Work out who owns the prescription now and what the specialist is actually planning.",
    construct_boundary: "A colleague being present in the case is not enough. Trust, delegation, the worth of that person's information, or who is responsible must be at issue. Trusting a document or monitor is task 7.",
    case_format: "Multi-turn simulated colleague, with the trainee's level specified in the stem",
    status: "V5 core",
  },
  "communication:2": {
    task_code: "T14",
    guiding_question: "What is my own mind doing, and how do I manage it?",
    cognitive_demand: "",
    cluster: "Gap in object. No Stanford category takes the clinician's own cognition as its object; D4 covers two named biases only",
    task_definition: "Watching their own reasoning, confidence and biases, and deliberately managing their own attention, effort and memory.",
    example_ed: "The handoff framed the patient as a psych patient. Name that the framing has anchored you, deliberately reopen the case, and set a reminder so the pending glucose is not lost across the next interruption.",
    example_primary_care: "At the end of a long session, notice your own engagement dropping and that you are rushing a complex patient. Slow down deliberately and re-check the medication list you have just reviewed.",
    construct_boundary: "Only the clinician's own mind. Spending external resources or ranking patients is task 2. Handing work to someone else is task 13. Frustration at what others are doing is neither.",
    case_format: "Seeded anchor plus think-aloud. Weakest autograder prospect in the set",
    status: "V5 core",
  },
};

export function getCaseContent(sectionSlug: string, orderIndex: number): CaseContent {
  const content = CASE_CONTENT[`${sectionSlug}:${orderIndex}`];
  if (!content) {
    throw new Error(`No case content for ${sectionSlug}:${orderIndex}`);
  }
  return content;
}
