import { signOut as endAppSession } from "@agent-native/core/client";

import { DEMO_USERS } from "@/lib/mock-data";
import { getSupabaseBrowserClient } from "@/lib/supabase";

import { demoLatency } from "./demo";

export type UserRole = "citizen" | "authority" | "admin";

// TODO: Connect Supabase Auth — list users and roles from the profiles table for admins only.
export async function listUsers() {
  await demoLatency();
  return DEMO_USERS;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  role: UserRole;
  reportsSubmitted: number;
  activeReports: number;
  resolvedReports: number;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = getSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user?.email) {
    throw new Error("You are not signed in.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url")
    .eq("id", user.id)
    .single();
  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    id: user.id,
    name: profile.full_name || user.email,
    email: user.email,
    phone: profile.phone ?? "",
    avatarUrl: profile.avatar_url,
    role: "citizen",
    reportsSubmitted: 0,
    activeReports: 0,
    resolvedReports: 0,
  };
}

function callbackUrl(next: string) {
  return `${window.location.origin}/confirm?next=${encodeURIComponent(next)}`;
}

function describeAuthError(message: string) {
  if (message === "Invalid login credentials") return "Email or password is incorrect.";
  if (message === "Email not confirmed") return "Confirm your email first. Check your inbox for the confirmation link.";
  if (message === "User already registered") return "An account with this email already exists. Log in instead.";
  return message;
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(describeAuthError(error.message));
}

export async function signUpWithPassword({ name, email, password }: { name: string; email: string; password: string }) {
  const { data, error } = await getSupabaseBrowserClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: callbackUrl("/") },
  });
  if (error) throw new Error(describeAuthError(error.message));
  return { needsEmailConfirmation: data.session === null };
}

export async function signInWithGoogle() {
  const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl("/") },
  });
  if (error) throw new Error(describeAuthError(error.message));
}

export async function requestPasswordReset(email: string) {
  const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl("/reset-password"),
  });
  if (error) throw new Error(describeAuthError(error.message));
}

export async function updatePassword(password: string) {
  const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
  if (error) throw new Error(describeAuthError(error.message));
}

export async function signOutOfApp() {
  await getSupabaseBrowserClient().auth.signOut();
  await endAppSession({ redirectTo: "/login" });
}
