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
import { WebSocketServer, WebSocket } from "ws";

const isNetlifyBuild = process.env.NETLIFY === "true" || process.env.NETLIFY === "1";
const isVercelBuild = process.env.VERCEL === "1";

function sandboxWsPlugin(): Plugin {
  return {
    name: "sandbox-ws",
    configureServer(server) {
      if (!server.httpServer) return;
      const wss = new WebSocketServer({ noServer: true });
      const clients = new Map<WebSocket, { uid?: string }>();
      const activePlayers = new Map<string, any>();
      const recentBlocks = new Map<string, any>();

      server.httpServer.on("upgrade", (req, socket, head) => {
        if (req.url?.startsWith("/ws")) {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
          });
        }
      });

      wss.on("connection", (ws) => {
        clients.set(ws, {});

        // Send existing active players immediately to new connection
        if (activePlayers.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "players",
              players: Array.from(activePlayers.values()),
            }),
          );
        }

        if (recentBlocks.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "init_world",
              blocks: Array.from(recentBlocks.values()),
            }),
          );
        }

        ws.on("message", (data) => {
          try {
            const raw = data.toString();
            const msg = JSON.parse(raw);

            if (msg.type === "join") {
              const player = msg.player;
              if (player?.uid) {
                clients.set(ws, { uid: player.uid });
                activePlayers.set(player.uid, player);

                // Send complete current roster to the joining player
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: "players",
                      players: Array.from(activePlayers.values()),
                    }),
                  );
                }
              }
            } else if (msg.type === "position") {
              const p = msg.player;
              if (p?.uid) {
                clients.set(ws, { uid: p.uid });
                const existing = activePlayers.get(p.uid);
                activePlayers.set(p.uid, existing ? { ...existing, ...p } : p);
              }
            } else if (msg.type === "avatar_update" || msg.type === "player_update") {
              const p = msg.player;
              if (p?.uid) {
                const existing = activePlayers.get(p.uid);
                activePlayers.set(p.uid, existing ? { ...existing, ...p } : p);
              }
            } else if (msg.type === "block" || msg.type === "block_update") {
              const b = msg.block;
              if (b) {
                const key = `${b.x},${b.y},${b.z}`;
                recentBlocks.set(key, b);
                if (recentBlocks.size > 1000) {
                  const firstKey = recentBlocks.keys().next().value;
                  if (firstKey) recentBlocks.delete(firstKey);
                }
              }
            }

            // Broadcast to all other clients with normalized types
            const outgoing =
              msg.type === "block"
                ? JSON.stringify({ type: "block_update", block: msg.block })
                : raw;

            for (const [client] of clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(outgoing);
              }
            }
          } catch (err) {
            console.warn("WS error:", err);
          }
        });

        ws.on("close", () => {
          const clientData = clients.get(ws);
          if (clientData?.uid) {
            activePlayers.delete(clientData.uid);
            const leftMsg = JSON.stringify({ type: "player_left", uid: clientData.uid });
            for (const [client] of clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(leftMsg);
              }
            }
          }
          clients.delete(ws);
        });
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
  // Vercel reads the Build Output API from .vercel/output, so the vercel preset
  // must keep its default output dir. Netlify/self-hosted keep dist/.
  nitro: isVercelBuild
    ? { preset: "vercel" }
    : {
        preset: isNetlifyBuild ? "netlify" : "node-server",
        output: { dir: "dist" },
      },
});
