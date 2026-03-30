import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReviewerSession } from "@/lib/reviewer-session";
import { caseStatus } from "@/lib/utils";

export default async function AdminPage() {
  const session = await getReviewerSession();

  if (!session) redirect("/login?redirectTo=/admin");
  if (session.reviewer.role !== "admin") {
    redirect("/");
  }

  const admin = createAdminClient();
  const [{ data: reviewers }, { data: sections }, { data: cases }, { data: ratings }] = await Promise.all([
    admin.from("reviewers").select("id"),
    admin.from("sections").select("id, name"),
    admin.from("cases").select("id, section_id"),
    admin.from("ratings").select("reviewer_id, case_id, clinical_relevance, performance_gap, ai_relevance, completed_at")
  ]);

  const ratingsCount = (ratings ?? []).length;
  const completedCount = (ratings ?? []).filter((row) => row.completed_at !== null).length;
  const sectionCount = (sections ?? []).length;
  const ratingsByReviewerCase = new Map((ratings ?? []).map((row) => [`${row.reviewer_id}:${row.case_id}`, row]));
  const sectionStatusRows = (sections ?? []).map((section) => {
    const sectionCases = (cases ?? []).filter((item) => item.section_id === section.id);
    let notStartedCount = 0;
    let inProgressCount = 0;
    let completedCaseCount = 0;

    for (const reviewer of reviewers ?? []) {
      for (const sectionCase of sectionCases) {
        const rating = ratingsByReviewerCase.get(`${reviewer.id}:${sectionCase.id}`);
        const status = caseStatus(rating ?? null);
        if (status === "not_started") notStartedCount += 1;
        if (status === "in_progress") inProgressCount += 1;
        if (status === "completed") completedCaseCount += 1;
      }
    }

    return {
      section_name: section.name,
      not_started_count: notStartedCount,
      in_progress_count: inProgressCount,
      completed_count: completedCaseCount
    };
  });

  return (
    <div className="admin-panel">
      <div className="eyebrow">Research administration</div>
      <h2>Admin dashboard</h2>
      <p>Review completion counts and export all structured ratings for downstream analysis.</p>

      <div className="admin-grid">
        <div className="stat-card">
          <div className="eyebrow">Ratings</div>
          <strong>{ratingsCount ?? 0}</strong>
        </div>
        <div className="stat-card">
          <div className="eyebrow">Completed</div>
          <strong>{completedCount ?? 0}</strong>
        </div>
        <div className="stat-card">
          <div className="eyebrow">Sections</div>
          <strong>{sectionCount ?? 0}</strong>
        </div>
      </div>

      <Link href="/api/admin/export" className="primary-button">Export ratings CSV</Link>

      <h3>Completion by section</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Not started</th>
              <th>In progress</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {(sectionStatusRows ?? []).map((row: any) => (
              <tr key={row.section_name}>
                <td>{row.section_name}</td>
                <td>{row.not_started_count}</td>
                <td>{row.in_progress_count}</td>
                <td>{row.completed_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
