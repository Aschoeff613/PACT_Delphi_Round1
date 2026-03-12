import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReviewPanel } from "@/components/review-panel";
import { ReviewProgress } from "@/components/review-progress";
import { ReviewSidebar } from "@/components/review-sidebar";
import { buildSectionProgress } from "@/lib/review-flow";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { caseStatus, completionCount } from "@/lib/utils";

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
    supabase.from("cases").select("id, section_id, title, scenario, task_definition, order_index").order("order_index"),
    supabase
      .from("ratings")
      .select("id, case_id, risk_severity, cognitive_complexity, performance_variability, ai_relevance, comment, marked_for_discussion")
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
  const sectionComplete = navCases.length > 0 && completionCount(navCases) === navCases.length;

  return (
    <>
      <div className="review-progress-bar">
        <ReviewProgress completed={completionCount(navCases)} total={navCases.length} />
      </div>
      <div className="review-layout">
        <ReviewSidebar sectionSlug={section.slug} cases={navCases} activeCaseId={activeCase.id} />

        <main className="review-case-card">
          <div className="review-case-header">
            <div>
              <div className="eyebrow">{section.name}</div>
              <h1>{activeCase.title}</h1>
            </div>
            <div className="review-case-meta">
              <span className="meta-pill">Case {activeIndex + 1} of {cases.length}</span>
              <span className={`meta-pill status-${activeStatus}`}>{activeStatus === "not_started" ? "Not started" : activeStatus === "in_progress" ? "In progress" : "Completed"}</span>
            </div>
          </div>
          <section className="review-instructions">
            <h2>How to rate this case</h2>
            <p>Read the vignette below, then rate this case on risk severity, cognitive complexity, performance variability, and AI relevance.</p>
          </section>
          <div className="review-copy">
            <section>
              <h2>Scenario</h2>
              <p className="body-block">{activeCase.scenario}</p>
            </section>

            <section>
              <h2>Clinical task being judged</h2>
              <p className="body-block">{activeCase.task_definition}</p>
            </section>
          </div>

          <div className="case-nav-actions">
            {previousCase ? (
              <Link className="ghost-button" href={`/sections/${slug}?case=${previousCase.id}`}>
                Previous case
              </Link>
            ) : <span />}
            <span />
          </div>
        </main>

        <ReviewPanel
          caseId={activeCase.id}
          initial={{
            risk_severity: activeRating?.risk_severity ?? null,
            cognitive_complexity: activeRating?.cognitive_complexity ?? null,
            performance_variability: activeRating?.performance_variability ?? null,
            ai_relevance: activeRating?.ai_relevance ?? null,
            comment: activeRating?.comment ?? "",
            marked_for_discussion: activeRating?.marked_for_discussion ?? false
          }}
          previousHref={previousCase ? `/sections/${slug}?case=${previousCase.id}` : null}
          nextHref={nextCase ? `/sections/${slug}?case=${nextCase.id}` : null}
          mergeReviewHref={!nextCase && sectionComplete ? `/sections/${slug}/merge-review` : null}
        />
      </div>
    </>
  );
}
