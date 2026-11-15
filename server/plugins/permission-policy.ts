import { getH3App } from "@agent-native/core/server";
import { defineEventHandler, setResponseHeader } from "h3";

// Framework default is "camera=*, microphone=(self), geolocation=(), screen-wake-lock=()".
// Only geolocation is opened here; the rest stay identical to the framework default.
const PERMISSIONS_POLICY =
  "camera=*, microphone=(self), geolocation=(self), screen-wake-lock=()";

// Registered on the first request so this handler runs after the framework's
// security-headers middleware, which is last-write-wins for Permissions-Policy.
export default (nitroApp: {
  hooks?: { hook?: (name: string, cb: () => void) => void };
}) => {
  const hook = nitroApp?.hooks?.hook;
  if (typeof hook !== "function") return;

  let registered = false;
  hook.call(nitroApp.hooks, "request", () => {
    if (registered) return;
    registered = true;
    getH3App(nitroApp).use(
      defineEventHandler((event) => {
        setResponseHeader(event, "Permissions-Policy", PERMISSIONS_POLICY);
      }),
    );
  });
};
