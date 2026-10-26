import { decodeContinuation } from "@agent-native/core/shared/sign-in-journey";

export function afterSignInPath() {
  const continuation = new URLSearchParams(window.location.search).get("c");
  return decodeContinuation(continuation) ?? "/";
}

export function safeNextPath(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
