import { createH3SSRHandler } from "@agent-native/core/server/ssr-handler";
import { defineEventHandler, getMethod, getRequestURL, sendRedirect } from "h3";

const renderAppShell = createH3SSRHandler(() => import("virtual:react-router/server-build"));

// The framework answers these document paths with its own sign-in page before the
// app router runs, so they are served from the app's React routes instead.
const APP_AUTH_PAGES = new Set(["/login", "/signup"]);

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  if (url.pathname === "/sign-in") {
    return sendRedirect(event, `/login${url.search}`, 302);
  }
  if (getMethod(event) === "GET" && APP_AUTH_PAGES.has(url.pathname)) {
    return renderAppShell(event);
  }
});
