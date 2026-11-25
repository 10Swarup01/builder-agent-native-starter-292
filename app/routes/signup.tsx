import { IconShield, IconUserCheck } from "@tabler/icons-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { AuthShell } from "@/components/waste/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { afterSignInPath } from "@/lib/auth-navigation";
import { firstIssueMessage, signupSchema } from "@/lib/auth-validation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { signUpWithPassword } from "@/services/auth";

export function meta() {
  return [{ title: "Sign up · WasteWise AI" }];
}

export default function SignupRoute() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

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
    if (mismatch) return;
    const form = new FormData(event.currentTarget);
    const parsed = signupSchema.safeParse({ name: form.get("name"), email: form.get("email"), password });
    if (!parsed.success) {
      toast.error(firstIssueMessage(parsed.error));
      return;
    }
    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUpWithPassword(parsed.data);
      if (needsEmailConfirmation) {
        toast.success("Check your email to confirm your account, then log in.");
        navigate("/login");
        return;
      }
      window.location.replace("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your account. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create your account" description="Join the community that keeps neighbourhoods clean.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="signup-name">Name</Label>
          <Input id="signup-name" name="name" autoComplete="name" required className="min-h-12 text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" name="email" type="email" autoComplete="email" required className="min-h-12 text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 text-base"
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-confirm">Confirm Password</Label>
          <Input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            aria-invalid={mismatch}
            aria-describedby={mismatch ? "signup-confirm-error" : undefined}
            className="min-h-12 text-base"
          />
          {mismatch ? (
            <p id="signup-confirm-error" role="alert" className="text-sm text-danger">
              Passwords do not match.
            </p>
          ) : null}
        </div>
        <Button type="submit" size="lg" className="min-h-12 w-full text-base" disabled={mismatch || submitting}>
          Create account
        </Button>
      </form>

      <div className="space-y-4 pt-2">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/80" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground font-medium">Or explore first</span>
          </div>
        </div>

        <Button
          asChild
          variant="outline"
          size="lg"
          className="min-h-12 w-full text-base font-medium border-border/80 hover:bg-muted transition"
        >
          <Link to="/" className="flex items-center justify-center gap-2">
            <IconUserCheck size={18} className="text-muted-foreground" />
            Continue as Guest
          </Link>
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Login
          </Link>
        </p>

        <div className="border-t border-border/70 pt-3 text-center">
          <Link
            to="/login?mode=admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            <IconShield size={14} />
            Municipal Official or Staff? Sign in via Admin Portal →
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
