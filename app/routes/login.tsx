import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { AuthShell } from "@/components/waste/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { afterSignInPath } from "@/lib/auth-navigation";
import { firstIssueMessage, loginSchema } from "@/lib/auth-validation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { signInWithPassword } from "@/services/auth";

export function meta() {
  return [{ title: "Login · WasteWise AI" }];
}

export default function LoginRoute() {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active && data.session) window.location.replace(afterSignInPath());
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      toast.error(firstIssueMessage(parsed.error));
      return;
    }
    setSubmitting(true);
    try {
      await signInWithPassword(parsed.data.email, parsed.data.password);
      window.location.replace(afterSignInPath());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log in. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Welcome back" description="Sign in to report waste and track your problems.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="min-h-12 text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <Input id="login-password" name="password" type="password" autoComplete="current-password" required className="min-h-12 text-base" />
        </div>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="min-h-11 text-sm font-medium text-brand hover:underline">
            Forgot Password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="min-h-12 w-full text-base" disabled={submitting}>
          Login
        </Button>
      </form>

      <div className="space-y-3">
        <Button asChild variant="ghost" size="lg" className="min-h-12 w-full">
          <Link to="/">Continue as Guest</Link>
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/signup" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
