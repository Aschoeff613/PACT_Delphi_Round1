import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReviewerSession } from "@/lib/reviewer-session";

function csvCell(value: unknown) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await getReviewerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.reviewer.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ratings")
    .select(`
      id,
      reviewer_id,
      case_id,
      risk_severity,
      cognitive_complexity,
      performance_variability,
      ai_relevance,
      comment,
      marked_for_discussion,
      completed_at,
      updated_at,
      cases(title, section_id),
      reviewers!ratings_reviewer_id_fkey(code, display_name, last_name, email, institution, title)
    `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    "rating_id",
    "reviewer_id",
    "reviewer_code",
    "display_name",
    "last_name",
    "email",
    "institution",
    "title",
    "case_id",
    "case_title",
    "section_id",
    "risk_severity",
    "cognitive_complexity",
    "performance_variability",
    "ai_relevance",
    "comment",
    "marked_for_discussion",
    "completed_at",
    "updated_at"
  ];

  const rows = (data ?? []).map((row: any) => [
    row.id,
    row.reviewer_id,
    row.reviewers?.code ?? "",
    row.reviewers?.display_name ?? "",
    row.reviewers?.last_name ?? "",
    row.reviewers?.email ?? "",
    row.reviewers?.institution ?? "",
    row.reviewers?.title ?? "",
    row.case_id,
    row.cases?.title ?? "",
    row.cases?.section_id ?? "",
    row.risk_severity ?? "",
    row.cognitive_complexity ?? "",
    row.performance_variability ?? "",
    row.ai_relevance ?? "",
    JSON.stringify(row.comment ?? ""),
    row.marked_for_discussion,
    row.completed_at ?? "",
    row.updated_at ?? ""
  ]);

  const csv = [headers, ...rows]
    .map((cols) => cols.map((cell) => csvCell(cell)).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=expert-case-ratings.csv"
    }
  });
}
