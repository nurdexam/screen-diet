import { betterAuth } from "better-auth";
import { Pool } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;
const vercelOrigin = (hostname?: string) => hostname ? `https://${hostname}` : undefined;
const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  vercelOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  vercelOrigin(process.env.VERCEL_BRANCH_URL),
  vercelOrigin(process.env.VERCEL_URL),
  process.env.NODE_ENV === "development" ? "http://localhost:5173" : undefined,
  process.env.NODE_ENV === "development" ? "http://127.0.0.1:5173" : undefined,
].filter((origin): origin is string => Boolean(origin));

const baseURL = process.env.BETTER_AUTH_URL ?? vercelOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!secret) throw new Error("BETTER_AUTH_SECRET is required.");

const pool = new Pool({ connectionString: databaseUrl });

export const auth = betterAuth({
  appName: "ScreenDiet",
  baseURL,
  secret,
  trustedOrigins,
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
});

export { pool };
