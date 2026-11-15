/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_ACCESS_TOKEN?: string;
}

declare module "react-dom/server.browser" {
  export * from "react-dom/server";
  export { default } from "react-dom/server";
}
