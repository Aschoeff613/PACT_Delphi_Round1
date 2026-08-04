"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RatingState = {
  clinical_relevance: number | null;
  performance_variance: number | null;
  ai_relevance: number | null;
  comment: string;
  marked_for_discussion: boolean;
};

const questions = [
  {
    key: "clinical_relevance",
    title: "Clinical Relevance",
    help: "How serious are the consequences when this task is performed poorly?",
    low: "Errors cause minimal or reversible harm",
    high: "Errors cause serious harm, disability, or death"
  },
  {
    key: "performance_variance",
    title: "Performance Variance",
    help: "How much would competent clinicians disagree about the right path forward on this task?",
    low: "Clinicians would nearly all take the same approach",
    high: "Clinicians would vary widely on the path forward"
  },
  {
    key: "ai_relevance",
    title: "AI Augmentation Potential",
    help: "Could AI (including ML, LLMs, agents, etc.) meaningfully augment this task?",
    low: "Requires judgment AI cannot replicate",
    high: "AI-demonstrated capability in this area"
  }
] as const;

const SCALE = [1, 2, 3, 4, 5] as const;

// Short label for the currently selected value — per dimension
const VALUE_LABELS: Record<string, Record<number, string>> = {
  clinical_relevance: {
    1: "Very Low",
    2: "Low",
    3: "Moderate",
    4: "High",
    5: "Very High"
  },
  performance_variance: {
    1: "Strong consensus",
    2: "Minor variation",
    3: "Moderate variation",
    4: "Substantial disagreement",
    5: "Wide disagreement"
  },
  ai_relevance: {
    1: "AI unlikely to help",
    2: "Marginal AI value",
    3: "Moderate AI value",
    4: "Clear AI benefit",
    5: "AI core to this task"
  }
};

export function ReviewPanel({
  caseId,
  initial,
  previousHref,
  nextHref
}: {
  caseId: string;
  initial: RatingState;
  previousHref: string | null;
  nextHref: string | null;
}) {
  const [state, setState] = useState<RatingState>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setState(initial);
    setSavedAt(null);
    setStatus("idle");
    panelRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [caseId, initial]);

  const isCompleted = useMemo(() => {
    return [
      state.clinical_relevance,
      state.performance_variance,
      state.ai_relevance
    ].every((value) => value !== null);
  }, [state]);

  async function save(next: RatingState) {
    setStatus("saving");
    const response = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, ...next })
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("saved");
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }

  function queueSave(next: RatingState) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void save(next);
    }, 350);
  }

  function update(partial: Partial<RatingState>) {
    const next = { ...state, ...partial };
    setState(next);
    queueSave(next);
  }

  return (
    <aside ref={panelRef} className="review-scoring-panel">
      {/* ── Step 2 header ──────────────────────────────────────────── */}
      <div className="panel-header">
        <div>
          <div className="step-badge step-badge--score">Step 2 · Score task</div>
          <h2>Scoring</h2>
        </div>
        <span className={cn("save-state", status)}>
          {status === "saved" ? `Saved ${savedAt}` : status === "saving" ? "Saving…" : status === "error" ? "Save failed" : ""}
        </span>
      </div>

      {/* ── Scoring cards ──────────────────────────────────────────── */}
      {questions.map((question) => {
        const value = state[question.key];
        const rated = value !== null;

        return (
          <div key={question.key} className="likert-block">
            <div className="likert-copy">
              <h3>{question.title}</h3>
              <p>{question.help}</p>
            </div>

            {/* Radio rating control — 1–5 scale. Unlike a slider, nothing is
                selected until the reviewer chooses, so no value is ever shown
                that they did not pick. */}
            <fieldset className={cn("rating-radios", !rated && "unrated")}>
              <legend className="visually-hidden">{question.title} rating</legend>
              {SCALE.map((n) => {
                const id = `${question.key}-${caseId}-${n}`;
                return (
                  <label
                    key={n}
                    htmlFor={id}
                    className={cn("rating-radio", value === n && "selected")}
                  >
                    <input
                      id={id}
                      type="radio"
                      name={`${question.key}-${caseId}`}
                      value={n}
                      checked={value === n}
                      onChange={() =>
                        update({ [question.key]: n } as unknown as Partial<RatingState>)
                      }
                    />
                    <span className="rating-radio-number">{n}</span>
                    <span className="rating-radio-label">
                      {VALUE_LABELS[question.key]?.[n]}
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <div className="rating-anchors">
              <span className="rating-end-label">{question.low}</span>
              <span className="rating-end-label rating-end-right">{question.high}</span>
            </div>
          </div>
        );
      })}

      {/* ── Comments / flag footer ─────────────────────────────────── */}
      <div className="panel-footer">
        <label className="field-block">
          <span>Optional comment</span>
          <textarea
            value={state.comment}
            onChange={(event) => update({ comment: event.target.value })}
            placeholder="Add nuance, edge cases, or rationale for discussion."
          />
        </label>

        <label className="discussion-toggle">
          <input
            type="checkbox"
            checked={state.marked_for_discussion}
            onChange={(event) => update({ marked_for_discussion: event.target.checked })}
          />
          <span>Flag for panel discussion</span>
        </label>
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <div className="panel-nav-actions">
        {previousHref ? (
          <Link className="ghost-button" href={previousHref}>
            Previous task
          </Link>
        ) : (
          <span />
        )}

        {nextHref ? (
          isCompleted ? (
            <Link className="primary-button" href={nextHref}>
              Next task
            </Link>
          ) : (
            <>
              <span className="case-nav-hint">Score all three dimensions to continue.</span>
              <span className="primary-button button-disabled">Next task</span>
            </>
          )
        ) : (
          <Link className="ghost-button" href="/">
            Back to sections
          </Link>
        )}
      </div>
    </aside>
  );
}
