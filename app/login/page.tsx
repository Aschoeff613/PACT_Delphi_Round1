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
    const displayName = String(formData.get("displayName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const institution = String(formData.get("institution") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const redirectTo = String(formData.get("redirectTo") || "/");
    const admin = createAdminClient();
    const { data: reviewer } = await admin
      .from("reviewers")
      .select("id, locked_at, last_name")
      .eq("code", code)
      .maybeSingle();

    if (!code || !lastName) {
      redirect(`/login?error=missing_fields&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    if (!reviewer) {
      if (!displayName || !email) {
        redirect(`/login?error=missing_fields&redirectTo=${encodeURIComponent(redirectTo)}`);
      }

      const { data: createdReviewer, error } = await admin
        .from("reviewers")
        .insert({
          code,
          display_name: displayName,
          last_name: lastName,
          email,
          institution: institution || null,
          title: title || null
        })
        .select("id")
        .single();

      if (error || !createdReviewer) {
        redirect(`/login?error=code_unavailable&redirectTo=${encodeURIComponent(redirectTo)}`);
      }

      await createReviewerSession(createdReviewer.id);
      redirect(redirectTo);
    }

    if (reviewer.locked_at) {
      redirect(`/login?error=locked&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    if (reviewer.last_name.trim().toLowerCase() !== lastName.toLowerCase()) {
      redirect(`/login?error=invalid_identity&redirectTo=${encodeURIComponent(redirectTo)}`);
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
        <h2>Reviewer registration</h2>
        <p>Choose a reviewer code the first time you enter. To come back later, use the same reviewer code and last name.</p>
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
        {params.error === "missing_fields" ? <p className="error-banner">Reviewer code and last name are required. New registration also requires name and email.</p> : null}
        {params.error === "invalid_identity" ? <p className="error-banner">That reviewer code exists, but the last name did not match.</p> : null}
        {params.error === "locked" ? <p className="error-banner">This reviewer code has already been locked and can no longer be used.</p> : null}
        {params.error === "code_unavailable" ? <p className="error-banner">That reviewer code is unavailable. Choose another one.</p> : null}
        <form action={signIn}>
          <input type="hidden" name="redirectTo" value={params.redirectTo || "/"} />
          <label className="field-block">
            <span>Reviewer code</span>
            <input type="text" name="code" required placeholder="P07" autoCapitalize="characters" autoCorrect="off" />
          </label>
          <label className="field-block">
            <span>Last name</span>
            <input type="text" name="lastName" required placeholder="Smith" />
          </label>
          <label className="field-block">
            <span>Full name (first visit only)</span>
            <input type="text" name="displayName" placeholder="Jane Smith" />
          </label>
          <label className="field-block">
            <span>Email (first visit only)</span>
            <input type="email" name="email" placeholder="you@example.org" />
          </label>
          <label className="field-block">
            <span>Institution (optional)</span>
            <input type="text" name="institution" placeholder="Stanford Medicine" />
          </label>
          <label className="field-block">
            <span>Department or title (optional)</span>
            <input type="text" name="title" placeholder="Emergency Medicine" />
          </label>
          <button className="primary-button" type="submit">Continue</button>
        </form>
      </div>
    </div>
  );
}
