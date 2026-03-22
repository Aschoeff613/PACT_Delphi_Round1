"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RatingState = {
  risk_severity: number | null;
  cognitive_complexity: number | null;
  performance_variability: number | null;
  ai_relevance: number | null;
  comment: string;
  marked_for_discussion: boolean;
};

const questions = [
  {
    key: "risk_severity",
    title: "Risk Severity",
    help: "How much patient harm could result if this task is performed poorly?",
    low: "Errors cause minimal or easily reversible harm",
    high: "Errors can cause death or permanent disability"
  },
  {
    key: "cognitive_complexity",
    title: "Cognitive Complexity",
    help: "How much synthesis, ambiguity, and cognitive load does this task demand?",
    low: "Single data source, clear guidelines, low ambiguity",
    high: "Multiple competing data sources, high ambiguity, severe time pressure"
  },
  {
    key: "performance_variability",
    title: "Performance Variability",
    help: "How much does physician performance on this task vary across clinicians and settings?",
    low: "Physicians converge on same decision >90% of the time",
    high: "Wide practice variation; reasonable physicians frequently disagree"
  },
  {
    key: "ai_relevance",
    title: "AI Relevance",
    help: "Does this task involve information processing that an LLM could plausibly assist with?",
    low: "Primarily physical/ procedural; LLM unlikely to help",
    high: "Core information synthesis/ retrieval where LLMs have demonstrated capability"
  }
] as const;

function selectionLabel(value: number | null) {
  if (value === null) return "Not yet rated";
  if (value === 1) return "Very Low";
  if (value === 2) return "Low";
  if (value === 3) return "Moderate-Low";
  if (value === 4) return "Moderate-High";
  if (value === 5) return "High";
  return "Very High";
}

export function ReviewPanel({
  caseId,
  initial,
  previousHref,
  nextHref,
  mergeReviewHref
}: {
  caseId: string;
  initial: RatingState;
  previousHref: string | null;
  nextHref: string | null;
  mergeReviewHref: string | null;
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
      state.risk_severity,
      state.cognitive_complexity,
      state.performance_variability,
      state.ai_relevance
    ].every((value) => value !== null);
  }, [state]);
  const answeredCount = useMemo(() => {
    return [
      state.risk_severity,
      state.cognitive_complexity,
      state.performance_variability,
      state.ai_relevance
    ].filter((value) => value !== null).length;
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
      <div className="panel-header">
        <div>
          <div className="eyebrow">Structured rating</div>
          <h2>Cognitive task scoring</h2>
        </div>
        <span className={cn("save-state", status)}>{status === "saved" ? `Saved ${savedAt}` : status === "saving" ? "Saving..." : status === "error" ? "Save failed" : ""}</span>
      </div>

      <div className="completion-banner">
        <strong>{isCompleted ? "Completed" : "In progress"}</strong>
        <span>{answeredCount} of 4 scales answered</span>
        <span>{isCompleted ? "Case complete. You can move to the next case or revise any score." : "A case is complete when all four ratings are selected."}</span>
      </div>

      {questions.map((question) => (
        <div key={question.key} className="likert-block">
          <div className="likert-copy">
            <h3>{question.title}</h3>
            <p>{question.help}</p>
          </div>
          <div className="slider-track-wrap slider-track-wrap--full">
            <input
              type="range"
              min={1}
              max={6}
              step={0.5}
              value={state[question.key] ?? 3.5}
              className={cn("rating-slider", state[question.key] === null && "unset")}
              onChange={(e) => {
                const val = Math.round(Number(e.target.value));
                update({ [question.key]: val as Partial<RatingState>[typeof question.key] } as Partial<RatingState>);
              }}
            />
            <div className="slider-ticks">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <span key={n} className={cn("slider-tick", state[question.key] === n && "active")}>{n}</span>
              ))}
            </div>
            <div className="slider-anchors">
              <span className="slider-end-label">{question.low}</span>
              <span className="slider-end-label slider-end-right">{question.high}</span>
            </div>
          </div>
          <div className="selection-note">
            {state[question.key] !== null ? `${state[question.key]} — ${selectionLabel(state[question.key])}` : "Not yet rated"}
          </div>
        </div>
      ))}

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
        <span>Mark for discussion in the follow-up round</span>
      </label>

      <div className="panel-nav-actions">
        {previousHref ? (
          <Link className="ghost-button" href={previousHref}>
            Previous case
          </Link>
        ) : (
          <span />
        )}

        {nextHref ? (
          isCompleted ? (
            <Link className="primary-button" href={nextHref}>
              Next case
            </Link>
          ) : (
            <div className="panel-next-blocked">
              <span className="primary-button button-disabled">Next case</span>
              <span className="case-nav-hint">Complete all four scores before moving on.</span>
            </div>
          )
        ) : mergeReviewHref ? (
          isCompleted ? (
            <Link className="primary-button" href={mergeReviewHref}>
              Section merge review
            </Link>
          ) : (
            <div className="panel-next-blocked">
              <span className="primary-button button-disabled">Section merge review</span>
              <span className="case-nav-hint">Complete all four scores before moving on.</span>
            </div>
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
