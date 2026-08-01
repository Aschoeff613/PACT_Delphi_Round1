import { caseStatus } from "@/lib/utils";
import type { Section } from "@/lib/types";

export const SECTION_ORDER = ["management", "diagnostic", "communication"] as const;

type CaseLite = {
  id: string;
  section_id: string;
};

type RatingLite = {
  case_id: string;
  clinical_relevance: number | null;
  benchmarkability: number | null;
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

    // All three domains are open from the start — reviewers may work
    // Management, Diagnostic Reasoning, and Communication in any order.
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
