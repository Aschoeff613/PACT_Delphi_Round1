import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  merge_notes: string;
  section_slug: string;
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

  const { error } = await supabase.from("post_review_feedback").upsert(
    {
      user_id: user.id,
      section_id: section.id,
      merge_notes: payload.merge_notes || null
    },
    { onConflict: "user_id,section_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
