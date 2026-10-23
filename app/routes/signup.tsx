import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { AuthShell } from "@/components/waste/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function meta() {
  return [{ title: "Sign up · WasteWise AI" }];
}

export default function SignupRoute() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <AuthShell title="Create your account" description="Join the community that keeps neighbourhoods clean.">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (mismatch) return;
          toast.info("Account creation will be connected with Supabase Auth.");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="signup-name">Name</Label>
          <Input id="signup-name" autoComplete="name" required className="min-h-12 text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" type="email" autoComplete="email" required className="min-h-12 text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
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
        <Button type="submit" size="lg" className="min-h-12 w-full text-base" disabled={mismatch}>
          Create account
        </Button>
      </form>

      <Button asChild variant="ghost" size="lg" className="min-h-12 w-full">
        <Link to="/">Continue as Guest</Link>
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="font-medium text-brand hover:underline">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}
