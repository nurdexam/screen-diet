import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import type { IncomingMessage } from "node:http";

function localApiPlugin(): Plugin {
  return {
    name: "screendiet-local-api",
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), "");
      Object.assign(process.env, env);
      if (mode === "development") {
        process.env.NODE_ENV = "development";
      }
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        const modulePath = getApiModulePath(pathname);
        if (!modulePath) return next();

        try {
          if (process.env.NODE_ENV === "development") {
            const host = request.headers.host ?? "localhost:5173";
            const origin = `http://${host}`;
            const hostname = new URL(origin).hostname;
            if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
              process.env.BETTER_AUTH_URL = origin;
            }
          }
          const apiModule = await server.ssrLoadModule(modulePath) as {
            fetch?: (request: Request) => Promise<Response> | Response;
            default?: { fetch?: (request: Request) => Promise<Response> | Response };
          };
          const fetchHandler = apiModule.fetch ?? apiModule.default?.fetch;
          if (!fetchHandler) throw new Error("API handler does not export fetch().");

          const method = request.method ?? "GET";
          const headers = new Headers();
          for (const [key, value] of Object.entries(request.headers)) {
            if (Array.isArray(value)) headers.set(key, value.join(", "));
            else if (value !== undefined) headers.set(key, value);
          }
          const body = method === "GET" || method === "HEAD" ? undefined : await readRequestBody(request);
          const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost:5173"}`);
          const webRequest = new Request(url, {
            method,
            headers,
            ...(body ? { body: new Uint8Array(body), duplex: "half" } as RequestInit : {}),
          });
          const apiResponse = await fetchHandler(webRequest);
          response.statusCode = apiResponse.status;
          const cookies = apiResponse.headers.getSetCookie();
          apiResponse.headers.forEach((value, key) => {
            if (key !== "set-cookie") response.setHeader(key, value);
          });
          if (cookies.length) response.setHeader("set-cookie", cookies);
          response.end(Buffer.from(await apiResponse.arrayBuffer()));
        } catch {
          server.config.logger.error("Local API request failed; check the Neon environment and database schema.");
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Local API failed. Check the Neon environment and database schema." }));
        }
      });
    },
  };
}

function getApiModulePath(pathname: string) {
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) return "/api/auth/[...all].ts";
  if (pathname === "/api/data") return "/api/data.ts";
  if (pathname === "/api/children") return "/api/children.ts";
  if (pathname === "/api/sessions") return "/api/sessions.ts";
  return null;
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default defineConfig({
  plugins: [
    localApiPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "ScreenDiet",
        short_name: "ScreenDiet",
        description: "Screen time management app",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    }),
  ],
});
