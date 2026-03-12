from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import pdfplumber


INPUT = Path(
    sys.argv[1]
    if len(sys.argv) > 1
    else "/Users/anastasiaperezternent/Downloads/High_Risk_Cognitive_Tasks - V2 Task List (1).pdf"
)
BASE_DIR = Path(__file__).resolve().parents[1]
OUT_CSV = BASE_DIR / "data" / "high-risk-cognitive-tasks-draft.csv"
OUT_JSON = BASE_DIR / "data" / "high-risk-cognitive-tasks-seed-draft.json"

HEADER_MAP = [
    "source_id",
    "domain",
    "subcategory",
    "task_name",
    "clinical_cluster",
    "definition",
    "example_ed",
    "example_primary_care",
    "clinical_setting",
    "source_of_variability",
    "encounter_frequency",
    "error_rate_given_exposure",
    "notes",
]


def clean_cell(value: object) -> str:
    return " ".join(str(value or "").replace("\n", " ").split()).strip()


def section_from_domain(domain: str) -> str:
    normalized = clean_cell(domain).lower()
    if "management" in normalized:
        return "Management"
    if "communication" in normalized:
        return "Communication"
    if "diagnostic" in normalized:
        return "Diagnostic"
    return "Management"


def extract_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    with pdfplumber.open(str(INPUT)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table or len(table) <= 1:
                    continue
                for raw_row in table[1:]:
                    if not raw_row or not any(raw_row):
                        continue
                    cells = [clean_cell(cell) for cell in raw_row[: len(HEADER_MAP)]]
                    if not cells or not cells[0]:
                        continue
                    rows.append({key: cells[idx] if idx < len(cells) else "" for idx, key in enumerate(HEADER_MAP)})
    return rows


def build_seed(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    seed = []
    for section in ("Management", "Communication", "Diagnostic"):
      section_rows = [row for row in rows if section_from_domain(row["domain"]) == section]
      seed.append(
          {
              "section": section,
              "cases": [
                  {
                      "source_id": row["source_id"],
                      "title": row["task_name"] or row["source_id"],
                      "scenario": "\n\n".join(
                          filter(
                              None,
                              [
                                  row["definition"],
                                  f"ED example: {row['example_ed']}" if row["example_ed"] else "",
                                  (
                                      f"Primary care example: {row['example_primary_care']}"
                                      if row["example_primary_care"]
                                      else ""
                                  ),
                              ],
                          )
                      ),
                      "task_definition": "\n".join(
                          filter(
                              None,
                              [
                                  (
                                      f"Clinical cluster: {row['clinical_cluster']}"
                                      if row["clinical_cluster"]
                                      else ""
                                  ),
                                  f"Cognitive category: {row['subcategory']}" if row["subcategory"] else "",
                                  (
                                      f"Source of variability: {row['source_of_variability']}"
                                      if row["source_of_variability"]
                                      else ""
                                  ),
                                  f"Notes: {row['notes']}" if row["notes"] else "",
                              ],
                          )
                      ),
                      "order_index": index,
                  }
                  for index, row in enumerate(section_rows)
              ],
          }
      )
    return seed


def main() -> None:
    rows = extract_rows()

    with OUT_CSV.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADER_MAP)
        writer.writeheader()
        writer.writerows(rows)

    seed = build_seed(rows)
    OUT_JSON.write_text(json.dumps(seed, indent=2))

    print(f"Wrote {len(rows)} rows to {OUT_CSV}")
    print(f"Wrote seed draft to {OUT_JSON}")


if __name__ == "__main__":
    main()
