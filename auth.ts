import { betterAuth } from "better-auth";
import { Pool } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;
const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.NODE_ENV === "development" ? "http://localhost:5173" : undefined,
  process.env.NODE_ENV === "development" ? "http://127.0.0.1:5173" : undefined,
].filter((origin): origin is string => Boolean(origin));

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!secret) throw new Error("BETTER_AUTH_SECRET is required.");

const pool = new Pool({ connectionString: databaseUrl });

export const auth = betterAuth({
  appName: "ScreenDiet",
  baseURL: process.env.BETTER_AUTH_URL,
  secret,
  trustedOrigins,
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
});

export { pool };
