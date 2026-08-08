/*
  Cloudflare Workers entry point.

  Cloudflare runs this module's `fetch` for every request that isn't served
  straight from static assets. It hands the request to the React Router server
  build, which does the SSR — the same build `npm start` runs under Node.

  The Worker bindings (`env`, `ctx`) are published on a router context so a
  loader could reach a KV namespace or D1 binding later:

    import { cloudflareContext } from "../workers/app";
    export function loader({ context }: Route.LoaderArgs) {
      const { env } = context.get(cloudflareContext);
    }

  Nothing uses them today — the dashboard talks to Supabase directly from the
  browser — but wiring it up now costs three lines and saves rediscovering the
  React Router 8 context API later.
*/

import { createContext, createRequestHandler, RouterContextProvider } from "react-router";

export const cloudflareContext = createContext<{ env: Env; ctx: ExecutionContext }>();

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  fetch(request, env, ctx) {
    const context = new RouterContextProvider();
    context.set(cloudflareContext, { env, ctx });
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
