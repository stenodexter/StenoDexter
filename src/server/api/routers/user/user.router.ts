// ─── server/api/routers/user/user.router.ts ───────────────────────────────────

import z from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  demoOrPaidUserProcedure,
  invalidateSubscriptionCache,
  paidUserProcedure,
  protectedProcedure,
} from "../../trpc";
import { createUserService } from "./user.service";
import {
  adminDateRangeSchema,
  adminTestWiseSchema,
  dateRangeSchema,
  getAttemptsAdminSchema,
  getProgressSeriesSchema,
  heatmapAdminSchema,
  heatmapSchema,
  testWiseInputSchema,
  userIdSchema,
} from "./user.schema";
import R2Service from "~/server/services/r2.service";
import { account, subscription, user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { notificationsService } from "../notifications/notification.service";
import { emailService } from "~/server/services/mail.service";

const editUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  image: z.string().optional(),
});

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const found = ctx.user;

    return {
      ...found,
      profilePicUrl: found?.image ? R2Service.getPublicUrl(found.image) : null,
    };
  }),

  getMyAccounts: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.db.query.account.findMany({
      where: eq(account.userId, ctx.user.id),
      columns: {
        providerId: true,
      },
    });

    console.log(ctx.user);

    return { accounts, user: ctx.user };
  }),

  checkSubscription: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();

    // ── Demo user ──────────────────────────────────────────────────────────────
    if (ctx.user.isDemo) {
      const user = await ctx.db.query.user.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.user.id),
      });

      const expires = user?.demoExpiresAt;

      if (!expires || now > new Date(expires) || user?.demoRevoked) {
        return {
          active: false,
          isRevoked: true,
          isDemo: true,
          subscriptions: [],
        };
      }

      return {
        active: true,
        expiresAt: expires.toISOString(),
        isDemo: true,
        subscriptions: [],
      };
    }

    // ── Real user — fetch ALL active subs + latest expired ────────────────────
    const [activeSubs, pendingPayment] = await Promise.all([
      ctx.db.query.subscription.findMany({
        where: (s, { eq, and }) =>
          and(eq(s.userId, ctx.user.id), eq(s.status, "active")),
      }),
      ctx.db.query.payment.findFirst({
        where: (p, { eq, and }) =>
          and(eq(p.userId, ctx.user.id), eq(p.status, "pending")),
      }),
    ]);

    // Filter to truly active (not past expiry)
    const nowActiveSubs = activeSubs.filter((s) => s.currentPeriodEnd >= now);

    // If nothing active, grab most recent sub for expiry info
    if (nowActiveSubs.length === 0) {
      const lastSub = await ctx.db.query.subscription.findFirst({
        where: (s, { eq }) => eq(s.userId, ctx.user.id),
        orderBy: (s, { desc }) => desc(s.currentPeriodEnd),
      });

      return {
        active: false,
        expiresAt: lastSub?.currentPeriodEnd.toISOString() ?? null,
        isRevoked: lastSub?.status === "revoked",
        isDemo: false,
        pendingPayment,
        subscriptions: [],
        // Convenience flags
        hasAppAccess: false,
        hasTypingAccess: false,
      };
    }

    // Derive access from active plan set
    const plans = nowActiveSubs.map((s) => s.type);
    const hasAppAccess = plans.some((p) => p === "app");
    const hasTypingAccess = plans.some((p) => p === "typing");

    // Latest expiry across all active subs (for generic "expires at" display)
    const latestExpiry = nowActiveSubs.reduce(
      (max, s) => (s.currentPeriodEnd > max ? s.currentPeriodEnd : max),
      nowActiveSubs[0]!.currentPeriodEnd,
    );

    return {
      active: true,
      expiresAt: latestExpiry.toISOString(),
      isRevoked: false,
      isDemo: false,
      pendingPayment,
      hasAppAccess,
      hasTypingAccess,
      // Full list so UI can render per-plan expiry cards
      subscriptions: nowActiveSubs.map((s) => ({
        id: s.id,
        type: s.type,
        status: s.status,
        currentPeriodStart: s.currentPeriodStart.toISOString(),
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      })),
    };
  }),

  revokeUserSubscription: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        note: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const sub = await ctx.db.query.subscription.findFirst({
        where: (s, { eq, and }) =>
          and(eq(s.userId, input.userId), eq(s.status, "active")),
        orderBy: (s, { desc }) => desc(s.currentPeriodEnd),
        with: {
          user: true,
        },
      });

      if (!sub) {
        throw new Error("Active subscription not found");
      }

      await ctx.db
        .update(subscription)
        .set({
          status: "revoked",
          currentPeriodEnd: new Date(),
          revocationReason: input.note,
        })
        .where(eq(subscription.id, sub.id));

      await notificationsService.send({
        title: "Subscription Revoked",
        message: input.note,
        to: input.userId,
      });

      await invalidateSubscriptionCache(input.userId);

      if (sub.user?.email) {
        await emailService.sendEmail({
          to: sub.user.email,
          subject: "Your Subscription Has Been Revoked",
          html: `
          <p>Your subscription has been revoked by the admin.</p>
          <p><strong>Reason:</strong> ${input.note}</p>
          <p>If you think this is a mistake, please contact support.</p>
        `,
        });
      }

      return { ok: true };
    }),
  getUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      const found = await ctx.db.query.user.findFirst({
        columns: {
          email: true,
          name: true,
          image: true,
          gender: true,
          phone: true,
        },
        where: eq(user.id, input.userId),
      });
      return {
        ...found,
        profilePicUrl: found?.image
          ? R2Service.getPublicUrl(found.image)
          : null,
      };
    }),

  edit: demoOrPaidUserProcedure
    .input(editUserSchema)
    .mutation(async ({ input, ctx }) => {
      const patch: Partial<typeof user.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) patch.name = input.name;
      if (input.phone !== undefined) patch.phone = input.phone;
      if (input.gender !== undefined) patch.gender = input.gender;
      if (input.image !== undefined) patch.image = input.image;
      await ctx.db.update(user).set(patch).where(eq(user.id, ctx.user.id));
      return { ok: true };
    }),

  // ── Report ────────────────────────────────────────────────────────────────

  getReport: demoOrPaidUserProcedure
    .input(
      z
        .object({ type: z.enum(["assessment", "practice"]).optional() })
        .optional(),
    )
    .query(({ ctx, input }) =>
      createUserService(ctx.db).getReport(ctx.user.id, input?.type),
    ),

  getReportAdmin: adminProcedure
    .input(userIdSchema)
    .query(({ input, ctx }) =>
      createUserService(ctx.db).getReport(input.userId, input.type),
    ),

  // ── Progress ──────────────────────────────────────────────────────────────

  getProgress: demoOrPaidUserProcedure
    .input(dateRangeSchema.optional())
    .query(({ ctx, input }) =>
      createUserService(ctx.db).getProgress(
        ctx.user.id,
        input?.from,
        input?.to,
        input?.type,
      ),
    ),

  getProgressAdmin: adminProcedure
    .input(adminDateRangeSchema.optional())
    .query(({ input, ctx }) =>
      createUserService(ctx.db).getProgress(
        input?.userId!,
        input?.from,
        input?.to,
        input?.type,
      ),
    ),

  // ── Personal Bests ────────────────────────────────────────────────────────

  getPersonalBests: demoOrPaidUserProcedure
    .input(
      z
        .object({ type: z.enum(["assessment", "practice"]).optional() })
        .optional(),
    )
    .query(({ ctx, input }) =>
      createUserService(ctx.db).getPersonalBests(ctx.user.id, input?.type),
    ),

  getPersonalBestsAdmin: adminProcedure
    .input(userIdSchema)
    .query(({ input, ctx }) =>
      createUserService(ctx.db).getPersonalBests(input.userId, input.type),
    ),

  // ── Test-Wise Performance ─────────────────────────────────────────────────

  getTestWisePerformance: demoOrPaidUserProcedure
    .input(testWiseInputSchema.optional())
    .query(({ ctx, input }) =>
      createUserService(ctx.db).getTestWisePerformance(
        ctx.user.id,
        input?.limit,
        input?.type,
      ),
    ),

  getTestWisePerformanceAdmin: adminProcedure
    .input(adminTestWiseSchema.optional())
    .query(({ input, ctx }) =>
      createUserService(ctx.db).getTestWisePerformance(
        input?.userId!,
        input?.limit,
        input?.type,
      ),
    ),

  // ── Progress Series ───────────────────────────────────────────────────────

  getProgressSeries: demoOrPaidUserProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(200).default(60),
          type: z.enum(["assessment", "practice"]).optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      createUserService(ctx.db).getProgressSeries(
        ctx.user.id,
        input?.limit,
        input?.type,
      ),
    ),

  getProgressSeriesAdmin: adminProcedure
    .input(getProgressSeriesSchema)
    .query(({ input, ctx }) =>
      createUserService(ctx.db).getProgressSeries(
        input.userId!,
        input.limit,
        input.type,
      ),
    ),

  getAttemptsPaginated: demoOrPaidUserProcedure
    .input(
      z
        .object({
          page: z.number().min(0).default(0),
          limit: z.number().min(1).max(100).default(15),
          testId: z.string().optional(),
          type: z.enum(["assessment", "practice"]).optional(),
          date: z.string().optional(), // ISO date string "YYYY-MM-DD"
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      createUserService(ctx.db).getAttemptsPaginated(
        ctx.user.id,
        input?.page,
        input?.limit,
        input?.type,
        input?.testId,
        input?.date,
      ),
    ),

  getAttemptsPaginatedAdmin: adminProcedure
    .input(getAttemptsAdminSchema)
    .query(({ input, ctx }) =>
      createUserService(ctx.db).getAttemptsPaginated(
        input.userId,
        input.page,
        input.limit,
        input.type,
        input.testId,
      ),
    ),
});
