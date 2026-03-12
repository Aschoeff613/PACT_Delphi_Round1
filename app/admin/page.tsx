import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const admin = createAdminClient();
  const [{ count: ratingsCount }, { count: completedCount }, { count: sectionCount }] = await Promise.all([
    admin.from("ratings").select("*", { count: "exact", head: true }),
    admin.from("ratings").select("*", { count: "exact", head: true }).not("completed_at", "is", null),
    admin.from("sections").select("*", { count: "exact", head: true })
  ]);

  const { data: sectionStatusRows } = await admin.rpc("section_completion_summary");

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
