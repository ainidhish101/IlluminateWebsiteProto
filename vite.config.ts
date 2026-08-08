import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [
    /*
      The Cloudflare plugin does two jobs: it emits the Workers bundle at build
      time, and it runs the dev server inside workerd. Only the first works
      here — @cloudflare/vite-plugin 1.x targets Vite 6/7, and under Vite 8 +
      Rolldown its dev integration pre-bundles a second copy of React, so every
      SSR render dies with "Invalid hook call".

      So it is scoped to builds. `npm run dev` keeps the plain Node SSR
      pipeline (fast, and what the whole app was developed against); to
      exercise the real Workers runtime, run `npm run preview`, which points
      wrangler at the actual build output.

      Revisit once @cloudflare/vite-plugin supports Vite 8 — dropping the
      `command` check restores dev/prod runtime parity.
    */
    ...(command === "build" ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
}));
