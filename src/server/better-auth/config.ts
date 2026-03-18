import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "~/env";
import { db } from "~/server/db";
import type { admin, adminSession } from "../db/schema";

export const auth = betterAuth({
  ...(env.BETTER_AUTH_SECRET && { secret: env.BETTER_AUTH_SECRET }),
  trustedOrigins: [env.BETTER_AUTH_BASE_URL, "http://localhost:3000"],
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: env.BETTER_AUTH_BASE_URL,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
      redirectURI: `${env.BETTER_AUTH_BASE_URL}/api/auth/callback/google`,
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.BETTER_AUTH_BASE_URL.startsWith("https://"),
    },
  },
});

export type UserSession = typeof auth.$Infer.Session;

export type AdminSession = {
  admin: typeof admin.$inferSelect;
  session: typeof adminSession.$inferSelect;
} | null;
