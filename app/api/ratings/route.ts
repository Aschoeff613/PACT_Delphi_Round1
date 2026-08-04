import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";

type Payload = {
  caseId: string;
  clinical_relevance: number | null;
  performance_variance: number | null;
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
    payload.clinical_relevance,
    payload.performance_variance,
    payload.ai_relevance
  ].every((value) => value !== null);

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("save_reviewer_rating", {
    p_reviewer_id: session.reviewer.id,
    p_case_id: payload.caseId,
    p_clinical_relevance: payload.clinical_relevance,
    p_performance_variance: payload.performance_variance,
    p_ai_relevance: payload.ai_relevance,
    p_comment: payload.comment || null,
    p_marked_for_discussion: payload.marked_for_discussion,
    p_completed_at: isComplete ? new Date().toISOString() : null
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    revalidatePath("/sections", "layout");
  } catch {
    // revalidatePath can throw in route handlers
  }

  return NextResponse.json({ ok: true });
}
