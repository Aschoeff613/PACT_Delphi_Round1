import { redirect } from "next/navigation";
import { SectionCards } from "@/components/section-cards";
import { buildSectionProgress } from "@/lib/review-flow";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";

type HomePageProps = {
  searchParams: Promise<{ welcomeCode?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getReviewerSession();
  const params = await searchParams;

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
    .select("case_id, risk_severity, cognitive_complexity, performance_variability, ai_relevance")
    .eq("reviewer_id", session.reviewer.id);

  const sectionsWithProgress = buildSectionProgress(sections ?? [], cases ?? [], ratings ?? []);

  return (
    <>
      {params.welcomeCode ? (
        <section className="success-banner">
          <strong>Reviewer code created:</strong> {params.welcomeCode}. Save this code and reuse it with your last name when you return.
        </section>
      ) : null}
      <section className="hero">
        <div className="eyebrow">Modified Delphi review</div>
        <h2>Choose a section and continue your review.</h2>
        <p>Rate each case on four 1 to 7 scales, leave context where needed, and move quickly through the queue with autosave and persistent progress.</p>
      </section>
      <SectionCards sections={sectionsWithProgress} />
    </>
  );
}
