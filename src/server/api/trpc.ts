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
import { redisService } from "../services/redis.service";

// ---------------------------------------------------------------------------
// Cache TTLs
// ---------------------------------------------------------------------------

const ADMIN_SESSION_CACHE_TTL_SEC = 10 * 60; // 10 minutes
const SUBSCRIPTION_CACHE_TTL_SEC = 20 * 60; // 20 minutes

// ---------------------------------------------------------------------------
// 1. CONTEXT
//
// - Resolves user session via better-auth (traditional)
// - Only extracts the raw admin_token cookie — no DB call for admin here
// ---------------------------------------------------------------------------

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const userSession = (await auth.api.getSession({
    headers: opts.headers,
  })) as UserSession | null;

  const cookieHeader = opts.headers.get("cookie") ?? "";
  const parsedCookies = parseCookie(cookieHeader);
  const adminTokenRaw = parsedCookies["admin_token"] ?? null;

  return {
    db,
    headers: opts.headers,
    user: userSession?.user ?? null,
    userSession: userSession?.session ?? null,
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
// Rate Limit Middleware
// ---------------------------------------------------------------------------

// const rateLimitMiddleware = t.middleware(async ({ ctx, next, path }) => {
//   await redisService.rateLimitOrThrow(
//     { headers: ctx.headers, route: path },
//     60,
//     60,
//   );
//   return next({ ctx });
// });

// ---------------------------------------------------------------------------
// 3. PROCEDURES
// ---------------------------------------------------------------------------

/** Public — no auth required */
export const publicProcedure = t.procedure;
// .use(rateLimitMiddleware);

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
// Admin session resolver — Redis cached
// ---------------------------------------------------------------------------

const resolveAdminSession = async (
  token: string | null,
): Promise<AdminSession | null> => {
  if (!token) return null;

  const cacheKey = `admin_session:${token}`;

  return redisService.cache<AdminSession>(
    cacheKey,
    async () => {
      const adminSession = await db.query.adminSession.findFirst({
        where: (s) => and(eq(s.token, token), gt(s.expiresAt, new Date())),
        with: { admin: true },
      });

      if (!adminSession?.admin) return null as unknown as AdminSession;

      return {
        session: adminSession,
        admin: adminSession.admin,
      } as unknown as AdminSession;
    },
    ADMIN_SESSION_CACHE_TTL_SEC,
  );
};

/** Admin — resolves + caches admin session lazily via Redis */
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

const resolveSubscription = async (userId: string) => {
  const cacheKey = `subscription:${userId}`;

  return redisService.cache<typeof subscription.$inferSelect | null>(
    cacheKey,
    async () => {
      const now = new Date();

      const [activeSubscription] = await db
        .select()
        .from(subscription)
        .where(
          and(
            eq(subscription.userId, userId),
            eq(subscription.status, "active"),
            gt(subscription.currentPeriodEnd, now),
          ),
        )
        .limit(1);

      return activeSubscription ?? null;
    },
    SUBSCRIPTION_CACHE_TTL_SEC,
  );
};

export const paidUserProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const sub = await resolveSubscription(ctx.user.id);

    if (!sub) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "An active subscription is required to access this feature.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        subscription: sub,
      },
    });
  },
);

export const demoOrPaidUserProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const now = new Date();

    if (ctx.user.isDemo) {
      const expires = ctx.user.demoExpiresAt;
      if ((expires && now > new Date(expires)) || ctx.user.demoRevoked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your demo access has expired.",
        });
      }
      return next({
        ctx: {
          ...ctx,
          user: {
            ...ctx.user,
            profilePicUrl: R2Service.getPublicUrl(ctx.user.image),
          },
          subscription: null,
        },
      });
    }

    const sub = await resolveSubscription(ctx.user.id);

    if (!sub) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "An active subscription is required to access this feature.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: {
          ...ctx.user,
          profilePicUrl: R2Service.getPublicUrl(ctx.user.image),
        },
        subscription: sub,
      },
    });
  },
);

export const nonDemoUserProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (ctx.user.isDemo) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Demo users are not allowed to access this feature.",
      });
    }

    const sub = await resolveSubscription(ctx.user.id);

    return next({
      ctx: {
        ...ctx,
        subscription: sub ?? null,
      },
    });
  },
);

export const secureProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user && !ctx._adminToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User or admin authentication required.",
    });
  }

  return next({ ctx });
});

export const invalidateAdminSessionCache = (token: string) =>
  redisService.del(`admin_session:${token}`);

export const invalidateSubscriptionCache = (userId: string) =>
  redisService.del(`subscription:${userId}`);

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

export type PaidUserContext = TRPCContext & {
  subscription: typeof subscription.$inferSelect;
};
