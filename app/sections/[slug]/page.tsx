import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReviewPanel } from "@/components/review-panel";
import { ReviewProgress } from "@/components/review-progress";
import { ReviewSidebar } from "@/components/review-sidebar";
import { SectionTimer } from "@/components/section-timer";
import { getCaseContent } from "@/lib/case-content";
import { buildSectionProgress } from "@/lib/review-flow";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { caseStatus, completionCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SectionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ case?: string }>;
};

export default async function SectionPage({ params, searchParams }: SectionPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await getReviewerSession();

  if (!session) {
    redirect(`/login?redirectTo=/sections/${slug}`);
  }

  const supabase = createAdminClient();

  const [{ data: sections }, { data: allCases }, { data: allRatings }] = await Promise.all([
    supabase.from("sections").select("id, name, slug, description"),
    supabase.from("cases").select("id, section_id, title, order_index").order("order_index"),
    supabase
      .from("ratings")
      .select("id, case_id, clinical_relevance, performance_variance, ai_relevance, comment, marked_for_discussion")
      .eq("reviewer_id", session.reviewer.id)
  ]);

  const section = (sections ?? []).find((item) => item.slug === slug);

  if (!section) notFound();
  const sectionsWithProgress = buildSectionProgress(sections ?? [], allCases ?? [], allRatings ?? []);
  const requestedSection = sectionsWithProgress.find((item) => item.slug === slug);
  if (!requestedSection) notFound();
  if (requestedSection.locked) {
    const firstUnlocked = sectionsWithProgress.find((item) => !item.locked);
    redirect(firstUnlocked ? `/sections/${firstUnlocked.slug}` : "/");
  }

  const cases = (allCases ?? []).filter((item) => item.section_id === section.id);

  if (!cases?.length) notFound();
  const ratings = (allRatings ?? []).filter((rating) => cases.some((item) => item.id === rating.case_id));
  const ratingsByCase = new Map(ratings.map((rating) => [rating.case_id, rating]));
  const navCases = cases.map((item) => {
    const status = caseStatus(ratingsByCase.get(item.id) ?? null);
    return { ...item, status };
  });

  const activeCase = cases.find((item) => item.id === query.case) ?? cases[0];
  const activeIndex = cases.findIndex((item) => item.id === activeCase.id);
  const previousCase = activeIndex > 0 ? cases[activeIndex - 1] : null;
  const nextCase = activeIndex < cases.length - 1 ? cases[activeIndex + 1] : null;
  const activeRating = ratingsByCase.get(activeCase.id);
  const activeStatus = caseStatus(activeRating ?? null);

  const content = getCaseContent(slug, activeCase.order_index);

  return (
    <>
      <SectionTimer sectionId={section.id} />
      <div className="review-progress-bar">
        <ReviewProgress
          completed={completionCount(navCases)}
          total={navCases.length}
        />
      </div>
      <div className="review-layout">
        <ReviewSidebar sectionSlug={section.slug} cases={navCases} activeCaseId={activeCase.id} />

        {/* ── Step 1: Review pane ─────────────────────────────────────── */}
        <main className="review-case-card">
          <div className="review-case-header">
            <div>
              <div className="step-badge step-badge--review">Step 1 · Review cognitive task</div>
              <h1>{activeCase.title}</h1>
            </div>
            <div className="review-case-meta">
              <span className="meta-pill">Task {activeIndex + 1} of {cases.length}</span>
              {activeStatus !== "not_started" && (
                <span className={`meta-pill status-${activeStatus}`}>
                  {activeStatus === "in_progress" ? "In progress" : "Completed"}
                </span>
              )}
            </div>
          </div>

          <div className="review-copy">
            <section>
              <h2>Cognitive task</h2>
              {content.cognitive_demand && (
                <p className="task-demand">{content.cognitive_demand}</p>
              )}
              {content.guiding_question && (
                <p className="task-question">{content.guiding_question}</p>
              )}
              <p className="body-block">{content.task_definition}</p>
            </section>

            <details className="review-collapsible" open>
              <summary>
                <h2>Example cases <span className="collapsible-chevron">▶</span></h2>
              </summary>
              <div className="example-cases">
                <article className="example-case">
                  <h3 className="example-case-label">Emergency Department</h3>
                  <p className="body-block">{content.example_ed}</p>
                </article>
                <article className="example-case">
                  <h3 className="example-case-label">Primary Care</h3>
                  <p className="body-block">{content.example_primary_care}</p>
                </article>
              </div>
            </details>
          </div>
        </main>

        {/* ── Step 2: Scoring panel ────────────────────────────────────── */}
        <ReviewPanel
          caseId={activeCase.id}
          initial={{
            clinical_relevance: activeRating?.clinical_relevance ?? null,
            performance_variance: activeRating?.performance_variance ?? null,
            ai_relevance: activeRating?.ai_relevance ?? null,
            comment: activeRating?.comment ?? "",
            marked_for_discussion: activeRating?.marked_for_discussion ?? false
          }}
          previousHref={previousCase ? `/sections/${slug}?case=${previousCase.id}` : null}
          nextHref={nextCase ? `/sections/${slug}?case=${nextCase.id}` : null}
        />
      </div>
    </>
  );
}
