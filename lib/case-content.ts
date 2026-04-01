/**
 * Hardcoded case content (task definitions and scenarios) to ensure consistency
 * across all environments regardless of database state.
 * Source of truth: data/high-risk-cognitive-tasks-seed-draft.json
 */

type CaseContent = {
  task_definition: string;
  scenario: string;
};

// Keyed by `${sectionSlug}:${orderIndex}`
const CASE_CONTENT: Record<string, CaseContent> = {
  // ── Management ──────────────────────────────────────────────────────
  "management:0": {
    task_definition: "Selecting appropriate empiric antimicrobial coverage considering resistance patterns, allergy history, prior cultures, renal function, and local antibiogram data.",
    scenario: "ED: 70yo with chronic UTIs presenting with recurrent symptoms. Prior resistance to fluoroquinolones. Which empiric regimen?\n\nPrimary Care: 65yo with cellulitis not responding to first-line oral antibiotics. Escalate outpatient vs. IV antibiotics vs. ED referral?",
  },
  "management:1": {
    task_definition: "Determining appropriate level of care when clinical presentations are borderline, where both admission and discharge, or ED transfer and outpatient management, are defensible choices.",
    scenario: "ED: CHF exacerbation, sat 91% on room air, chronically ill, poor outpatient follow-up. Admit vs. discharge with close follow-up?\n\nPrimary Care: 28yo with migraine history and new sensory changes to hand. Send to ED for stroke eval? Office neuro exam normal.",
  },
  "management:2": {
    task_definition: "Adjusting chronic disease medications when patient or environmental factors affect how reliably the plan can be followed.",
    scenario: "ED: Patient in ED with BP 170s, chronically on BP meds, negative workup. Increase amlodipine before discharge?\n\nPrimary Care: Diabetic with A1c 8.5 on metformin + glipizide. Add third agent vs. insulin? Patient preference vs. guideline.",
  },
  "management:3": {
    task_definition: "Reconciling medications in polypharmacy patients across incomplete, conflicting records and with high-noise clinical decision support alerts requiring active filtering.",
    scenario: "ED: 60yo admitted with confusion on diuretics, benzodiazepines, and sleeping pills. Which medications are contributing? What to hold?\n\nPrimary Care: 80yo on 14 medications presenting for wellness visit. Statin + new muscle pain. Deprescribing cascade risk.",
  },
  "management:4": {
    task_definition: "Ensuring actionable results are communicated, trigger an appropriate response, and are tracked to resolution.",
    scenario: "ED: Aortic dilation to 5.2cm on CT \u2014 when can patient follow up? Who tracks this?\n\nPrimary Care: Mildly elevated liver enzymes on routine labs. Repeat vs. workup? Ensure patient returns.",
  },
  "management:5": {
    task_definition: "Deciding against low-yield testing or imaging when clinical evidence does not support it, despite medico-legal pressure or patient expectations.",
    scenario: "ED: Does this pediatric bronchiolitis patient really need a chest X-ray?\n\nPrimary Care: Back pain <6 weeks, no red flags. Patient insists on MRI. Order it or not?",
  },
  "management:6": {
    task_definition: "Calibrating opioid prescribing at discharge or in the outpatient setting by balancing pain control against addiction risk and regulatory exposure.",
    scenario: "ED: Kidney stone patient with pain controlled in ED. Prescribe opioids for home? How many? Any history check?\n\nPrimary Care: Chronic low back pain patient requesting opioid refill. PDMP check shows multiple prescribers.",
  },
  "management:7": {
    task_definition: "Prioritizing workup, monitoring, and attention across patients when resources are simultaneously constrained.",
    scenario: "ED: Multiple patients boarding. Which need frequent reassessment vs. can wait? Only one CT slot available.\n\nPrimary Care: End of day, 3 patients need callbacks for abnormal labs. Prioritizing by severity with limited time.",
  },
  "management:8": {
    task_definition: "Aligning acute interventions with documented goals of care when the patient cannot participate, advance directives are ambiguous, and family perspectives conflict.",
    scenario: "ED: DNR/DNI patient with reversible hypoxia. BiPAP consistent with goals? Family disagrees.\n\nPrimary Care: Advanced cancer patient with new pneumonia. Aggressive treatment vs. comfort per prior discussions? Documentation unclear.",
  },
  "management:9": {
    task_definition: "Adjudicating treatment decisions when evidence-based guidelines for co-existing conditions directly conflict.",
    scenario: "ED: Septic patient with CHF \u2014 fluid resuscitation guideline conflicts with volume restriction. Beta-blocker for AFib RVR in patient with acute asthma.\n\nPrimary Care: CHF patient with CKD and diabetes \u2014 SGLT2 inhibitor recommended by cardiology, nephrology concerned about AKI, endocrine wants to add it. Whose guideline wins?",
  },
  "management:10": {
    task_definition: "Recognizing early warning signs of deterioration and acting on them before standard criteria are met.",
    scenario: "ED: Patient with borderline vitals and \u2018looking sick\u2019 \u2014 not yet meeting sepsis criteria but experienced clinician starts antibiotics early. Intubation setup for the patient who isn\u2019t yet in respiratory failure but is trending that way.\n\nPrimary Care: Patient with stable CHF whose weight is trending up 2lbs/week for 3 weeks \u2014 intervene now or wait for symptoms? Diabetic with gradually worsening renal function \u2014 when to refer nephrology?",
  },

  // ── Communication ───────────────────────────────────────────────────
  "communication:0": {
    task_definition: "Evaluating patient\u2019s decision-making capacity and navigating informed consent when cognition is impaired or fluctuating.",
    scenario: "ED: Intoxicated patient needing laceration repair. Capacity to consent? Proceed vs. wait vs. surrogate?\n\nPrimary Care: Early dementia patient needing to consent to colonoscopy. Understands benefits but not risks.",
  },
  "communication:1": {
    task_definition: "Delivering a serious new diagnosis while simultaneously supporting emotional processing and engaging the patient in immediate treatment decisions.",
    scenario: "ED: Telling a patient their CT shows a large mass concerning for cancer. Next steps in the ED.\n\nPrimary Care: Delivering a new cancer diagnosis at a follow-up visit. Treatment options, prognosis, referrals.",
  },
  "communication:2": {
    task_definition: "Adapting clinical communication to a patient\u2019s actual health literacy level to ensure genuine understanding of diagnosis, treatment, and follow-up.",
    scenario: "ED: Discharging patient with new AFib, anticoagulation instructions, and return precautions.\n\nPrimary Care: Explaining insulin initiation to a patient with limited English proficiency and 4th grade reading level.",
  },
  "communication:3": {
    task_definition: "Returning accurately to a complex clinical task after an interruption without losing critical context, skipping steps, or introducing errors from disrupted working memory.",
    scenario: "ED: Calculating medication dosing for critical patient, interrupted by code blue, then returning to original task.\n\nPrimary Care: Reviewing complex lab panel, interrupted by urgent phone call, resuming review and missing abnormal value.",
  },
  "communication:4": {
    task_definition: "Transferring a complete, accurate clinical picture at handoff, including pending tasks and anticipated concerns, under time pressure and fatigue.",
    scenario: "ED: Forget to document in EHR and then handoff with no communication. Pending labs, vital sign trends lost.\n\nPrimary Care: Handoff of deteriorating patient to covering physician at end of day. Critical lab pending.",
  },
  "communication:5": {
    task_definition: "Weighing AI recommendations against your own judgment to decide whether to follow or override them.",
    scenario: "ED: AI suggests PE workup for a patient you\u2019ve assessed as low-risk. Override or order CT-PA?\n\nPrimary Care: AI flags a medication interaction you\u2019ve been prescribing for years without issue. Change practice or dismiss?",
  },
  "communication:6": {
    task_definition: "Facilitating time-sensitive goals-of-care conversations and end-of-life choices, helping patients or families develop a documented plan despite uncertainty.",
    scenario: "ED: Critically ill patient in ED, family at bedside. Full code vs. comfort care discussion. Minutes matter for ICU bed.\n\nPrimary Care: Advanced COPD patient with declining function. Initiating advance directive conversation at annual visit.",
  },
  "communication:7": {
    task_definition: "Triaging asynchronous patient-initiated messages to identify time-sensitive or high-acuity clinical content.",
    scenario: "ED: ED follow-up message: \u2018My pain is worse since discharge yesterday and now I have a fever.\u2019\n\nPrimary Care: Patient messages at 9pm: \u2018I\u2019ve had chest pain all day but didn\u2019t want to bother you.\u2019 Seen next morning.",
  },
  "communication:8": {
    task_definition: "Conveying honest uncertainty about diagnosis, prognosis, or treatment effectiveness to patients in a way that preserves trust and supports rather than paralyzes decision-making.",
    scenario: "ED: Telling a patient: \u2018Your CT was negative but I can\u2019t fully rule out appendicitis. Here are the signs to come back for.\u2019 How much uncertainty is too much?\n\nPrimary Care: Explaining to a patient with an indeterminate lung nodule: \u2018It\u2019s probably nothing, but we need to follow it.\u2019 Balancing reassurance vs. vigilance.",
  },
  "communication:9": {
    task_definition: "Aligning the receiving clinician\u2019s understanding of the case, urgency, and requested action during handoff or consultation.",
    scenario: "ED: Calling cardiology for a NSTEMI consult \u2014 your concern is RV strain, their mental model is \u2018another troponin leak.\u2019 Different urgency, different plan.\n\nPrimary Care: Referring to GI for elevated liver enzymes \u2014 you\u2019re worried about autoimmune hepatitis, GI assumes fatty liver and schedules routine follow-up in 3 months.",
  },
  "communication:10": {
    task_definition: "Obtaining a reliable clinical history from patients whose communication is impaired by cognitive dysfunction, altered mental status, language barriers, or psychiatric overlap.",
    scenario: "ED: Elderly patient with dementia presents via EMS with altered behavior. No family available. History requires synthesis of EMS report, nursing home records, and limited patient responses.\n\nPrimary Care: Non-English-speaking patient with poorly controlled diabetes presents for follow-up. Interpreter unavailable. Must elicit medication adherence, symptoms, and social history through limited means.",
  },

  // ── Diagnostic ──────────────────────────────────────────────────────
  "diagnostic:0": {
    task_definition: "Determining workup and disposition for patients with chest pain in the intermediate-risk range when it\u2019s unclear whether they can be safely discharged or need further care.",
    scenario: "ED: 45yo M with atypical chest pain, normal ECG, mildly elevated troponin. ACS vs. dissection vs. musculoskeletal. Admit vs. obs vs. discharge?\n\nPrimary Care: 55yo F with exertional chest tightness and 2 cardiac risk factors. Office ECG normal. Send to ED vs. stress test outpatient vs. reassurance?",
  },
  "diagnostic:1": {
    task_definition: "Early identification of sepsis in patients presenting with vague, atypical, or incomplete symptom profiles where standard criteria are not yet met.",
    scenario: "ED: Immunocompromised patient with WBC elevation but minimal symptoms and borderline vitals.\n\nPrimary Care: Elderly diabetic with fatigue and mild confusion, afebrile. UTI vs. early sepsis vs. dehydration? Send to ED?",
  },
  "diagnostic:2": {
    task_definition: "Recognizing stroke in atypical presentations where symptoms overlap with benign conditions and initial exam may be falsely reassuring.",
    scenario: "ED: Elderly female with nystagmus, NIH 0, dizziness. CT imaging equivocal. Stroke protocol + TNK?\n\nPrimary Care: 65yo M with 2 days of episodic vertigo and gait unsteadiness. TIA vs. BPPV? Urgency of imaging?",
  },
  "diagnostic:3": {
    task_definition: "Evaluating for PE across a spectrum of pre-test probability, selecting diagnostic pathways and calibrating imaging thresholds to avoid both over-testing and missed diagnosis.",
    scenario: "ED: 32yo F post-partum with pleuritic chest pain and tachycardia. D-dimer elevated. CT-PA vs. V/Q?\n\nPrimary Care: 32yo F on OCPs with shortness of breath in clinic. Should she be sent to the ER?",
  },
  "diagnostic:4": {
    task_definition: "Systematically evaluating undifferentiated altered mental status without a reliable history and prioritizing time-sensitive, reversible conditions.",
    scenario: "ED: 30yo with substance use history, severely confused, abnormal vitals. Toxic-metabolic vs. CNS infection vs. structural? CT? LP?\n\nPrimary Care: 75yo brought by family for progressive confusion over 2 weeks. UTI vs. medication side effect vs. early dementia vs. subdural?",
  },
  "diagnostic:5": {
    task_definition: "Reaching diagnostic conclusions when key data are unavailable or refused.",
    scenario: "ED: CT without contrast due to allergies \u2014 can you rule out PE? ECG arrives in triage with no clinical context \u2014 NSTEMI vs. STEMI vs. baseline changes?\n\nPrimary Care: Patient declines bloodwork for religious reasons \u2014 assessing anemia clinically only. Abnormal mammogram result with implants and prior radiation \u2014 true positive vs. artifact?",
  },
  "diagnostic:6": {
    task_definition: "Interpreting borderline cancer screening results and calibrating follow-up intensity, balancing overdiagnosis harms against missed early disease.",
    scenario: "ED: Incidental lung nodule on trauma CT. Follow-up recommendation? Fleischner criteria application.\n\nPrimary Care: PSA 5.2 in a 62yo. Biopsy vs. repeat vs. MRI? Patient anxiety vs. overdiagnosis risk.",
  },
  "diagnostic:7": {
    task_definition: "Determining appropriate workup and follow-up for clinically significant unexpected findings identified during evaluation for an unrelated question.",
    scenario: "ED: CT abdomen for appendicitis reveals adrenal mass. Workup now or outpatient? Who follows up?\n\nPrimary Care: Chest X-ray for cough shows small pleural effusion. Pursue further or monitor?",
  },
  "diagnostic:8": {
    task_definition: "Maintaining an active, complete diagnostic search after an initial finding has been identified.",
    scenario: "ED: Trauma patient with obvious femur fracture \u2014 missed C-spine injury because attention focused on the dramatic finding. Polysubstance OD \u2014 treating for opioids, missing concurrent benzodiazepine ingestion.\n\nPrimary Care: Patient with confirmed UTI and dysuria \u2014 missed concurrent diabetes diagnosis from glucose on UA. Treating depression, missing hypothyroidism causing same symptoms.",
  },
  "diagnostic:9": {
    task_definition: "Recognizing when a working diagnosis is no longer supported by accumulating evidence and actively revising or abandoning it.",
    scenario: "ED: Patient admitted for CHF exacerbation not improving with diuresis \u2014 actually a PE. EMS report says \u2018psych patient\u2019 \u2014 actually hypoglycemic.\n\nPrimary Care: Treating recurrent \u2018GERD\u2019 for months \u2014 actually eosinophilic esophagitis. Attributing fatigue to depression \u2014 actually new-onset anemia from colon cancer.",
  },
  "diagnostic:10": {
    task_definition: "Weighing conflicting findings from history, exam, labs, and imaging to reach a diagnosis without over-relying on any one source.",
    scenario: "ED: Chest pain patient: history suggests ACS, troponin borderline, ECG shows non-specific changes, CT-A shows no PE but incidental finding. Which signal dominates?\n\nPrimary Care: Patient reports feeling fine, A1c is 11, home glucometer readings are all normal. Which data do you trust? Device malfunction vs. non-compliance vs. lab error?",
  },
  "diagnostic:11": {
    task_definition: "Extracting actionable clinical information from EHR records saturated with auto-populated text, copied-forward notes, and high-volume low-signal alerts under time pressure and alert fatigue.",
    scenario: "ED: Patient presents with chest pain. Chart contains 400+ notes, majority of which are copied forward. Provider must identify the one note from 6 months ago documenting prior cocaine use and QTc prolongation.\n\nPrimary Care: Complex patient with 12 years of records. Must locate prior colonoscopy result and pathology report buried among hundreds of routine visit notes to determine cancer screening interval.",
  },
};

/**
 * Look up hardcoded content for a case by section slug and order index.
 * Falls back to empty strings if not found (shouldn't happen with valid data).
 */
export function getCaseContent(sectionSlug: string, orderIndex: number): CaseContent {
  const key = `${sectionSlug}:${orderIndex}`;
  return CASE_CONTENT[key] ?? { task_definition: "", scenario: "" };
}
