import { decodeContinuation } from "@agent-native/core/shared/sign-in-journey";

export function afterSignInPath() {
  const search = new URLSearchParams(window.location.search);
  const nextParam = search.get("next");
  if (nextParam && safeNextPath(nextParam) !== "/") {
    return safeNextPath(nextParam);
  }
  const continuation = search.get("c");
  return decodeContinuation(continuation) ?? "/";
}

export function safeNextPath(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
