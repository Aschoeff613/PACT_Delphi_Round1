import { NextResponse } from "next/server";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";

type MergeSelection = {
  source_case_id: string;
  decision: "none" | "possible_merge";
  target_case_id: string | null;
};

type Payload = {
  section_slug: string;
  notes: string;
  selections: MergeSelection[];
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
  const supabase = createAdminClient();
  const { data: section } = await supabase
    .from("sections")
    .select("id")
    .eq("slug", payload.section_slug)
    .single();

  if (!section) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }

  for (const item of payload.selections) {
    const { error: mergeError } = await supabase.rpc("save_reviewer_merge_feedback", {
      p_reviewer_id: session.reviewer.id,
      p_section_id: section.id,
      p_source_case_id: item.source_case_id,
      p_decision: item.decision,
      p_target_case_id: item.decision === "possible_merge" ? item.target_case_id : null
    });

    if (mergeError) {
      return NextResponse.json({ error: mergeError.message }, { status: 500 });
    }
  }

  const { error: noteError } = await supabase.rpc("save_reviewer_post_review_feedback", {
    p_reviewer_id: session.reviewer.id,
    p_section_id: section.id,
    p_merge_notes: payload.notes || null
  });

  if (noteError) {
    return NextResponse.json({ error: noteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
