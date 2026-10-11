import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import * as schema from "@/db/schema";
import { getDb } from "@/lib/db/client";

const googleProvider = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        requireEmailVerification: true,
      },
    }
  : {};
const appBaseURL = process.env.APP_URL || "http://localhost:3000";
const baseURL = process.env.BETTER_AUTH_URL || (
  process.env.NODE_ENV === "development"
    ? { allowedHosts: ["localhost:*", "127.0.0.1:*"], protocol: "auto" as const, fallback: appBaseURL }
    : appBaseURL
);

export const auth = betterAuth({
  appName: "Think Zone AI",
  baseURL,
  secret: process.env.AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.authSessions,
      account: schema.authAccounts,
      verification: schema.authVerifications,
    },
  }),
  socialProviders: googleProvider,
  account: {
    encryptOAuthTokens: true,
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  plugins: [nextCookies()],
});
