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

  const mergeRows = payload.selections.map((item) => ({
    reviewer_id: session.reviewer.id,
    section_id: section.id,
    source_case_id: item.source_case_id,
    decision: item.decision,
    target_case_id: item.decision === "possible_merge" ? item.target_case_id : null
  }));

  const { error: mergeError } = await supabase
    .from("case_merge_feedback")
    .upsert(mergeRows, { onConflict: "reviewer_id,source_case_id" });

  if (mergeError) {
    return NextResponse.json({ error: mergeError.message }, { status: 500 });
  }

  const { error: noteError } = await supabase.from("post_review_feedback").upsert(
    {
      reviewer_id: session.reviewer.id,
      section_id: section.id,
      merge_notes: payload.notes || null
    },
    { onConflict: "reviewer_id,section_id" }
  );

  if (noteError) {
    return NextResponse.json({ error: noteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
