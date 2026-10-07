import type { IncomingMessage, ServerResponse } from "node:http";

type FetchHandler = (request: Request) => Response | Promise<Response>;
type VercelRequest = IncomingMessage & { body?: unknown };

/** Adapt the app's Fetch API routes to Vercel's Node.js function contract. */
export function toVercelHandler(handler: FetchHandler) {
  return async (request: VercelRequest, response: ServerResponse) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) headers.set(key, value.join(", "));
      else if (value !== undefined) headers.set(key, value);
    }

    const method = request.method ?? "GET";
    const hasBody = method !== "GET" && method !== "HEAD";
    let body: Buffer | undefined;
    if (hasBody && request.body !== undefined) {
      body = Buffer.from(typeof request.body === "string" ? request.body : JSON.stringify(request.body));
    } else if (hasBody) {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      body = Buffer.concat(chunks);
    }

    const protocol = String(request.headers["x-forwarded-proto"] ?? "https").split(",")[0].trim();
    const host = request.headers.host ?? "localhost";
    const url = new URL(request.url ?? "/", `${protocol}://${host}`);
    const webRequest = new Request(url, {
      method,
      headers,
      ...(body?.length ? { body: new Uint8Array(body), duplex: "half" } as RequestInit : {}),
    });
    const result = await handler(webRequest);

    response.statusCode = result.status;
    const cookies = result.headers.getSetCookie();
    result.headers.forEach((value, key) => {
      if (key !== "set-cookie") response.setHeader(key, value);
    });
    if (cookies.length) response.setHeader("set-cookie", cookies);
    response.end(Buffer.from(await result.arrayBuffer()));
  };
}
