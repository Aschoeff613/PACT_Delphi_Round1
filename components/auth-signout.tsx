"use client";

import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthSignOut() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="ghost-button"
      onClick={() =>
        startTransition(async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          window.location.href = "/login";
        })
      }
      disabled={pending}
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
