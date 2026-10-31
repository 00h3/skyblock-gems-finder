import "./lib/error-capture";

import serverEntry from "@tanstack/react-start/server-entry";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const err = consumeLastCapturedError();
  console.error(err ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (
      url.pathname === "/healthz" ||
      url.pathname === "/_health" ||
      url.pathname === "/api/health"
    ) {
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }

    if (url.pathname === "/api/support-chat" && request.method === "POST") {
      try {
        const body = (await request.json()) as { prompt?: string; history?: any[] };
        const { handleSupportChat } = await import("./server/gemini-support");
        const data = await handleSupportChat(body?.prompt || "", body?.history || []);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || "Internal support error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    try {
      const handler = serverEntry as ServerEntry;
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
