import { NextResponse } from "next/server";
import { getReviewerSession } from "@/lib/reviewer-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const session = await getReviewerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { section_id, seconds_delta } = body as { section_id: string; seconds_delta: number };

  if (!section_id || typeof seconds_delta !== "number" || seconds_delta <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Upsert: insert first visit or add delta to running total
  const { error } = await supabase.rpc("upsert_section_time", {
    p_reviewer_id: session.reviewer.id,
    p_section_id: section_id,
    p_seconds_delta: Math.min(Math.round(seconds_delta), 300), // cap at 5 min per heartbeat
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
