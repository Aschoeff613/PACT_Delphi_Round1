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
    const redirectTo = String(formData.get("redirectTo") || "/");
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      }
    });
  }

  return (
    <div className="login-wrap">
      <div className="login-panel">
        <div className="eyebrow">Authentication</div>
        <h2>Email login</h2>
        <p>Enter your email address to receive a secure sign-in link. Your case progress and partial ratings persist automatically.</p>
        <form action={signIn}>
          <input type="hidden" name="redirectTo" value={params.redirectTo || "/"} />
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
