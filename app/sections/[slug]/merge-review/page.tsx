import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MergeReviewForm } from "@/components/merge-review-form";
import { SECTION_ORDER, buildSectionProgress } from "@/lib/review-flow";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";

type MergeReviewPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function MergeReviewPage({ params }: MergeReviewPageProps) {
  const { slug } = await params;
  const session = await getReviewerSession();

  if (!session) {
    redirect(`/login?redirectTo=/sections/${slug}/merge-review`);
  }

  const supabase = createAdminClient();

  const [{ data: sections }, { data: cases }, { data: ratings }] = await Promise.all([
    supabase.from("sections").select("id, slug, name, description"),
    supabase.from("cases").select("id, section_id, title, order_index").order("order_index"),
    supabase
      .from("ratings")
      .select("case_id, risk_severity, cognitive_complexity, performance_variability, ai_relevance")
      .eq("reviewer_id", session.reviewer.id)
  ]);

  const sectionsWithProgress = buildSectionProgress(sections ?? [], cases ?? [], ratings ?? []);
  const section = sectionsWithProgress.find((item) => item.slug === slug);
  if (!section) notFound();

  if (section.progress.total === 0 || section.progress.completed !== section.progress.total) {
    redirect(`/sections/${slug}`);
  }

  const rawSection = (sections ?? []).find((item) => item.slug === slug);
  if (!rawSection) notFound();

  const [{ data: feedback }, { data: mergeSelections }] = await Promise.all([
    supabase
      .from("post_review_feedback")
      .select("merge_notes")
      .eq("reviewer_id", session.reviewer.id)
      .eq("section_id", rawSection.id)
      .maybeSingle(),
    supabase
      .from("case_merge_feedback")
      .select("source_case_id, decision, target_case_id")
      .eq("reviewer_id", session.reviewer.id)
      .eq("section_id", rawSection.id)
  ]);

  const sectionCases = (cases ?? []).filter((item) => item.section_id === rawSection.id);
  const sectionOrderIndex = SECTION_ORDER.indexOf(slug as (typeof SECTION_ORDER)[number]);
  const nextSection = sectionsWithProgress.find((item) => SECTION_ORDER.indexOf(item.slug as (typeof SECTION_ORDER)[number]) === sectionOrderIndex + 1);
  const continueHref = nextSection ? `/sections/${nextSection.slug}` : "/";
  const continueLabel = nextSection ? `Continue to ${nextSection.name}` : "Back to sections";

  return (
    <div className="merge-review-shell">
      <div className="eyebrow">Section follow-up</div>
      <h2>{section.name} overlap review</h2>
      <p>Before moving on, note any cases in this section that feel duplicative, overly close in scope, or better merged together.</p>

      <MergeReviewForm
        sectionSlug={slug}
        cases={sectionCases}
        initialSelections={mergeSelections ?? []}
        initialNotes={feedback?.merge_notes ?? ""}
        continueHref={continueHref}
        continueLabel={continueLabel}
      />

      <Link href={`/sections/${slug}`} className="ghost-button">Back to section</Link>
    </div>
  );
}
