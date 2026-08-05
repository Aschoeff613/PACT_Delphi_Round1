import { caseStatus } from "@/lib/utils";
import type { Section } from "@/lib/types";

// One section holds all 17 V6 constructs (migration 023). The former
// management / diagnostic / communication split was dropped because the V6
// taxonomy cuts across those categories.
export const SECTION_ORDER = ["all-tasks"] as const;

type CaseLite = {
  id: string;
  section_id: string;
};

type RatingLite = {
  case_id: string;
  clinical_relevance: number | null;
  performance_variance: number | null;
  ai_relevance: number | null;
};

export function buildSectionProgress(
  sections: Section[],
  cases: CaseLite[],
  ratings: RatingLite[]
) {
  const ratingsByCase = new Map(ratings.map((rating) => [rating.case_id, rating]));
  const casesBySection = new Map<string, CaseLite[]>();

  for (const item of cases) {
    const bucket = casesBySection.get(item.section_id) ?? [];
    bucket.push(item);
    casesBySection.set(item.section_id, bucket);
  }

  const sortedSections = [...sections].sort(
    (left, right) => SECTION_ORDER.indexOf(left.slug as (typeof SECTION_ORDER)[number]) - SECTION_ORDER.indexOf(right.slug as (typeof SECTION_ORDER)[number])
  );

  return sortedSections.map((section) => {
    const sectionCases = casesBySection.get(section.id) ?? [];
    const completed = sectionCases.filter((item) => caseStatus(ratingsByCase.get(item.id) ?? null) === "completed").length;
    const total = sectionCases.length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Nothing is gated: there is a single section, and tasks within it may be
    // rated in any order.
    const locked = false;

    return {
      ...section,
      progress: {
        completed,
        total,
        percentage
      },
      locked
    };
  });
}

export function allReviewComplete(
  sectionsWithProgress: Array<{
    progress: { completed: number; total: number };
  }>
) {
  return sectionsWithProgress.length > 0 && sectionsWithProgress.every((section) => section.progress.total > 0 && section.progress.completed === section.progress.total);
}
