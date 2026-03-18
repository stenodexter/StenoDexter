/**
 * tRPC bootstrap — cleaned and simplified
 *
 * Provides:
 * - createTRPCContext: attaches `db`, `user` (better-auth session), and `admin` (custom admin session)
 * - initTRPC with superjson transformer and Zod error parsing
 * - public/protected/admin/superAdmin/paidUser procedures with clear error messages
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";
import { and, eq, gt } from "drizzle-orm";
import { parse as parseCookie } from "cookie";

import { auth, type UserSession } from "~/server/better-auth";
import { db } from "~/server/db";
import { subscription } from "~/server/db/schema";
import type { AdminSession } from "../better-auth/config";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * 1. CONTEXT
 *
 * Attaches:
 * - db
 * - user: result from better-auth (may be null)
 * - admin: custom admin session + admin user (may be null)
 * - headers: forwarded headers
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // 1) user session (better-auth)
  const userSession = (await auth.api.getSession({
    headers: opts.headers,
  })) as UserSession | null;

  // 2) admin session: read cookie and load admin session row
  const cookieHeader = opts.headers.get("cookie") ?? "";
  const cookies = parseCookie(cookieHeader || "");

  const adminTokenParse = z.string().safeParse(cookies.admin_token);

  let admin: AdminSession | null = null;

  if (adminTokenParse.success) {
    const token = adminTokenParse.data;
    const now = new Date();

    const adminSession = await db.query.adminSession.findFirst({
      where: (s, { eq, gt }) => and(eq(s.token, token), gt(s.expiresAt, now)),
      with: {
        admin: true,
      },
    });

    if (adminSession?.admin) {
      admin = {
        session: adminSession,
        admin: adminSession.admin,
      } as unknown as AdminSession;
    }
  }

  return {
    db,
    user: userSession?.user ?? null,
    userSession: userSession?.session ?? null,
    admin: admin?.admin ?? null,
    adminSession: admin?.session ?? null,
    headers: opts.headers,
  };
};

/**
 * 2. INITIALIZATION
 *
 * Use superjson transformer and format Zod errors for frontend consumption.
 */
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

/**
 * Create a server-side caller factory (useful for server-side calls).
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * Router helper to create routers.
 */
export const createTRPCRouter = t.router;

/**
 * Timing middleware (keeps a small artificial delay in dev to catch waterfalls).
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // small artificial delay — remove or adjust if you don't want it
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * 3. Procedures
 *
 * - publicProcedure: no auth required
 * - protectedProcedure: any logged-in user (better-auth)
 * - adminProcedure: logged-in admin (custom admin_session)
 * - superAdminProcedure: admin with isSuper flag
 * - paidUserProcedure: user with active subscription
 */

/** Public (no authentication required) */
export const publicProcedure = t.procedure.use(timingMiddleware);

/** Protected user (better-auth) */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  // ctx.user follows better-auth's getSession shape: ctx.user?.user is the actual user object
  if (!ctx?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/** Admin (custom admin session) */
export const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx?.admin?.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required. Please sign in as an admin.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      admin: ctx.admin,
    },
  });
});

/** Super admin only */
export const superAdminProcedure = adminProcedure.use(({ ctx, next }) => {
  // ctx.admin here is the admin object (returned by adminProcedure)
  if (!ctx.admin?.isSuper) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only super admins are allowed to perform this action.",
    });
  }

  return next();
});

/**
 * Paid user procedure — requires an active subscription
 */
export const paidUserProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const now = new Date();

    const [activeSubscription] = await db
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.userId, ctx.user.id),
          eq(subscription.status, "active"),
          gt(subscription.currentPeriodEnd, now),
        ),
      )
      .limit(1);

    if (!activeSubscription) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "An active subscription is required to access this feature. Please subscribe and try again.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        subscription: activeSubscription,
      },
    });
  },
);

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

export type PaidUserContext = TRPCContext & {
  subscription: typeof subscription.$inferSelect;
};
