// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
if (process.argv.includes("build") || process.env.NODE_ENV === "production") {
  process.env.NODE_ENV = "production";
}

import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { attachSandboxWebSocketServer } from "./src/server/sandbox-ws.js";

const isNetlifyBuild = process.env.NETLIFY === "true" || process.env.NETLIFY === "1";
const isVercelBuild = process.env.VERCEL === "1" || process.env.VERCEL === "true";

function sandboxWsPlugin(): Plugin {
  return {
    name: "sandbox-ws",
    configureServer(server) {
      if (server.httpServer) attachSandboxWebSocketServer(server.httpServer);
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/api/support-chat" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", async () => {
            try {
              const json = JSON.parse(body || "{}");
              const { handleSupportChat } = await import("./src/server/gemini-support.ts");
              const result = await handleSupportChat(json.prompt || "", json.history || []);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err?.message || "Internal error" }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [sandboxWsPlugin()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
      watch: {
        // Bun's isolated install cache can contain tens of thousands of files.
        // It is not source code and should never be included in the dev watcher.
        ignored: ["**/.cache/**", "**/.local/**", "**/.git/**"],
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: isVercelBuild
    ? // Vercel reads Nitro's Build Output API bundle from .vercel/output;
      // a node-server build in dist/ deploys with no routes (404 everywhere).
      { preset: "vercel" }
    : {
        // Netlify needs Nitro's function bundle and deploy metadata. Keep the
        // Node server target for local/self-hosted builds.
        preset: isNetlifyBuild ? "netlify" : "node-server",
        output: {
          dir: "dist",
        },
      },
});
