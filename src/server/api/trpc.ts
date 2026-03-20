/**
 * tRPC bootstrap
 *
 * - User session: resolved normally via better-auth on every request (traditional)
 * - Admin session: lazy + cached (keyed by admin_token cookie, 60s TTL)
 * - Public routes: zero DB calls
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { and, eq, gt } from "drizzle-orm";
import { parse as parseCookie } from "cookie";

import { auth, type UserSession } from "~/server/better-auth";
import { db } from "~/server/db";
import { subscription } from "~/server/db/schema";
import type { AdminSession } from "../better-auth/config";
import R2Service from "../services/r2.service";

// ---------------------------------------------------------------------------
// Admin session cache
// ---------------------------------------------------------------------------

const ADMIN_SESSION_CACHE_TTL_MS = 60_000; // 1 minute

interface CachedAdminSession {
  value: AdminSession;
  expiresAt: number;
}

const adminSessionCache = new Map<string, CachedAdminSession>();

// Sweep expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of adminSessionCache) {
    if (entry.expiresAt <= now) adminSessionCache.delete(key);
  }
}, 5 * 60_000);

// ---------------------------------------------------------------------------
// 1. CONTEXT
//
// - Resolves user session via better-auth (traditional)
// - Only extracts the raw admin_token cookie — no DB call for admin here
// ---------------------------------------------------------------------------

export const createTRPCContext = async (opts: { headers: Headers }) => {
  // User session — resolved normally via better-auth
  const userSession = (await auth.api.getSession({
    headers: opts.headers,
  })) as UserSession | null;

  // Admin token — raw cookie only, resolved lazily in adminProcedure
  const cookieHeader = opts.headers.get("cookie") ?? "";
  const parsedCookies = parseCookie(cookieHeader);
  const adminTokenRaw = parsedCookies["admin_token"] ?? null;

  return {
    db,
    headers: opts.headers,
    // User session available immediately
    user: userSession?.user ?? null,
    userSession: userSession?.session ?? null,
    // Admin resolved lazily — only raw token in context
    _adminToken: adminTokenRaw,
    admin: null as any,
    adminSession: null as any,
  };
};

// ---------------------------------------------------------------------------
// 2. INITIALIZATION
// ---------------------------------------------------------------------------

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

// ---------------------------------------------------------------------------
// Timing middleware
// ---------------------------------------------------------------------------

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  console.log(`[TRPC] ${path} took ${Date.now() - start}ms to execute`);
  return result;
});

// ---------------------------------------------------------------------------
// 3. PROCEDURES
// ---------------------------------------------------------------------------

/** Public — no auth required */
export const publicProcedure = t.procedure.use(timingMiddleware);

/** Protected user — better-auth session already resolved in context */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: {
        ...ctx.user,
        profilePicUrl: R2Service.getPublicUrl(ctx.user.image),
      },
    },
  });
});

// ---------------------------------------------------------------------------
// Admin session resolver (lazy + cached)
// ---------------------------------------------------------------------------

const resolveAdminSession = async (
  token: string | null,
): Promise<AdminSession | null> => {
  if (!token) return null;

  const now = Date.now();
  const cached = adminSessionCache.get(token);
  if (cached && cached.expiresAt > now) return cached.value;

  // Cache miss — hit the DB
  const adminSession = await db.query.adminSession.findFirst({
    where: (s) => and(eq(s.token, token), gt(s.expiresAt, new Date())),
    with: { admin: true },
  });

  if (!adminSession?.admin) return null;

  const value = {
    session: adminSession,
    admin: adminSession.admin,
  } as unknown as AdminSession;

  adminSessionCache.set(token, {
    value,
    expiresAt: now + ADMIN_SESSION_CACHE_TTL_MS,
  });

  return value;
};

/** Admin — resolves + caches admin session lazily */
export const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const adminData = await resolveAdminSession(ctx._adminToken);

  if (!adminData?.admin?.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required. Please sign in as an admin.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      admin: {
        ...adminData.admin,
        profilePicUrl: adminData.admin.image
          ? R2Service.getPublicUrl(adminData.admin.image)
          : undefined,
      },
      adminSession: adminData.session,
    },
  });
});

/** Super admin only */
export const superAdminProcedure = adminProcedure.use(({ ctx, next }) => {
  if (!ctx.admin?.isSuper) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only super admins are allowed to perform this action.",
    });
  }
  return next();
});

/** System admin only */
export const systemAdminProcedure = adminProcedure.use(({ ctx, next }) => {
  if (!ctx.admin?.isSystem) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only system admins are allowed to perform this action.",
    });
  }
  return next();
});

/**
 * Paid user — requires active subscription.
 * Subscription check commented out; re-enable when ready.
 */
export const paidUserProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    // const now = new Date();
    // const [activeSubscription] = await db
    //   .select()
    //   .from(subscription)
    //   .where(
    //     and(
    //       eq(subscription.userId, ctx.user.id),
    //       eq(subscription.status, "active"),
    //       gt(subscription.currentPeriodEnd, now),
    //     ),
    //   )
    //   .limit(1);

    // if (!activeSubscription) {
    //   throw new TRPCError({
    //     code: "FORBIDDEN",
    //     message:
    //       "An active subscription is required to access this feature. Please subscribe and try again.",
    //   });
    // }

    return next({
      ctx: {
        ...ctx,
        subscription: {},
      },
    });
  },
);

// ---------------------------------------------------------------------------
// Cache invalidation
// Call after admin logout / session revocation
// ---------------------------------------------------------------------------

export const invalidateAdminSessionCache = (token: string) => {
  adminSessionCache.delete(token);
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

export type PaidUserContext = TRPCContext & {
  subscription: typeof subscription.$inferSelect;
};