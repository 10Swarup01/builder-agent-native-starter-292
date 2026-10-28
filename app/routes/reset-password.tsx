import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { AuthShell } from "@/components/waste/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { firstIssueMessage, passwordSchema } from "@/lib/auth-validation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { updatePassword } from "@/services/auth";

export function meta() {
  return [{ title: "Reset password · WasteWise AI" }];
}

export default function ResetPasswordRoute() {
  const [status, setStatus] = useState<"checking" | "ready" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  useEffect(() => {
    let active = true;
    void getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active) setStatus(data.session ? "ready" : "expired");
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mismatch) return;
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast.error(firstIssueMessage(parsed.error));
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(parsed.data);
      toast.success("Your password has been updated.");
      window.location.replace("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your password. Try again.");
      setSubmitting(false);
    }
  }

  if (status === "expired") {
    return (
      <AuthShell title="Link not valid" description="This password reset link is invalid or has expired.">
        <Button asChild size="lg" className="min-h-12 w-full text-base">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </AuthShell>
    );
  }

  if (status === "checking") {
    return <AuthShell title="Reset your password" description="Checking your reset link…">{null}</AuthShell>;
  }

  return (
    <AuthShell title="Choose a new password" description="Enter and confirm your new password.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
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
          <Label htmlFor="reset-confirm">Confirm new password</Label>
          <Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            aria-invalid={mismatch}
            aria-describedby={mismatch ? "reset-confirm-error" : undefined}
            className="min-h-12 text-base"
          />
          {mismatch ? (
            <p id="reset-confirm-error" role="alert" className="text-sm text-danger">
              Passwords do not match.
            </p>
          ) : null}
        </div>
        <Button type="submit" size="lg" className="min-h-12 w-full text-base" disabled={mismatch || submitting}>
          Save new password
        </Button>
      </form>
    </AuthShell>
  );
}
