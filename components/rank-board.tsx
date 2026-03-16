"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { DimensionSlug } from "@/app/sections/[slug]/rank/[dimension]/page";
import { cn } from "@/lib/utils";

type CaseItem = {
  id: string;
  title: string;
  task_definition: string;
};

type RatingRow = {
  risk_severity: number | null;
  cognitive_complexity: number | null;
  performance_variability: number | null;
  ai_relevance: number | null;
  comment?: string | null;
  marked_for_discussion?: boolean;
};

type Props = {
  sectionSlug: string;
  dimension: DimensionSlug;
  dimKey: keyof Pick<RatingRow, "risk_severity" | "cognitive_complexity" | "performance_variability" | "ai_relevance">;
  cases: CaseItem[];
  initialRatings: Record<string, RatingRow>;
  nextDimHref: string;
  nextDimLabel: string;
  prevDimHref: string | null;
};

function rankToValue(rank: number, total: number): number {
  // rank 1 = highest = 6, rank N = lowest = 1
  // maps linearly: value = round(6 - (rank - 1) * 5 / (total - 1))
  if (total === 1) return 6;
  return Math.round(6 - ((rank - 1) * 5) / (total - 1));
}

export function RankBoard({
  sectionSlug,
  dimension,
  dimKey,
  cases: initialCases,
  initialRatings,
  nextDimHref,
  nextDimLabel,
  prevDimHref,
}: Props) {
  const [items, setItems] = useState<CaseItem[]>(initialCases);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverIndex.current = index;
    if (dragIndex.current === null || dragIndex.current === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex.current!, 1);
      next.splice(index, 0, moved);
      dragIndex.current = index;
      return next;
    });
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  const save = useCallback(async () => {
    setStatus("saving");
    const total = items.length;

    const results = await Promise.all(
      items.map((item, i) => {
        const rank = i + 1;
        const value = rankToValue(rank, total);
        const existing = initialRatings[item.id] ?? {};
        return fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: item.id,
            risk_severity: existing.risk_severity ?? null,
            cognitive_complexity: existing.cognitive_complexity ?? null,
            performance_variability: existing.performance_variability ?? null,
            ai_relevance: existing.ai_relevance ?? null,
            comment: existing.comment ?? "",
            marked_for_discussion: existing.marked_for_discussion ?? false,
            [dimKey]: value,
          }),
        });
      })
    );

    if (results.every((r) => r.ok)) {
      setStatus("saved");
      setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    } else {
      setStatus("error");
    }
  }, [items, dimKey, initialRatings]);

  return (
    <div className="rank-board-wrap">
      <div className="rank-board-meta">
        <span className="rank-board-hint">Drag tasks to reorder — top = highest, bottom = lowest. Scores are assigned automatically when you save.</span>
        <div className="rank-save-row">
          <span className={cn("save-state", status)}>
            {status === "saved" ? `Saved ${savedAt}` : status === "saving" ? "Saving..." : status === "error" ? "Save failed" : ""}
          </span>
          <button className="primary-button" onClick={save} disabled={status === "saving"}>
            Save ranking
          </button>
        </div>
      </div>

      <ol className="rank-list">
        {items.map((item, i) => {
          const value = rankToValue(i + 1, items.length);
          return (
            <li
              key={item.id}
              className="rank-item"
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="rank-position">
                <span className="rank-number">{i + 1}</span>
                <span className="rank-value-badge">→ {value}</span>
              </div>
              <div className="rank-item-body">
                <div className="rank-item-title">{item.title}</div>
                <div className="rank-item-task">{item.task_definition}</div>
              </div>
              <div className="rank-drag-handle" aria-hidden>⠿</div>
            </li>
          );
        })}
      </ol>

      <div className="rank-footer-nav">
        {prevDimHref ? (
          <Link href={prevDimHref} className="ghost-button">← Previous</Link>
        ) : <span />}
        <button className="primary-button" onClick={async () => { await save(); window.location.href = nextDimHref; }}>
          Save & continue →
        </button>
      </div>
    </div>
  );
}
