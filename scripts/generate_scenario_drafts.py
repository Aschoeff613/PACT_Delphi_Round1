from __future__ import annotations

import csv
import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
CSV_PATH = BASE_DIR / "data" / "high-risk-cognitive-tasks-draft.csv"
JSON_PATH = BASE_DIR / "data" / "high-risk-cognitive-tasks-seed-draft.json"


def clean(value: str) -> str:
    return " ".join(str(value or "").replace("\n", " ").split()).strip()


def shorten(value: str, limit: int = 220) -> str:
    text = clean(value)
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def infer_actor(domain: str) -> str:
    d = clean(domain).lower()
    if "communication" in d:
        return "A clinician is navigating a high-stakes communication task"
    if "diagnostic" in d:
        return "A clinician is evaluating a diagnostically uncertain case"
    return "A clinician is making a management decision"


def scenario_draft(row: dict[str, str]) -> str:
    actor = infer_actor(row.get("domain", ""))
    task_name = clean(row.get("task_name", "")) or f"task {clean(row.get('source_id', ''))}"
    cluster = clean(row.get("clinical_cluster", ""))
    definition = shorten(row.get("definition", ""), 260)
    variability = shorten(row.get("source_of_variability", ""), 170)
    ed = shorten(row.get("example_ed", ""), 150)
    pc = shorten(row.get("example_primary_care", ""), 150)
    setting = clean(row.get("clinical_setting", "")) or "clinical practice"

    parts = [
        f"{actor} involving {task_name.lower()} in {setting.lower()}.",
    ]
    if definition:
        parts.append(f"The core issue is: {definition}")
    if cluster:
        parts.append(f"This sits within {cluster.lower()}.")
    if variability:
        parts.append(f"Key sources of variability include {variability.lower()}.")
    examples = []
    if ed:
        examples.append(f"an emergency example such as {ed.lower()}")
    if pc:
        examples.append(f"a primary-care example such as {pc.lower()}")
    if examples:
        parts.append("For testing, reviewers can imagine " + " and ".join(examples) + ".")
    parts.append(
        "The reviewer should imagine rating the risk, complexity, variability, and plausible LLM relevance of this case as a concrete but representative example."
    )
    return " ".join(parts)


def review_scenario(row: dict[str, str]) -> str:
    domain = clean(row.get("domain", ""))
    task_name = clean(row.get("task_name", "")) or clean(row.get("source_id", "this task"))
    cluster = clean(row.get("clinical_cluster", ""))
    setting = clean(row.get("clinical_setting", "")) or "clinical practice"

    opener = {
        "Management": "A clinician must make a care-management decision for a patient in a realistic clinical setting.",
        "Communication": "A clinician must handle a high-stakes communication task with a patient, family member, or care team.",
        "Diagnostic": "A clinician must make or support a diagnostic judgment in a realistic clinical setting.",
    }.get(domain, "A clinician must act on a challenging clinical task.")

    lines = [
        opener,
        f"The focal task is {task_name}.",
    ]

    if cluster:
        lines.append(f"This case falls within {cluster}.")

    lines.append(
        f"Reviewers should imagine a representative case in {setting.lower()} where the clinician must complete this task under realistic time, information, uncertainty, and workflow constraints."
    )

    lines.append(
        "For audience testing, treat this as a stand-in vignette rather than a finalized case write-up."
    )
    lines.append(
        "Ask the reviewer to rate the case on risk severity, cognitive complexity, performance variability, and plausible AI relevance."
    )

    return " ".join(lines)


def update_csv() -> list[dict[str, str]]:
    with CSV_PATH.open() as handle:
      reader = csv.DictReader(handle)
      rows = list(reader)

    fieldnames = list(reader.fieldnames or [])
    if "scenario_draft" not in fieldnames:
      fieldnames.append("scenario_draft")
    if "review_scenario" not in fieldnames:
      fieldnames.append("review_scenario")

    for row in rows:
      row["scenario_draft"] = scenario_draft(row)
      row["review_scenario"] = review_scenario(row)

    with CSV_PATH.open("w", newline="") as handle:
      writer = csv.DictWriter(handle, fieldnames=fieldnames)
      writer.writeheader()
      writer.writerows(rows)

    return rows


def update_json(rows: list[dict[str, str]]) -> None:
    grouped = {"Management": [], "Communication": [], "Diagnostic": []}
    for row in rows:
      domain = clean(row.get("domain", "")).lower()
      if "communication" in domain:
        section = "Communication"
      elif "diagnostic" in domain:
        section = "Diagnostic"
      else:
        section = "Management"
      grouped[section].append(row)

    payload = []
    for section, section_rows in grouped.items():
      payload.append(
        {
          "section": section,
          "cases": [
            {
              "source_id": row["source_id"],
              "title": clean(row.get("task_name", "")) or row["source_id"],
              "scenario": row["review_scenario"],
              "review_scenario": row["review_scenario"],
              "task_definition": "\n".join(
                [
                  line
                  for line in [
                    f"Clinical cluster: {clean(row.get('clinical_cluster', ''))}" if clean(row.get("clinical_cluster", "")) else "",
                    f"Cognitive category: {clean(row.get('subcategory', ''))}" if clean(row.get("subcategory", "")) else "",
                    f"Encounter frequency: {clean(row.get('encounter_frequency', ''))}" if clean(row.get("encounter_frequency", "")) else "",
                    f"Error rate given exposure: {clean(row.get('error_rate_given_exposure', ''))}" if clean(row.get("error_rate_given_exposure", "")) else "",
                    f"Notes: {clean(row.get('notes', ''))}" if clean(row.get("notes", "")) else "",
                  ]
                  if line
                ]
              ),
              "order_index": index,
            }
            for index, row in enumerate(section_rows)
          ],
        }
      )

    JSON_PATH.write_text(json.dumps(payload, indent=2))


def main() -> None:
    rows = update_csv()
    update_json(rows)
    print(f"Updated {CSV_PATH}")
    print(f"Updated {JSON_PATH}")


if __name__ == "__main__":
    main()
