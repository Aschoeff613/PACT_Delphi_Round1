import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { AuthSignOut } from "@/components/auth-signout";

export const metadata: Metadata = {
  title: "Expert Case Review",
  description: "Structured expert case rating for a modified Delphi exercise."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div className="brand">
              <h1>Expert Case Review</h1>
              <p>Structured rating workspace for management, communication, and diagnostic case review.</p>
            </div>
            <div className="topbar-actions">
              {user?.email ? <span className="hint">{user.email}</span> : null}
              {user ? (
                <a className="ghost-button compact-button" href="/">
                  Sections
                </a>
              ) : null}
              {user ? <AuthSignOut /> : null}
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
