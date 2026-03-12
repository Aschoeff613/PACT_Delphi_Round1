import { NextResponse } from "next/server";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";

type Payload = {
  caseId: string;
  risk_severity: number | null;
  cognitive_complexity: number | null;
  performance_variability: number | null;
  ai_relevance: number | null;
  comment: string;
  marked_for_discussion: boolean;
};

export async function POST(request: Request) {
  const session = await getReviewerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.reviewer.locked_at) {
    return NextResponse.json({ error: "Reviewer is locked" }, { status: 403 });
  }

  const payload = (await request.json()) as Payload;
  const isComplete = [
    payload.risk_severity,
    payload.cognitive_complexity,
    payload.performance_variability,
    payload.ai_relevance
  ].every((value) => value !== null);

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("save_reviewer_rating", {
    p_reviewer_id: session.reviewer.id,
    p_case_id: payload.caseId,
    p_risk_severity: payload.risk_severity,
    p_cognitive_complexity: payload.cognitive_complexity,
    p_performance_variability: payload.performance_variability,
    p_ai_relevance: payload.ai_relevance,
    p_comment: payload.comment || null,
    p_marked_for_discussion: payload.marked_for_discussion,
    p_completed_at: isComplete ? new Date().toISOString() : null
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
