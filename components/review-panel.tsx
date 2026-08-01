"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type RatingState = {
  clinical_relevance: number | null;
  benchmarkability: number | null;
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
    key: "benchmarkability",
    title: "Benchmarkability / Saturation",
    help: "Could this task be turned into a meaningful benchmark, or is measurable performance already saturated?",
    low: "Already saturated, or cannot be measured cleanly",
    high: "Cleanly measurable with real headroom left"
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
const SCALE_MIN = SCALE[0];
const SCALE_MAX = SCALE[SCALE.length - 1];
const SCALE_MID = Math.ceil((SCALE_MIN + SCALE_MAX) / 2);

// Short label for the currently selected value — per dimension
const VALUE_LABELS: Record<string, Record<number, string>> = {
  clinical_relevance: {
    1: "Very Low",
    2: "Low",
    3: "Moderate",
    4: "High",
    5: "Very High"
  },
  benchmarkability: {
    1: "Saturated / unmeasurable",
    2: "Weak benchmark target",
    3: "Moderate headroom",
    4: "Strong benchmark target",
    5: "Ideal benchmark target"
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
      state.benchmarkability,
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
        // An unrated slider parks at the midpoint but reads as unset, so a
        // reviewer is never shown a score they did not actually choose.
        const shown = value ?? SCALE_MID;

        return (
          <div key={question.key} className="likert-block">
            <div className="likert-copy">
              <h3>{question.title}</h3>
              <p>{question.help}</p>
            </div>

            {/* Slider rating control — 1–5 scale */}
            <div
              className={cn("rating-slider", !rated && "unrated")}
              style={
                {
                  "--fill": `${((shown - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`
                } as CSSProperties
              }
            >
              <input
                type="range"
                min={SCALE_MIN}
                max={SCALE_MAX}
                step={1}
                value={shown}
                aria-label={`${question.title} rating`}
                aria-valuetext={rated ? `${shown} — ${VALUE_LABELS[question.key]?.[shown]}` : "Not yet rated"}
                onChange={(event) =>
                  update({
                    [question.key]: Number(event.target.value)
                  } as unknown as Partial<RatingState>)
                }
                // Clicking the handle without moving it still counts as a choice.
                onPointerUp={() => {
                  if (!rated) {
                    update({ [question.key]: shown } as unknown as Partial<RatingState>);
                  }
                }}
              />

              <div className="rating-slider-readout">
                {SCALE.map((n) => (
                  <span
                    key={n}
                    className={cn("slider-tick", rated && shown === n && "active")}
                  >
                    {n}
                  </span>
                ))}
              </div>

              <div className="slider-value-label">
                {rated ? VALUE_LABELS[question.key]?.[shown] : "Not yet rated — drag or click to score"}
              </div>
            </div>

            <div className="slider-anchors">
              <span className="slider-end-label">{question.low}</span>
              <span className="slider-end-label slider-end-right">{question.high}</span>
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
