/*
  Server-render entry.

  React Router's built-in default targets Node specifically — it uses
  `renderToPipeableStream` and `node:stream`, neither of which exists on
  Cloudflare Workers. This replaces it with the Web Streams renderer
  (`renderToReadableStream`), which runs unmodified on both: Node 18+ and
  Workers each provide the same standard stream API.

  So `npm start` (Node) and `npm run deploy` (Workers) share this one file.
*/

import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
/**test */
/** How long a suspended boundary may hang before we give up on it. */
export const streamTimeout = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  }

  let shellRendered = false;
  const userAgent = request.headers.get("user-agent");

  // Abort a stream that outlives its budget, so a stuck boundary can't hold
  // the whole response open.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), streamTimeout + 1000);

  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: controller.signal,
      onError(error: unknown) {
        responseStatusCode = 500;
        // Errors thrown while rendering the shell reject this promise and get
        // logged by the caller — only log the ones that escape afterwards.
        if (shellRendered) console.error(error);
      },
    },
  );
  shellRendered = true;

  // Crawlers and SPA-mode renders need the complete document, not a stream
  // they might read half of.
  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  body.allReady.finally(() => clearTimeout(timeoutId));

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
