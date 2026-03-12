import type { Metadata } from "next";
import "./globals.css";
import { AuthSignOut } from "@/components/auth-signout";
import { getReviewerSession } from "@/lib/reviewer-session";

export const metadata: Metadata = {
  title: "Expert Case Review",
  description: "Structured expert case rating for a modified Delphi exercise."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getReviewerSession();
  const reviewer = session?.reviewer ?? null;

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
              {reviewer?.display_name ? <span className="hint">{reviewer.display_name}</span> : null}
              {reviewer?.institution ? <span className="hint">{reviewer.institution}</span> : null}
              {reviewer?.title ? <span className="hint">{reviewer.title}</span> : null}
              {reviewer?.code ? <span className="hint">{reviewer.code}</span> : null}
              {reviewer ? (
                <a className="ghost-button compact-button" href="/">
                  Sections
                </a>
              ) : null}
              {reviewer ? <AuthSignOut /> : null}
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
