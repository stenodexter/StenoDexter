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

const ADMIN_SESSION_CACHE_TTL_SEC = 10 * 60;
const SUBSCRIPTION_CACHE_TTL_SEC = 20 * 60;

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

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;

    if (cause instanceof ZodError) {
      return {
        ...shape,
        message: cause.errors[0]?.message ?? "Validation failed",
        data: {
          ...shape.data,
          code: "VALIDATION_ERROR",
        },
      };
    }

    return {
      ...shape,
      message: error.message,
      data: { ...shape.data },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const rateLimitMiddleware = t.middleware(async ({ ctx, next, path }) => {
  await redisService.rateLimitOrThrow(
    { headers: ctx.headers, route: path },
    60,
    60,
  );
  return next({ ctx });
});

export const publicProcedure = t.procedure.use(rateLimitMiddleware);

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

export const superAdminProcedure = adminProcedure.use(({ ctx, next }) => {
  if (!ctx.admin?.isSuper) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only super admins are allowed to perform this action.",
    });
  }
  return next();
});

export const systemAdminProcedure = adminProcedure.use(({ ctx, next }) => {
  if (!ctx.admin?.isSystem) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only system admins are allowed to perform this action.",
    });
  }
  return next();
});

type ActiveSubscriptions = {
  all: (typeof subscription.$inferSelect)[];
  hasAppAccess: boolean;
  hasTypingAccess: boolean;
};

const resolveActiveSubscriptions = async (
  userId: string,
): Promise<ActiveSubscriptions> => {
  const cacheKey = `subscriptions:${userId}`;

  return redisService.cache<ActiveSubscriptions>(
    cacheKey,
    async () => {
      const now = new Date();

      const rows = await db
        .select()
        .from(subscription)
        .where(
          and(
            eq(subscription.userId, userId),
            eq(subscription.status, "active"),
            gt(subscription.currentPeriodEnd, now),
          ),
        );

      const types = rows.map((r) => r.type);

      return {
        all: rows,
        hasAppAccess: types.includes("app"),
        hasTypingAccess: types.includes("typing"),
      };
    },
    SUBSCRIPTION_CACHE_TTL_SEC,
  );
};

const resolveDemoAccess = (user: {
  isDemo?: boolean | null;
  demoExpiresAt?: Date | string | null;
  demoRevoked?: boolean | null;
}): boolean => {
  if (!user.isDemo) return false;
  const now = new Date();
  const expires = user.demoExpiresAt ? new Date(user.demoExpiresAt) : null;
  if (expires && now > expires) return false;
  if (user.demoRevoked) return false;
  return true;
};

export const paidUserProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const { all, hasAppAccess } = await resolveActiveSubscriptions(ctx.user.id);

    if (!hasAppAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "An active app subscription is required to access this feature.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        subscriptions: all,
      },
    });
  },
);

export const typingUserProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const { all, hasTypingAccess } = await resolveActiveSubscriptions(
      ctx.user.id,
    );

    if (!hasTypingAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "A typing subscription is required to access this feature.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        subscriptions: all,
      },
    });
  },
);

export const demoOrPaidUserProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (ctx.user.isDemo) {
      if (!resolveDemoAccess(ctx.user)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your demo access has expired.",
        });
      }

      return next({
        ctx: {
          ...ctx,
          subscriptions: [] as (typeof subscription.$inferSelect)[],
        },
      });
    }

    const { all, hasAppAccess } = await resolveActiveSubscriptions(ctx.user.id);

    if (!hasAppAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "An active subscription is required to access this feature.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        subscriptions: all,
      },
    });
  },
);

export const demoOrTypingUserProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (ctx.user.isDemo) {
      if (!resolveDemoAccess(ctx.user)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your demo access has expired.",
        });
      }

      return next({
        ctx: {
          ...ctx,
          subscriptions: [] as (typeof subscription.$inferSelect)[],
        },
      });
    }

    const { all, hasTypingAccess } = await resolveActiveSubscriptions(
      ctx.user.id,
    );

    if (!hasTypingAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "A typing subscription is required to access this feature.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        subscriptions: all,
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

    const { all } = await resolveActiveSubscriptions(ctx.user.id);

    return next({
      ctx: {
        ...ctx,
        subscriptions: all,
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
  redisService.del(`subscriptions:${userId}`);

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

export type PaidUserContext = TRPCContext & {
  subscriptions: (typeof subscription.$inferSelect)[];
};
