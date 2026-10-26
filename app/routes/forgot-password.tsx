import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { AuthShell } from "@/components/waste/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailSchema, firstIssueMessage } from "@/lib/auth-validation";
import { requestPasswordReset } from "@/services/auth";

export function meta() {
  return [{ title: "Forgot password · WasteWise AI" }];
}

export default function ForgotPasswordRoute() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = emailSchema.safeParse(form.get("email"));
    if (!parsed.success) {
      toast.error(firstIssueMessage(parsed.error));
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(parsed.data);
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reset link. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Forgot your password?" description="Enter your email and we'll send you a link to reset it.">
      {sent ? (
        <p role="status" className="text-center text-sm text-muted-foreground">
          If an account exists for that email, a reset link is on its way. Check your inbox.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input id="forgot-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="min-h-12 text-base" />
          </div>
          <Button type="submit" size="lg" className="min-h-12 w-full text-base" disabled={submitting}>
            Send reset link
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-brand hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
