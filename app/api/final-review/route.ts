import { NextResponse } from "next/server";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";

type Payload = {
  merge_notes: string;
  section_slug: string;
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

  const { error } = await supabase.from("post_review_feedback").upsert(
    {
      reviewer_id: session.reviewer.id,
      section_id: section.id,
      merge_notes: payload.merge_notes || null
    },
    { onConflict: "reviewer_id,section_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
