import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createReviewerSession, getReviewerSession, normalizeReviewerCode } from "@/lib/reviewer-session";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
};

function buildReviewerCode() {
  return `R${randomBytes(3).toString("hex").toUpperCase()}`;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const session = await getReviewerSession();

  if (session) {
    redirect(params.redirectTo || "/");
  }

  async function register(formData: FormData) {
    "use server";

    const displayName = String(formData.get("displayName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const institution = String(formData.get("institution") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const redirectTo = String(formData.get("redirectTo") || "/");
    const admin = createAdminClient();

    if (!displayName || !lastName || !email) {
      redirect(`/login?error=missing_registration_fields&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = buildReviewerCode();
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

      if (!error && createdReviewer) {
        await createReviewerSession(createdReviewer.id);
        redirect(redirectTo);
      }

      if (error?.code !== "23505") {
        redirect(`/login?error=registration_failed&redirectTo=${encodeURIComponent(redirectTo)}`);
      }
    }

    redirect(`/login?error=registration_failed&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  async function signIn(formData: FormData) {
    "use server";

    const code = normalizeReviewerCode(String(formData.get("code") || ""));
    const lastName = String(formData.get("lastName") || "").trim();
    const redirectTo = String(formData.get("redirectTo") || "/");
    const admin = createAdminClient();
    const { data: reviewer } = await admin
      .from("reviewers")
      .select("id, locked_at, last_name")
      .eq("code", code)
      .maybeSingle();

    if (!code || !lastName) {
      redirect(`/login?error=missing_return_fields&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    if (!reviewer) {
      redirect(`/login?error=invalid_identity&redirectTo=${encodeURIComponent(redirectTo)}`);
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
        {params.error === "missing_registration_fields" ? <p className="error-banner">New registration requires full name, last name, and email.</p> : null}
        {params.error === "missing_return_fields" ? <p className="error-banner">Returning reviewers must enter both reviewer code and last name.</p> : null}
        {params.error === "invalid_identity" ? <p className="error-banner">That reviewer code and last name combination was not recognized.</p> : null}
        {params.error === "locked" ? <p className="error-banner">This reviewer code has already been locked and can no longer be used.</p> : null}
        {params.error === "registration_failed" ? <p className="error-banner">Registration failed. Please try again.</p> : null}
        <div className="login-layout">
          <section className="login-overview">
            <div className="eyebrow">Reviewer access</div>
            <h2>Register once, then return with your saved code.</h2>
            <p>New reviewers get an automatically generated code after registration. Returning reviewers sign back in with that code and their last name.</p>
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
          </section>

          <div className="login-actions">
            <section className="login-card">
              <div className="eyebrow">First time</div>
              <h3>Create your reviewer access</h3>
              <p>Your reviewer code will be generated automatically after registration.</p>
              <form action={register}>
                <input type="hidden" name="redirectTo" value={params.redirectTo || "/"} />
                <label className="field-block">
                  <span>Full name</span>
                  <input type="text" name="displayName" required placeholder="Jane Smith" />
                </label>
                <label className="field-block">
                  <span>Last name</span>
                  <input type="text" name="lastName" required placeholder="Smith" />
                </label>
                <label className="field-block">
                  <span>Email</span>
                  <input type="email" name="email" required placeholder="you@example.org" />
                </label>
                <label className="field-block">
                  <span>Institution (optional)</span>
                  <input type="text" name="institution" placeholder="Stanford Medicine" />
                </label>
                <label className="field-block">
                  <span>Department or title (optional)</span>
                  <input type="text" name="title" placeholder="Emergency Medicine" />
                </label>
                <button className="primary-button" type="submit">Begin Review</button>
              </form>
            </section>

            <section className="login-card compact">
              <div className="eyebrow">Returning reviewer</div>
              <h3>Use your saved code</h3>
              <p>Enter the reviewer code you were assigned and the same last name you registered with.</p>
              <form action={signIn}>
                <input type="hidden" name="redirectTo" value={params.redirectTo || "/"} />
                <label className="field-block">
                  <span>Reviewer code</span>
                  <input type="text" name="code" required placeholder="R7A3C9" autoCapitalize="characters" autoCorrect="off" />
                </label>
                <label className="field-block">
                  <span>Last name</span>
                  <input type="text" name="lastName" required placeholder="Smith" />
                </label>
                <button className="primary-button" type="submit">Continue</button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
