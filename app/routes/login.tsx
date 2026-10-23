import { Link } from "react-router";
import { toast } from "sonner";

import { AuthShell, GoogleMark } from "@/components/waste/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function meta() {
  return [{ title: "Login · WasteWise AI" }];
}

export default function LoginRoute() {
  return (
    <AuthShell title="Welcome back" description="Sign in to report waste and track your problems.">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          toast.info("Sign-in will be connected with Supabase Auth.");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" type="email" autoComplete="email" required placeholder="you@example.com" className="min-h-12 text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <Input id="login-password" type="password" autoComplete="current-password" required className="min-h-12 text-base" />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="min-h-11 text-sm font-medium text-brand hover:underline"
            onClick={() => toast.info("Password reset will be available with Supabase Auth.")}
          >
            Forgot Password?
          </button>
        </div>
        <Button type="submit" size="lg" className="min-h-12 w-full text-base">
          Login
        </Button>
      </form>

      <div className="relative text-center">
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden="true" />
        <span className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">or</span>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          size="lg"
          className="min-h-12 w-full gap-3"
          onClick={() => toast.info("Google sign-in will be connected with Supabase Auth.")}
        >
          <GoogleMark />
          Continue with Google
        </Button>
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
