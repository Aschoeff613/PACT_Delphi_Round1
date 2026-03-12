import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: unknown) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ratings")
    .select(`
      id,
      user_id,
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
      profiles!ratings_user_id_fkey(email, display_name)
    `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    "rating_id",
    "user_id",
    "email",
    "display_name",
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
    row.user_id,
    row.profiles?.email ?? "",
    row.profiles?.display_name ?? "",
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
