from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

import pandas as pd


INPUT = Path(
    sys.argv[1]
    if len(sys.argv) > 1
    else "/Users/anastasiaperezternent/Downloads/High_Risk_Cognitive_Tasks - V2 Task List.csv"
)
BASE_DIR = Path(__file__).resolve().parents[1]
OUT_CSV = BASE_DIR / "data" / "high-risk-cognitive-tasks-draft.csv"
OUT_JSON = BASE_DIR / "data" / "high-risk-cognitive-tasks-seed-draft.json"

SCENARIO_OVERRIDES = {
    "M1": "A 70-year-old with recurrent urinary infections presents with fever, dysuria, and hypotension. Prior cultures showed fluoroquinolone resistance, and you need to choose empiric antibiotics before new culture data return.",
    "M2": "A patient with heart failure presents with dyspnea, borderline oxygen saturation, and limited outpatient support. The workup is reassuring enough that discharge is possible, but the risk of decompensation after going home is not trivial.",
    "M3": "A patient with longstanding hypertension is seen after several visits with persistently poor control despite taking multiple medications. You need to decide whether to intensify treatment now or defer changes until there is better follow-up and more context.",
    "M4": "A 60-year-old is admitted with confusion after taking several chronic medications, including a benzodiazepine, a diuretic, and a sedating sleep aid. You need to determine which drugs may be contributing and what should be held, continued, or deprescribed.",
    "M5": "A CT ordered for one complaint reveals a serious incidental abnormality that will need follow-up after discharge. You need to decide how urgently it must be addressed, who is responsible for the follow-up plan, and how to make sure it does not get lost.",
    "M6": "A child with bronchiolitis is stable and clinically consistent with a viral illness, but the family is asking for a chest X-ray for reassurance. You need to decide whether additional testing would help or would only add cost, radiation, and follow-up burden.",
    "M7": "A patient with acute renal colic improves in the emergency department and is ready for discharge. You need to decide whether to prescribe opioids for home use, how much to give, and what risk factors should change that plan.",
    "M8": "The department is full, several patients are boarding, and only one CT slot is immediately available. You need to decide which patients require the closest reassessment and which limited resources should go to whom first.",
    "M9": "A patient with advanced illness develops acute respiratory distress, and the chart documents DNR/DNI status but little detail about acceptable escalation. The family wants everything done, while the bedside team is unsure which treatments are still consistent with the patient’s goals.",
    "M10": "A septic patient with heart failure and chronic kidney disease needs urgent treatment, but the guideline-concordant plan for one condition increases risk for the others. You need to choose a management strategy when multiple specialty recommendations point in different directions.",
    "M11": "A patient looks unwell and has borderline vital signs but does not yet meet formal criteria for ICU transfer or a sepsis bundle. You need to decide whether to intervene early based on pattern recognition or wait for clearer objective deterioration.",
    "D1": "A 45-year-old with chest pain has a nondiagnostic ECG and only a mild troponin elevation. You need to decide whether this presentation warrants discharge, observation, or a more aggressive workup for a potentially dangerous cause.",
    "D2": "An older immunocompromised patient presents with fatigue, mild confusion, and borderline vital signs but no clear source of infection. You need to decide whether this is early sepsis, a less dangerous process, or something else entirely.",
    "D3": "An older patient presents with dizziness, gait instability, and nystagmus, but the initial imaging is equivocal and the NIH stroke scale is low. You need to decide whether this is a posterior circulation stroke that demands urgent treatment or a less dangerous vestibular process.",
    "D4": "A postpartum patient presents with pleuritic chest pain, tachycardia, and shortness of breath. You need to judge the likelihood of pulmonary embolism and choose the next diagnostic step without exposing the patient to unnecessary testing.",
    "D5": "A young child presents with abdominal pain, abnormal vital signs, and limited ability to explain the symptoms. You need to decide how aggressively to evaluate for a surgical emergency while minimizing unnecessary radiation or invasive testing.",
    "D6": "A patient with severe confusion, abnormal vital signs, and a history that could fit toxic, infectious, or neurologic causes arrives without a reliable historian. You need to structure the workup quickly while the differential remains broad and high risk.",
    "D7": "A patient may have a serious diagnosis, but the usual confirming data are missing because the key test is incomplete, contraindicated, or declined. You need to decide how much diagnostic confidence is possible with limited information.",
    "D8": "An abnormal test result reaches you with little or no clinical context about why it was ordered or what the patient looked like at the time. You need to decide how much weight to give the finding and what follow-up it should trigger.",
    "D9": "A patient from a vulnerable population cannot clearly describe symptoms, and the presentation could reflect either benign illness or a high-risk diagnosis. You need to infer what matters most from sparse or indirect information.",
    "D10": "A time-sensitive diagnosis is suspected, and the next treatment step could be beneficial if correct but harmful if wrong. You need to decide whether the evidence is strong enough to proceed before certainty is possible.",
    "D11": "A screening or incidental cancer-related result is abnormal but not definitive. You need to decide whether to escalate immediately, repeat testing, or monitor over time while balancing anxiety, overdiagnosis, and missed disease.",
    "D12": "A test ordered for one problem unexpectedly reveals a different abnormality that may or may not matter. You need to decide whether to work it up now, arrange outpatient follow-up, or monitor without overreacting.",
    "D13": "A dramatic diagnosis has already been identified, and the team’s attention is anchored there. You need to decide whether anything important could still be missing despite having already found one obvious explanation.",
    "D14": "A patient is being treated for a working diagnosis, but the clinical course and new data no longer fit. You need to decide when to abandon the original frame and reopen the differential.",
    "D15": "History, exam, labs, and imaging are pointing in different directions rather than converging on a single answer. You need to decide which signals deserve the most trust and how to integrate the conflicting information into one plan.",
    "D16": "A clinically complex patient has years of copied-forward notes, redundant alerts, and buried key details in the chart. You need to identify the few pieces of information that actually change today’s decision-making.",
    "C1": "An intoxicated patient needs an urgent but non-life-saving procedure and cannot clearly demonstrate understanding of the risks and options. You need to decide whether the patient has capacity, whether treatment can proceed, and whether a surrogate should be involved.",
    "C2": "You are meeting a patient whose imaging strongly suggests a new cancer diagnosis. In the same conversation, you need to explain the finding, respond to emotion, and help the patient understand the immediate next decisions.",
    "C3": "A patient with limited health literacy needs discharge instructions for a new high-risk condition and a medication that requires careful adherence. You need to explain the plan in a way the patient can actually understand and use at home.",
    "C4": "You are calculating a weight-based medication dose for a critically ill patient when a code blue interrupts you. When you return to the original task a few minutes later, you need to resume safely without losing context or skipping a step.",
    "C5": "At shift change, you are handing off a patient with pending labs, evolving vital sign abnormalities, and an unclear disposition. The next clinician will be making decisions soon, so the key risks and unfinished work need to be communicated accurately.",
    "C6": "A decision-support tool recommends an aggressive workup that conflicts with your own bedside assessment. You need to decide whether to follow the AI recommendation, override it, or gather more data while managing uncertainty about which judgment to trust.",
    "C7": "A seriously ill patient is deteriorating, family members are at the bedside, and decisions about code status or escalation cannot wait until later. You need to lead a goals-of-care conversation under time pressure while emotions are high.",
    "C8": "An overnight portal message says the patient’s pain is worse after a recent visit and now includes a new fever. You need to decide whether this can wait for routine follow-up or whether it signals a problem that needs urgent escalation.",
    "C9": "The workup is reassuring but not definitive, and you cannot fully exclude a dangerous diagnosis. You need to explain the remaining uncertainty honestly while still giving the patient a clear plan and preserving trust.",
    "C10": "You call a consultant because you are worried about a high-risk process, but the receiving team seems to view the case as routine. You need to communicate the urgency and your mental model clearly enough that both teams are acting on the same problem.",
    "C11": "A patient with limited ability to communicate arrives without a reliable historian, and the available story is fragmented across EMS, prior records, and partial patient responses. You need to reconstruct the history well enough to guide care despite those barriers.",
}


def clean(value: object) -> str:
    return " ".join(str(value or "").replace("\n", " ").split()).strip()


def section_from_domain(domain: str) -> str:
    normalized = clean(domain).lower()
    if "management" in normalized:
        return "Management"
    if "communication" in normalized:
        return "Communication"
    if "diagnostic" in normalized:
        return "Diagnostic"
    return "Management"


def sentence_case(text: str) -> str:
    text = clean(text)
    if not text:
        return ""
    return text[0].upper() + text[1:]


def ensure_punctuation(text: str) -> str:
    text = clean(text)
    if not text:
        return ""
    if text[-1] in ".!?":
        return text
    return f"{text}."


def normalize_example_text(text: str) -> str:
    text = clean(text)
    if not text:
        return ""

    text = re.sub(r"\b(\d{1,3})yo\b", r"\1-year-old", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(\d{1,3})\s*yo\b", r"\1-year-old", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(\d{1,3})-year-old\s+M\b", r"\1-year-old man", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(\d{1,3})-year-old\s+F\b", r"\1-year-old woman", text, flags=re.IGNORECASE)
    text = re.sub(r"^Patient\b", "The patient", text)
    text = text.replace(" vs. ", " versus ")
    text = text.replace("CT-PA", "CT pulmonary angiography")
    text = re.sub(r", then ", ". Then ", text, flags=re.IGNORECASE)

    first_word = text.split()[0].lower() if text.split() else ""
    if first_word.endswith("ing"):
        text = f"You are {text[0].lower() + text[1:]}"

    if re.match(r"^\d", text):
        text = f"A {text}"
    elif re.match(r"^(Male|Female)\b", text, flags=re.IGNORECASE):
        text = f"A {text.lower()}"

    return ensure_punctuation(sentence_case(text))


def infer_setting_label(title: str, example: str, default_label: str) -> str:
    haystack = title.lower()
    if any(keyword in haystack for keyword in ["portal", "primary care"]):
        return "primary care clinic"
    if any(keyword in haystack for keyword in ["ed ", "emergency"]):
        return "emergency department"
    return default_label


def clinician_role(section: str, setting: str) -> str:
    setting = clean(setting).lower()
    if "ed" in setting or "emergency" in setting:
        return "You are the treating emergency clinician."
    if "primary" in setting or "outpatient" in setting:
        return "You are the treating primary care clinician."
    if section == "Diagnostic":
        return "You are the clinician evaluating this patient."
    if section == "Communication":
        return "You are the clinician leading this conversation."
    return "You are the treating clinician."


def choose_example(row: pd.Series) -> tuple[str, str]:
    example_ed = clean(row["Example (ED)"])
    example_pc = clean(row["Example (Primary Care)"])
    if example_ed:
        return example_ed, "emergency department"
    if example_pc:
        return example_pc, "primary care clinic"
    return "", "clinical practice"


def synthesize_case_stub(task_name: str, definition: str, section: str) -> str:
    if section == "Diagnostic":
        return ensure_punctuation(
            f"A patient presents with an uncertain clinical picture, and the team must work through {task_name.lower()} before missing a serious diagnosis"
        )
    if section == "Communication":
        return ensure_punctuation(
            f"A clinically important conversation is unfolding, and the team must navigate {task_name.lower()} while maintaining patient and team alignment"
        )
    return ensure_punctuation(
        f"A patient case requires a management decision centered on {task_name.lower()} under realistic clinical constraints"
    )


def build_review_scenario(row: pd.Series) -> str:
    task_name = clean(row["Task Name"])
    definition = clean(row["Definition"])
    source_id = clean(row["ID"])
    if source_id in SCENARIO_OVERRIDES:
        return SCENARIO_OVERRIDES[source_id]

    section = section_from_domain(row["Domain"])
    chosen_example, chosen_label = choose_example(row)
    if chosen_example:
        return normalize_example_text(chosen_example)
    return synthesize_case_stub(task_name, definition, section)


def main() -> None:
    df = pd.read_csv(INPUT)
    df = df.fillna("")
    df["section"] = df["Domain"].apply(section_from_domain)
    df["source_id"] = df["ID"].map(clean)
    df["title"] = df["Task Name"].map(clean)
    df["clinical_cluster"] = df["Clinical Cluster"].map(clean)
    df["subcategory"] = df["Cognitive Demand Subcategory"].map(clean)
    df["definition"] = df["Definition"].map(clean)
    df["example_ed"] = df["Example (ED)"].map(clean)
    df["example_primary_care"] = df["Example (Primary Care)"].map(clean)
    df["clinical_setting"] = df["Clinical Setting"].map(clean)
    df["source_of_variability"] = df["Source of Variability"].map(clean)
    df["encounter_frequency"] = df["Encounter Frequency"].map(clean)
    df["error_rate_given_exposure"] = df["Error Rate Given Exposure"].map(clean)
    df["notes"] = df["Notes"].map(clean)
    df["review_scenario"] = df.apply(build_review_scenario, axis=1)

    ordered_columns = [
        "source_id",
        "section",
        "title",
        "subcategory",
        "clinical_cluster",
        "definition",
        "example_ed",
        "example_primary_care",
        "clinical_setting",
        "source_of_variability",
        "encounter_frequency",
        "error_rate_given_exposure",
        "notes",
        "review_scenario",
    ]
    draft_df = df[ordered_columns].copy()
    draft_df.to_csv(OUT_CSV, index=False, quoting=csv.QUOTE_MINIMAL)

    payload = []
    for section in ("Management", "Communication", "Diagnostic"):
        section_df = draft_df[draft_df["section"] == section].reset_index(drop=True)
        payload.append(
            {
                "section": section,
                "cases": [
                    {
                        "source_id": row["source_id"],
                        "title": row["title"],
                        "scenario": row["review_scenario"],
                        "review_scenario": row["review_scenario"],
                        "task_definition": "\n".join(
                            [row["definition"]] if row["definition"] else []
                        ),
                        "order_index": idx,
                    }
                    for idx, row in section_df.iterrows()
                ],
            }
        )

    OUT_JSON.write_text(json.dumps(payload, indent=2))
    print(f"Wrote {len(draft_df)} rows to {OUT_CSV}")
    print(f"Wrote seed draft to {OUT_JSON}")


if __name__ == "__main__":
    main()
