import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect(params.redirectTo || "/");
  }

  async function signIn(formData: FormData) {
    "use server";

    const email = String(formData.get("email") || "").trim();
    const displayName = String(formData.get("displayName") || "").trim();
    const institution = String(formData.get("institution") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const redirectTo = String(formData.get("redirectTo") || "/");
    const headerStore = await headers();
    const forwardedProto = headerStore.get("x-forwarded-proto") ?? "http";
    const forwardedHost = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
    const supabase = await createClient();
    const requestOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : "";
    const origin = requestOrigin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    await supabase.auth.signInWithOtp({
      email,
      options: {
        data: {
          display_name: displayName,
          affiliation_title: [institution, title].filter(Boolean).join(", "),
          institution,
          title
        },
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      }
    });
  }

  return (
    <div className="login-wrap">
      <div className="login-panel">
        <div className="eyebrow">Authentication</div>
        <h2>Reviewer login</h2>
        <p>Enter your reviewer details to receive a secure sign-in link. Your case progress and partial ratings persist automatically.</p>
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
          <p><strong>By clicking "Send magic link" you confirm that you have read this information and consent to participate.</strong></p>
        </div>
        <form action={signIn}>
          <input type="hidden" name="redirectTo" value={params.redirectTo || "/"} />
          <label className="field-block">
            <span>Reviewer name</span>
            <input type="text" name="displayName" required placeholder="Jane Smith" />
          </label>
          <label className="field-block">
            <span>Institution</span>
            <input type="text" name="institution" required placeholder="Stanford Medicine" />
          </label>
          <label className="field-block">
            <span>Title</span>
            <input type="text" name="title" required placeholder="Emergency Physician" />
          </label>
          <label className="field-block">
            <span>Email address</span>
            <input type="email" name="email" required placeholder="you@example.org" />
          </label>
          <button className="primary-button" type="submit">Send magic link</button>
        </form>
      </div>
    </div>
  );
}
