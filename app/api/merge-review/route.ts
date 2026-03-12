import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Payload;
  const { data: section } = await supabase
    .from("sections")
    .select("id")
    .eq("slug", payload.section_slug)
    .single();

  if (!section) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }

  const mergeRows = payload.selections.map((item) => ({
    user_id: user.id,
    section_id: section.id,
    source_case_id: item.source_case_id,
    decision: item.decision,
    target_case_id: item.decision === "possible_merge" ? item.target_case_id : null
  }));

  const { error: mergeError } = await supabase
    .from("case_merge_feedback")
    .upsert(mergeRows, { onConflict: "user_id,source_case_id" });

  if (mergeError) {
    return NextResponse.json({ error: mergeError.message }, { status: 500 });
  }

  const { error: noteError } = await supabase.from("post_review_feedback").upsert(
    {
      user_id: user.id,
      section_id: section.id,
      merge_notes: payload.notes || null
    },
    { onConflict: "user_id,section_id" }
  );

  if (noteError) {
    return NextResponse.json({ error: noteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
