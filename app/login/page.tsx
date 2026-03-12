import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createReviewerSession, getReviewerSession, normalizeReviewerCode } from "@/lib/reviewer-session";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const session = await getReviewerSession();

  if (session) {
    redirect(params.redirectTo || "/");
  }

  async function signIn(formData: FormData) {
    "use server";

    const code = normalizeReviewerCode(String(formData.get("code") || ""));
    const redirectTo = String(formData.get("redirectTo") || "/");
    const admin = createAdminClient();
    const { data: reviewer } = await admin
      .from("reviewers")
      .select("id, locked_at")
      .eq("code", code)
      .maybeSingle();

    if (!reviewer) {
      redirect(`/login?error=invalid_code&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    if (reviewer.locked_at) {
      redirect(`/login?error=locked&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    await admin
      .from("reviewers")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", reviewer.id);

    await createReviewerSession(reviewer.id);
    redirect(redirectTo);
  }

  return (
    <div className="login-wrap">
      <div className="login-panel">
        <div className="eyebrow">Authentication</div>
        <h2>Reviewer code login</h2>
        <p>Enter your assigned reviewer code to resume your saved progress. Keep the same code for later rounds.</p>
        <div className="consent-panel">
          <p>
            This survey is part of the PACT project (Physician-AI Collaboration Teaming), an ARPA-H funded collaboration between Stanford University and Beth Israel Deaconess Medical Center.
            We are conducting a modified Delphi process to identify high-risk clinical cognitive tasks for physician-AI collaboration benchmarking.
          </p>
          <p>
            Your participation involves 2-3 short surveys over ~8 weeks rating and ranking candidate tasks. Responses are anonymous and reported in aggregate only.
            Participation is voluntary and you may stop at any time.
          </p>
          <p>Questions? Contact Austin Schoeffler at austin_schoeffler@stanford.edu.</p>
          <p><strong>By continuing you confirm that you have read this information and consent to participate.</strong></p>
        </div>
        {params.error === "invalid_code" ? <p className="error-banner">That reviewer code was not recognized.</p> : null}
        {params.error === "locked" ? <p className="error-banner">This reviewer code has already been locked and can no longer be used.</p> : null}
        <form action={signIn}>
          <input type="hidden" name="redirectTo" value={params.redirectTo || "/"} />
          <label className="field-block">
            <span>Reviewer code</span>
            <input type="text" name="code" required placeholder="PACT-001" autoCapitalize="characters" autoCorrect="off" />
          </label>
          <button className="primary-button" type="submit">Continue</button>
        </form>
      </div>
    </div>
  );
}
