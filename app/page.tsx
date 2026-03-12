import { redirect } from "next/navigation";
import { SectionCards } from "@/components/section-cards";
import { buildSectionProgress } from "@/lib/review-flow";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
    .eq("user_id", user.id);

  const sectionsWithProgress = buildSectionProgress(sections ?? [], cases ?? [], ratings ?? []);

  return (
    <>
      <section className="hero">
        <div className="eyebrow">Modified Delphi review</div>
        <h2>Choose a section and continue your review.</h2>
        <p>Rate each case on four 1 to 7 scales, leave context where needed, and move quickly through the queue with autosave and persistent progress.</p>
      </section>
      <SectionCards sections={sectionsWithProgress} />
    </>
  );
}
