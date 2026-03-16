import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { RankBoard } from "@/components/rank-board";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";

export const DIMENSIONS = {
  "risk-severity": {
    key: "risk_severity" as const,
    label: "Risk Severity",
    description: "How much harm could result if this task is performed poorly?",
    low: "Minimal harm",
    high: "Severe harm / mortality risk",
  },
  "cognitive-complexity": {
    key: "cognitive_complexity" as const,
    label: "Cognitive Complexity",
    description: "How much synthesis, judgment, and pressure does this task require?",
    low: "Straightforward",
    high: "Highly complex, multi-source reasoning",
  },
  "performance-variability": {
    key: "performance_variability" as const,
    label: "Performance Variability",
    description: "How much would performance vary across clinicians or settings?",
    low: "Consistent across clinicians",
    high: "Highly variable across clinicians",
  },
  "ai-relevance": {
    key: "ai_relevance" as const,
    label: "AI Relevance",
    description: "How plausible is meaningful LLM support for this task?",
    low: "Little plausible LLM support",
    high: "Strong plausible LLM support",
  },
} as const;

export type DimensionSlug = keyof typeof DIMENSIONS;
const DIMENSION_ORDER: DimensionSlug[] = ["risk-severity", "cognitive-complexity", "performance-variability", "ai-relevance"];

type RankPageProps = {
  params: Promise<{ slug: string; dimension: string }>;
};

export default async function RankPage({ params }: RankPageProps) {
  const { slug, dimension } = await params;
  const session = await getReviewerSession();

  if (!session) {
    redirect(`/login?redirectTo=/sections/${slug}/rank/${dimension}`);
  }

  if (!(dimension in DIMENSIONS)) notFound();
  const dim = DIMENSIONS[dimension as DimensionSlug];

  const supabase = createAdminClient();
  const [{ data: sections }, { data: allCases }, { data: allRatings }] = await Promise.all([
    supabase.from("sections").select("id, name, slug"),
    supabase.from("cases").select("id, section_id, title, task_definition, order_index").order("order_index"),
    supabase
      .from("ratings")
      .select("case_id, risk_severity, cognitive_complexity, performance_variability, ai_relevance, comment, marked_for_discussion")
      .eq("reviewer_id", session.reviewer.id),
  ]);

  const section = (sections ?? []).find((s) => s.slug === slug);
  if (!section) notFound();

  const cases = (allCases ?? []).filter((c) => c.section_id === section.id);
  if (!cases.length) notFound();

  const ratingsByCase = new Map((allRatings ?? []).map((r) => [r.case_id, r]));

  const currentDimIndex = DIMENSION_ORDER.indexOf(dimension as DimensionSlug);
  const nextDim = DIMENSION_ORDER[currentDimIndex + 1] ?? null;
  const prevDim = DIMENSION_ORDER[currentDimIndex - 1] ?? null;

  const initialOrder = [...cases].sort((a, b) => {
    const ra = ratingsByCase.get(a.id)?.[dim.key] ?? null;
    const rb = ratingsByCase.get(b.id)?.[dim.key] ?? null;
    if (ra !== null && rb !== null) return rb - ra;
    if (ra !== null) return -1;
    if (rb !== null) return 1;
    return 0;
  });

  const initialRatings = Object.fromEntries(
    (allRatings ?? []).map((r) => [r.case_id, r])
  );

  return (
    <div className="rank-shell">
      <div className="rank-header">
        <div>
          <div className="eyebrow">{section.name} · Ranking view</div>
          <h1>{dim.label}</h1>
          <p className="rank-description">{dim.description}</p>
          <div className="rank-scale-labels">
            <span>1 — {dim.low}</span>
            <span>6 — {dim.high}</span>
          </div>
        </div>
        <Link href={`/sections/${slug}`} className="ghost-button">
          Case-by-case view
        </Link>
      </div>

      <nav className="rank-dim-nav">
        {DIMENSION_ORDER.map((d) => (
          <Link
            key={d}
            href={`/sections/${slug}/rank/${d}`}
            className={`rank-dim-tab${d === dimension ? " active" : ""}`}
          >
            {DIMENSIONS[d].label}
          </Link>
        ))}
      </nav>

      <RankBoard
        sectionSlug={slug}
        dimension={dimension as DimensionSlug}
        dimKey={dim.key}
        cases={initialOrder.map((c) => ({
          id: c.id,
          title: c.title,
          task_definition: c.task_definition,
        }))}
        initialRatings={initialRatings}
        nextDimHref={nextDim ? `/sections/${slug}/rank/${nextDim}` : `/sections/${slug}`}
        nextDimLabel={nextDim ? DIMENSIONS[nextDim].label : "Back to section"}
        prevDimHref={prevDim ? `/sections/${slug}/rank/${prevDim}` : null}
      />
    </div>
  );
}
