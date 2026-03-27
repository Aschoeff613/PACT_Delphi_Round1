import { redirect } from "next/navigation";
import { CompletionBanner } from "@/components/completion-banner";
import { SectionCards } from "@/components/section-cards";
import { buildSectionProgress } from "@/lib/review-flow";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function HomePage() {
  const session = await getReviewerSession();

  if (!session) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  const { data: sections } = await supabase
    .from("sections")
    .select("id, slug, name, description")
    .order("name");

  const { data: cases } = await supabase
    .from("cases")
    .select("id, section_id");

  const { data: ratings } = await supabase
    .from("ratings")
    .select("case_id, clinical_relevance, performance_variability, ai_relevance")
    .eq("reviewer_id", session.reviewer.id);

  const sectionsWithProgress = buildSectionProgress(sections ?? [], cases ?? [], ratings ?? []);
  const allComplete = sectionsWithProgress.length > 0 && sectionsWithProgress.every(
    (s) => s.progress.total > 0 && s.progress.completed === s.progress.total
  );

  return (
    <>
      {allComplete ? <CompletionBanner /> : null}
      <section className="hero">
        <p className="hero-tagline">A benchmark for physician-AI teaming in high-stakes clinical tasks.</p>
        <p><strong>Instructions:</strong></p>
        <ul className="hero-instructions">
          <li>For each task, read the cognitive task description, review the example scenarios, then answer 3 rating questions</li>
          <li>Complete each section in order — the next section will unlock in the coming weeks after a group review</li>
          <li>For each task, rate all three scales from 1 to 5</li>
          <li>Add optional comments for context on any rating</li>
          <li>Your progress autosaves as you go</li>
          <li>Estimated time to complete: 15 minutes</li>
        </ul>
      </section>
      <SectionCards sections={sectionsWithProgress} />
    </>
  );
}
