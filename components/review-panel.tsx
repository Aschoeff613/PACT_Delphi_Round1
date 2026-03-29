"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RatingState = {
  clinical_relevance: number | null;
  performance_variability: number | null;
  ai_relevance: number | null;
  comment: string;
  marked_for_discussion: boolean;
};

const questions = [
  {
    key: "clinical_relevance",
    title: "Clinical Relevance",
    help: "How relevant and important is this clinical task to patient outcomes and care quality?",
    low: "Minimal impact on patient outcomes; rarely encountered",
    high: "Critical to patient safety; routinely encountered in practice"
  },
  {
    key: "performance_variability",
    title: "Practice Variability (Saturation)",
    help: "How much do providers vary in their performance on this task?",
    low: "Providers converge on the same approach with near-universal accuracy",
    high: "Wide practice variation; reasonable clinicians frequently disagree or diverge"
  },
  {
    key: "ai_relevance",
    title: "AI Augmentation Potential",
    help: "Could AI (including ML, LLMs, agents, etc.) meaningfully augment this task?",
    low: "Task requires judgment AI cannot meaningfully replicate",
    high: "Core information synthesis, pattern recognition, or retrieval where AI has demonstrated capability"
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
      state.performance_variability,
      state.ai_relevance
    ].every((value) => value !== null);
  }, [state]);
  const answeredCount = useMemo(() => {
    return [
      state.clinical_relevance,
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
          <h2>Rate this Task</h2>
        </div>
        <span className={cn("save-state", status)}>{status === "saved" ? `Saved ${savedAt}` : status === "saving" ? "Saving..." : status === "error" ? "Save failed" : ""}</span>
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
              max={5}
              step={0.5}
              value={state[question.key] ?? 3}
              className={cn("rating-slider", state[question.key] === null && "unset")}
              onChange={(e) => {
                const val = Math.round(Number(e.target.value));
                update({ [question.key]: val as Partial<RatingState>[typeof question.key] } as Partial<RatingState>);
              }}
            />
            <div className="slider-ticks">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={cn("slider-tick", state[question.key] === n && "active")}>{n}</span>
              ))}
            </div>
            <div className="slider-anchors">
              <span className="slider-end-label">{question.low}</span>
              <span className="slider-end-label slider-end-right">{question.high}</span>
            </div>
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
        <span>Flag for panel discussion</span>
      </label>

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
              <span className="case-nav-hint">Complete all three scores before moving on.</span>
              <span className="primary-button button-disabled">Next case</span>
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
