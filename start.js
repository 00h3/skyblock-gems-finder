import fs from "fs";
import { createServer, request as httpRequest } from "node:http";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { attachSandboxWebSocketServer } from "./src/server/sandbox-ws.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidates = [
  "dist/server/index.mjs",
  ".output/server/index.mjs",
  "build/server/index.mjs",
  "dist/index.mjs",
];

let entryFile = null;
for (const file of candidates) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    entryFile = fullPath;
    break;
  }
}

if (!entryFile) {
  console.error("=========================================");
  console.error("ERROR: Could not find server entry file!");
  console.error("Checked candidates: ", candidates.join(", "));
  console.error("Current directory contents:");
  console.error(fs.readdirSync(__dirname).join("\n"));
  console.error("=========================================");
  process.exit(1);
}

async function findInternalPort() {
  const probe = createServer();
  const port = await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not reserve an internal application port."));
        return;
      }
      resolve(address.port);
    });
  });
  await new Promise((resolve, reject) => {
    probe.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

const publicPort = Number(process.env.PORT || 3000);
const internalPort = await findInternalPort();
console.log(`Starting server with ${entryFile}`);

const child = spawn("node", [entryFile], {
  stdio: "inherit",
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    NITRO_HOST: "127.0.0.1",
    PORT: String(internalPort),
    NITRO_PORT: String(internalPort),
  },
});

const proxy = createServer((req, res) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const remoteAddress = req.socket.remoteAddress;
  const proxyReq = httpRequest(
    {
      hostname: "127.0.0.1",
      port: internalPort,
      path: req.url || "/",
      method: req.method,
      headers: {
        ...req.headers,
        "x-forwarded-for": [forwardedFor, remoteAddress].filter(Boolean).join(", "),
        "x-forwarded-host": req.headers.host || "",
        "x-forwarded-proto": req.headers["x-forwarded-proto"] || "http",
      },
    },
    (upstreamRes) => {
      const headers = { ...upstreamRes.headers };
      delete headers.connection;
      res.writeHead(upstreamRes.statusCode || 502, headers);
      upstreamRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end("Application server is starting. Please retry shortly.");
  });
  req.on("aborted", () => proxyReq.destroy());
  req.pipe(proxyReq);
});

const closeSandboxWebSockets = attachSandboxWebSocketServer(proxy);

let shuttingDown = false;
const shutdown = (signal = "SIGTERM") => {
  if (shuttingDown) return;
  shuttingDown = true;
  closeSandboxWebSockets();
  proxy.close();
  child.kill(signal);
  const forceExit = setTimeout(() => {
    child.kill("SIGKILL");
    process.exit(1);
  }, 5000);
  forceExit.unref();
};

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
child.once("error", (error) => {
  console.error("Could not start the application server:", error);
  shutdown("SIGTERM");
});
child.once("exit", (code) => {
  closeSandboxWebSockets();
  proxy.close();
  if (shuttingDown) {
    process.exit(code || 0);
    return;
  }
  process.exit(code || 1);
});

proxy.once("error", (error) => {
  console.error("Could not open the public application port:", error);
  shutdown("SIGTERM");
});
proxy.listen(publicPort, "0.0.0.0", () => {
  console.log(`HTTP and WebSocket proxy listening on 0.0.0.0:${publicPort}`);
});
