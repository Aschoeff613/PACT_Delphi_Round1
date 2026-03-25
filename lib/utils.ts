export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function caseStatus(rating?: {
  clinical_relevance: number | null;
  performance_variability: number | null;
  ai_relevance: number | null;
} | null): "not_started" | "in_progress" | "completed" {
  if (!rating) return "not_started";
  const values = [
    rating.clinical_relevance,
    rating.performance_variability,
    rating.ai_relevance
  ];
  const answered = values.filter((value) => value !== null).length;
  if (answered === 0) return "not_started";
  if (answered === 3) return "completed";
  return "in_progress";
}

export function completionCount<T extends { status: string }>(items: T[]) {
  return items.filter((item) => item.status === "completed").length;
}
