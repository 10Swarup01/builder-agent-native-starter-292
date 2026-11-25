import {
  IconAlertCircle,
  IconArrowLeft,
  IconEye,
  IconEyeOff,
  IconShield,
  IconShieldCheck,
  IconUser,
  IconUserCheck,
} from "@tabler/icons-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";

import { AuthShell } from "@/components/waste/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { afterSignInPath, safeNextPath } from "@/lib/auth-navigation";
import { firstIssueMessage, loginSchema } from "@/lib/auth-validation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { getCurrentUser, signInAsAdmin, signInWithPassword } from "@/services/auth";

export function meta() {
  return [{ title: "Login · WasteWise AI" }];
}

export default function LoginRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "admin" ? "admin" : "citizen";

  const [loginMode, setLoginMode] = useState<"citizen" | "admin">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync mode with URL if mode query parameter changes
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "admin" && loginMode !== "admin") {
      setLoginMode("admin");
    } else if (modeParam === "citizen" && loginMode !== "citizen") {
      setLoginMode("citizen");
    }
  }, [searchParams, loginMode]);

  // If already authenticated with an active session, redirect appropriately
  useEffect(() => {
    let active = true;
    void getSupabaseBrowserClient()
      .auth.getSession()
      .then(async ({ data }) => {
        if (!active || !data.session) return;
        try {
          const user = await getCurrentUser();
          if (loginMode === "admin" && user.role === "admin") {
            const next = safeNextPath(searchParams.get("next")) || "/admin";
            window.location.replace(next === "/" ? "/admin" : next);
          } else if (loginMode === "citizen") {
            window.location.replace(afterSignInPath());
          }
        } catch {
          // Session expired or invalid, stay on login page
        }
      });
    return () => {
      active = false;
    };
  }, [loginMode, searchParams]);

  function handleModeChange(newMode: "citizen" | "admin") {
    setLoginMode(newMode);
    setErrorMessage(null);
    const newParams = new URLSearchParams(searchParams);
    if (newMode === "admin") {
      newParams.set("mode", "admin");
    } else {
      newParams.delete("mode");
    }
    setSearchParams(newParams, { replace: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });

    if (!parsed.success) {
      const issue = firstIssueMessage(parsed.error);
      setErrorMessage(issue);
      toast.error(issue);
      return;
    }

    setSubmitting(true);
    try {
      if (loginMode === "admin") {
        await signInAsAdmin(parsed.data.email, parsed.data.password);
        toast.success("Administrator authentication verified.");
        const next = safeNextPath(searchParams.get("next")) || "/admin";
        window.location.replace(next === "/" ? "/admin" : next);
      } else {
        await signInWithPassword(parsed.data.email, parsed.data.password);
        toast.success("Welcome back!");
        window.location.replace(afterSignInPath());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign in. Please try again.";
      setErrorMessage(message);
      toast.error(message);
      setSubmitting(false);
    }
  }

  const title = loginMode === "admin" ? "Administrator Portal" : "Welcome back";
  const description =
    loginMode === "admin"
      ? "Sign in with verified municipal administrator credentials."
      : "Sign in to report waste and track your neighborhood problems.";

  return (
    <AuthShell title={title} description={description}>
      {/* Account Type Selection Tabs */}
      <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-muted/60 border border-border/80">
        <button
          type="button"
          onClick={() => handleModeChange("citizen")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            loginMode === "citizen"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-selected={loginMode === "citizen"}
        >
          <IconUser size={18} className={loginMode === "citizen" ? "text-brand" : ""} />
          Citizen Login
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("admin")}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            loginMode === "admin"
              ? "bg-card text-emerald-400 shadow-sm border border-emerald-500/30"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-selected={loginMode === "admin"}
        >
          <IconShield size={18} className={loginMode === "admin" ? "text-emerald-400" : ""} />
          Admin Login
        </button>
      </div>

      {/* Admin Notice Banner */}
      {loginMode === "admin" && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 text-xs">
          <IconShieldCheck size={18} className="shrink-0 text-emerald-400 mt-0.5" />
          <div className="leading-snug">
            <span className="font-semibold block text-emerald-200">Restricted Administration Access</span>
            Authorized municipal authorities, councillors, and system administrators only.
          </div>
        </div>
      )}

      {/* Inline Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-snug">
          <IconAlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="login-email">
            {loginMode === "admin" ? "Administrator Email" : "Email"}
          </Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={loginMode === "admin" ? "admin@kolkata.gov.in" : "you@example.com"}
            className="min-h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="min-h-12 text-base pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="min-h-11 text-sm font-medium text-brand hover:underline inline-flex items-center"
          >
            Forgot Password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          className={cn(
            "min-h-12 w-full text-base font-semibold",
            loginMode === "admin"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20"
              : "",
          )}
          disabled={submitting}
        >
          {submitting
            ? loginMode === "admin"
              ? "Verifying Administrator Access..."
              : "Signing In..."
            : loginMode === "admin"
              ? "Sign In as Admin"
              : "Login"}
        </Button>
      </form>

      {/* Mode-Specific Secondary Actions */}
      {loginMode === "citizen" ? (
        <div className="space-y-4 pt-2">
          {/* Continue as Guest Option */}
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
          <p className="text-center text-xs text-muted-foreground">
            Browse public waste reports, view maps, and track problems without signing in.
          </p>

          <p className="text-center text-sm text-muted-foreground pt-1">
            New here?{" "}
            <Link to="/signup" className="font-medium text-brand hover:underline">
              Create an account
            </Link>
          </p>

          <div className="border-t border-border/70 pt-3 text-center">
            <button
              type="button"
              onClick={() => handleModeChange("admin")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
            >
              <IconShield size={14} />
              Municipal Official or Staff? Sign in via Admin Portal →
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-2 text-center space-y-3">
          <button
            type="button"
            onClick={() => handleModeChange("citizen")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            <IconArrowLeft size={16} />
            Back to Citizen Login
          </button>
        </div>
      )}
    </AuthShell>
  );
}
