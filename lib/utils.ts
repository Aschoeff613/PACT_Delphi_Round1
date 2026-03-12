export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function caseStatus(rating?: {
  risk_severity: number | null;
  cognitive_complexity: number | null;
  performance_variability: number | null;
  ai_relevance: number | null;
} | null): "not_started" | "in_progress" | "completed" {
  if (!rating) return "not_started";
  const values = [
    rating.risk_severity,
    rating.cognitive_complexity,
    rating.performance_variability,
    rating.ai_relevance
  ];
  const answered = values.filter((value) => value !== null).length;
  if (answered === 0) return "not_started";
  if (answered === 4) return "completed";
  return "in_progress";
}

export function completionCount<T extends { status: string }>(items: T[]) {
  return items.filter((item) => item.status === "completed").length;
}
