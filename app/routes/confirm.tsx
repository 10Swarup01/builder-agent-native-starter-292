import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { AuthShell } from "@/components/waste/AuthShell";
import { Button } from "@/components/ui/button";
import { safeNextPath } from "@/lib/auth-navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export function meta() {
  return [{ title: "Signing you in · WasteWise AI" }];
}

export default function AuthCallbackRoute() {
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      setFailed(true);
      return;
    }
    const next = safeNextPath(params.get("next"));
    void getSupabaseBrowserClient()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) setFailed(true);
        else window.location.replace(next);
      });
  }, []);

  if (failed) {
    return (
      <AuthShell title="Link not valid" description="This link is invalid or has expired. Log in or request a new one.">
        <Button asChild size="lg" className="min-h-12 w-full text-base">
          <Link to="/login">Back to login</Link>
        </Button>
      </AuthShell>
    );
  }

  return <AuthShell title="Signing you in" description="Please wait while we confirm your link.">{null}</AuthShell>;
}
