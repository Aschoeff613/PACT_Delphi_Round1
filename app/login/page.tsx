import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createReviewerSession, getReviewerSession } from "@/lib/reviewer-session";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
};

// Institutions shown in the dropdown — extend as needed
const INSTITUTIONS = [
  "Stanford Medicine",
  "Beth Israel Deaconess Medical Center",
  "Harvard Medical School",
  "Massachusetts General Hospital",
  "Brigham and Women's Hospital",
  "UCSF Health",
  "UCLA Health",
  "NYU Langone Health",
  "Johns Hopkins Medicine",
  "Columbia University Irving Medical Center",
  "Weill Cornell Medicine",
  "Mayo Clinic",
  "Cleveland Clinic",
  "Duke Health",
  "Vanderbilt University Medical Center",
  "University of Washington Medicine",
  "University of Michigan Health",
  "Northwestern Medicine",
  "Emory Healthcare",
  "University of Chicago Medicine",
  "Mount Sinai Health System",
  "Other",
];

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

    // display_name stores first name only
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const institution = String(formData.get("institution") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const redirectTo = String(formData.get("redirectTo") || "/");
    const admin = createAdminClient();

    if (!firstName || !lastName || !email) {
      redirect(`/login?error=missing_registration_fields&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = buildReviewerCode();
      const { data: createdReviewer, error } = await admin
        .from("reviewers")
        .insert({
          code,
          display_name: firstName,
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

    // Username format: first_last (e.g. jane_smith)
    const username = String(formData.get("username") || "").trim().toLowerCase();
    const redirectTo = String(formData.get("redirectTo") || "/");
    const admin = createAdminClient();

    const firstUnderscore = username.indexOf("_");
    if (!username || firstUnderscore < 1) {
      redirect(`/login?error=missing_return_fields&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    const firstName = username.slice(0, firstUnderscore);
    const lastName = username.slice(firstUnderscore + 1);

    if (!firstName || !lastName) {
      redirect(`/login?error=missing_return_fields&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    const { data: reviewer } = await admin
      .from("reviewers")
      .select("id, locked_at, display_name, last_name")
      .ilike("display_name", firstName)
      .ilike("last_name", lastName)
      .maybeSingle();

    if (!reviewer) {
      redirect(`/login?error=invalid_identity&redirectTo=${encodeURIComponent(redirectTo)}`);
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
        {params.error === "missing_registration_fields" && (
          <p className="error-banner">Please fill in your first name, last name, and email to register.</p>
        )}
        {params.error === "missing_return_fields" && (
          <p className="error-banner">Enter your username in first_last format (e.g. jane_smith).</p>
        )}
        {params.error === "invalid_identity" && (
          <p className="error-banner">Username not recognised. Check the format is first_last and matches your registration.</p>
        )}
        {params.error === "locked" && (
          <p className="error-banner">This account has been locked. Contact the study team.</p>
        )}
        {params.error === "registration_failed" && (
          <p className="error-banner">Registration failed. Please try again.</p>
        )}

        <div className="login-layout">
          {/* ── Study overview & consent ─────────────────────────── */}
          <section className="login-overview">
            <div className="eyebrow">Reviewer access</div>
            <h2>Register once. Return with your first_last username.</h2>
            <p>
              New panelists fill in the registration form once. To return on any device, log in with your
              username in <strong>first_last</strong> format — for example, <code>jane_smith</code>.
            </p>
            <div className="consent-panel">
              <p>
                This survey is part of the PACT project (Physician-AI Collaboration Teaming), an ARPA-H funded
                collaboration between Stanford University and Beth Israel Deaconess Medical Center.
                We are conducting a modified Delphi process to identify high-risk clinical cognitive tasks
                for physician-AI collaboration benchmarking.
              </p>
              <p>
                Your participation involves 2–3 short surveys over ~8 weeks rating and ranking candidate tasks.
                Responses are anonymous and reported in aggregate only. Participation is voluntary and you may
                stop at any time.
              </p>
              <p>Questions? Contact Austin Schoeffler at austin_schoeffler@stanford.edu.</p>
              <p><strong>By continuing you confirm that you have read this information and consent to participate.</strong></p>
            </div>
          </section>

          <div className="login-actions">
            {/* ── Registration ─────────────────────────────────── */}
            <section className="login-card">
              <div className="eyebrow">First time</div>
              <h3>Create your reviewer access</h3>
              <p>After registering you will be logged in automatically. To return later, use your first_last username.</p>
              <form action={register}>
                <input type="hidden" name="redirectTo" value={params.redirectTo || "/"} />
                <label className="field-block">
                  <span>First name</span>
                  <input type="text" name="firstName" required placeholder="Jane" autoComplete="given-name" />
                </label>
                <label className="field-block">
                  <span>Last name</span>
                  <input type="text" name="lastName" required placeholder="Smith" autoComplete="family-name" />
                </label>
                <label className="field-block">
                  <span>Email</span>
                  <input type="email" name="email" required placeholder="you@example.org" autoComplete="email" />
                </label>
                <label className="field-block">
                  <span>Institution (optional)</span>
                  <select name="institution" defaultValue="">
                    <option value="" disabled>Select institution</option>
                    {INSTITUTIONS.map((inst) => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </label>
                <label className="field-block">
                  <span>Department or title (optional)</span>
                  <input type="text" name="title" placeholder="Emergency Medicine" />
                </label>
                <button className="primary-button" type="submit">Begin Review</button>
              </form>
            </section>

            {/* ── Returning sign-in ─────────────────────────────── */}
            <section className="login-card compact">
              <div className="eyebrow">Returning reviewer</div>
              <h3>Log in with your username</h3>
              <p>
                Enter your username in <strong>first_last</strong> format — the same first and last name
                you registered with, joined by an underscore. Example: <code>jane_smith</code>
              </p>
              <form action={signIn}>
                <input type="hidden" name="redirectTo" value={params.redirectTo || "/"} />
                <label className="field-block">
                  <span>Username</span>
                  <input
                    type="text"
                    name="username"
                    required
                    placeholder="jane_smith"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
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
