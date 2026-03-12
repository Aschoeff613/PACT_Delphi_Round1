import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Payload;
  const isComplete = [
    payload.risk_severity,
    payload.cognitive_complexity,
    payload.performance_variability,
    payload.ai_relevance
  ].every((value) => value !== null);

  const { error } = await supabase.from("ratings").upsert(
    {
      user_id: user.id,
      case_id: payload.caseId,
      risk_severity: payload.risk_severity,
      cognitive_complexity: payload.cognitive_complexity,
      performance_variability: payload.performance_variability,
      ai_relevance: payload.ai_relevance,
      comment: payload.comment || null,
      marked_for_discussion: payload.marked_for_discussion,
      completed_at: isComplete ? new Date().toISOString() : null
    },
    { onConflict: "user_id,case_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
