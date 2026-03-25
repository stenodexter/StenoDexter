// ─── server/api/routers/user/user.router.ts ───────────────────────────────────

import z from "zod";
import {
  adminProcedure,
  createTRPCRouter,
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
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";

const editUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  image: z.string().optional(),
});

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const found = await ctx.db.query.user.findFirst({
      where: eq(user.id, ctx.user.id),
    });
    return {
      ...found,
      profilePicUrl: found?.image ? R2Service.getPublicUrl(found.image) : null,
    };
  }),

  paidMe: paidUserProcedure.query(async ({ ctx }) => {
    return ctx.subscription.currentPeriodEnd >= new Date();
  }),

  checkSubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await ctx.db.query.subscription.findFirst({
      where: (s, { eq, and }) =>
        and(eq(s.userId, ctx.user.id), eq(s.status, "active")),
      orderBy: (s, { desc }) => desc(s.currentPeriodEnd),
    });

    const pendingPayment = await ctx.db.query.payment.findFirst({
      where: (p, { eq, and }) =>
        and(eq(p.userId, ctx.user.id), eq(p.status, "pending")),
    });

    if (!sub) return { active: false, expiresAt: null, pendingPayment };

    const now = new Date();

    return {
      active: sub.currentPeriodEnd >= now,
      expiresAt: sub.currentPeriodEnd.toISOString(),
      pendingPayment,
    };
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

  edit: protectedProcedure
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

  getReport: protectedProcedure
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

  getProgress: protectedProcedure
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

  getPersonalBests: protectedProcedure
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

  getTestWisePerformance: protectedProcedure
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

  getProgressSeries: protectedProcedure
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

  // ── Paginated Attempts ────────────────────────────────────────────────────

  getAttemptsPaginated: protectedProcedure
    .input(
      z
        .object({
          page: z.number().min(0).default(0),
          limit: z.number().min(1).max(100).default(15),
          testId: z.string().optional(),
          type: z.enum(["assessment", "practice"]).optional(),
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

  // ── Heatmap ───────────────────────────────────────────────────────────────

  getHeatmap: protectedProcedure
    .input(heatmapSchema)
    .query(({ ctx, input }) =>
      createUserService(ctx.db).getHeatmap(
        ctx.user.id,
        input.from,
        input.to,
        input.includePractice,
      ),
    ),

  getHeatmapAdmin: adminProcedure
    .input(heatmapAdminSchema)
    .query(({ input, ctx }) =>
      createUserService(ctx.db).getHeatmap(
        input.userId,
        input.from,
        input.to,
        input.includePractice,
      ),
    ),
});
