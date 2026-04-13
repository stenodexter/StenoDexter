import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "~/env";
import { db } from "~/server/db";
import type { admin, adminSession } from "../db/schema";
import { redisService } from "../services/redis.service";
import { hashPassword, comparePassword } from "../lib/hash";
import { databaseHooks } from "./auth/hooks";
import { sendResetPasswordEmail, sendVerificationEmail } from "./auth/emails";

export const auth = betterAuth({
  ...(env.BETTER_AUTH_SECRET && { secret: env.BETTER_AUTH_SECRET }),
  trustedOrigins: [
    "http://localhost:3000",
    "https://stenodexter.com",
    "https://www.stenodexter.com",
  ],
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL: env.BETTER_AUTH_BASE_URL,

  user: {
    additionalFields: {
      userCode: {
        type: "string",
        required: false,
      },

      phone: {
        type: "string",
        required: false,
      },

      image: {
        type: "string",
        required: false,
      },

      gender: {
        type: "string",
        required: false,
      },

      isDemo: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },

      demoExpiresAt: {
        type: "date",
        required: false,
      },

      demoRevoked: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },

      demoNote: {
        type: "string",
        required: false,
        defaultValue: null,
      },

      demoCreatedByAdminId: {
        type: "string",
        required: false,
        defaultValue: null,
      },
    },
  },

  databaseHooks,

  emailAndPassword: {
    enabled: true,

    password: {
      async hash(password) {
        return await hashPassword(password);
      },
      async verify(data) {
        return await comparePassword(data.password, data.hash);
      },
    },

    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user, url);
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user, url);
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    afterEmailVerification: async (_user, _request) => {
      return;
    },
  },

  socialProviders: {
    google: {
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
      redirectURI: `${env.BETTER_AUTH_BASE_URL}/api/auth/callback/google`,
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.BETTER_AUTH_BASE_URL.startsWith("https://"),
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
    customRules: {
      "/api/auth/sign-in/email": { window: 60, max: 10 },
      "/api/auth/sign-up/email": { window: 60, max: 5 },
      "/api/auth/forget-password": { window: 60, max: 2 },
      "/api/auth/reset-password": { window: 60, max: 2 },
      "/api/auth/verify-email": { window: 60, max: 2 },
      "/api/auth/sign-in/social": { window: 60, max: 10 },
    },
    storage: "secondary-storage",
  },

  secondaryStorage: {
    async get(key: string) {
      try {
        return await redisService.get<string>(key);
      } catch {
        return null;
      }
    },
    async set(key, value, ttlSec) {
      try {
        await redisService.set(key, value, ttlSec);
      } catch {}
    },
    async delete(key: string) {
      try {
        await redisService.del(key);
      } catch {}
    },
  },

  session: {
    storeSessionInDatabase: true,
    preserveSessionInDatabase: true,
  },
});

export type UserSession = typeof auth.$Infer.Session;
export type AuthUser = UserSession["user"];
export type AdminSession = {
  admin: typeof admin.$inferSelect;
  session: typeof adminSession.$inferSelect;
} | null;
