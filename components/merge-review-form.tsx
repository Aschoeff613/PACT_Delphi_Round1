"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type CaseOption = {
  id: string;
  title: string;
  order_index: number;
};

type ExistingSelection = {
  source_case_id: string;
  decision: "none" | "possible_merge";
  target_case_id: string | null;
};

type RowState = {
  source_case_id: string;
  decision: "none" | "possible_merge";
  target_case_id: string | null;
};

export function MergeReviewForm({
  sectionSlug,
  cases,
  initialSelections,
  initialNotes,
  continueHref,
  continueLabel
}: {
  sectionSlug: string;
  cases: CaseOption[];
  initialSelections: ExistingSelection[];
  initialNotes: string;
  continueHref: string;
  continueLabel: string;
}) {
  const initialRows = useMemo(() => {
    const bySource = new Map(initialSelections.map((item) => [item.source_case_id, item]));
    return cases.map((item) => {
      const existing = bySource.get(item.id);
      return {
        source_case_id: item.id,
        decision: existing?.decision ?? "none",
        target_case_id: existing?.target_case_id ?? null
      } satisfies RowState;
    });
  }, [cases, initialSelections]);

  const router = useRouter();
  const [rows, setRows] = useState<RowState[]>(initialRows);
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function updateRow(sourceCaseId: string, patch: Partial<RowState>) {
    setRows((current) =>
      current.map((row) =>
        row.source_case_id === sourceCaseId
          ? {
              ...row,
              ...patch
            }
          : row
      )
    );
    if (status !== "idle") setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const response = await fetch("/api/merge-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section_slug: sectionSlug,
        notes,
        selections: rows
      })
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("saved");
    router.push("/");
  }

  return (
    <div className="merge-review-layout">
      <section className="merge-review-notes">
        <div className="eyebrow">Instructions</div>
        <h3>How to review possible merges</h3>
        <p>For each task, choose whether it should stay separate or might overlap with another task in this section. If it might overlap, choose the closest matching task.</p>

        <label className="field-block">
          <span>Optional notes</span>
          <textarea
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            placeholder="Add any higher-level notes about the section, including clusters that feel too similar."
          />
        </label>

        <div className="final-review-actions">
          <button type="button" className="primary-button" onClick={handleSave}>
            Save merge review
          </button>
          <Link href={continueHref} className="ghost-button">
            {continueLabel}
          </Link>
          <span className={cn("save-state", status)}>
            {status === "saved" ? "Saved" : status === "saving" ? "Saving..." : status === "error" ? "Save failed" : ""}
          </span>
        </div>
      </section>

      <section className="merge-review-list">
        <div className="eyebrow">Section tasks</div>
        <h3>Possible merge decisions</h3>
        <div className="merge-review-rows">
          {cases.map((item) => {
            const row = rows.find((entry) => entry.source_case_id === item.id)!;
            const targetOptions = cases.filter((candidate) => candidate.id !== item.id);

            return (
              <div key={item.id} className="merge-row">
                <div className="merge-row-title">
                  <span className="case-index small">{item.order_index + 1}</span>
                  <strong>{item.title}</strong>
                </div>

                <div className="merge-row-controls">
                  <select
                    value={row.decision}
                    onChange={(event) =>
                      updateRow(item.id, {
                        decision: event.target.value as RowState["decision"],
                        target_case_id: event.target.value === "possible_merge" ? row.target_case_id : null
                      })
                    }
                  >
                    <option value="none">Keep separate</option>
                    <option value="possible_merge">Possibly merge</option>
                  </select>

                  <select
                    value={row.target_case_id ?? ""}
                    disabled={row.decision !== "possible_merge"}
                    onChange={(event) =>
                      updateRow(item.id, {
                        target_case_id: event.target.value || null
                      })
                    }
                  >
                    <option value="">Select related task</option>
                    {targetOptions.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.order_index + 1}. {candidate.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <div className="final-review-actions" style={{ justifyContent: "flex-end", marginTop: "16px" }}>
          <span className={cn("save-state", status)}>
            {status === "saved" ? "Saved" : status === "saving" ? "Saving..." : status === "error" ? "Save failed" : ""}
          </span>
          <button type="button" className="primary-button" onClick={handleSave}>
            Save merge review
          </button>
        </div>
      </section>
    </div>
  );
}
