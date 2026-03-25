import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../../trpc";
import { createPaymentService } from "./payments.service";
import {
  submitPaymentSchema,
  adminVerifyPaymentSchema,
  adminGetPaymentsSchema,
  userGetPaymentsSchema,
} from "./payments.schema";
import { subscription } from "~/server/db/schema";
import { desc } from "drizzle-orm";

export const paymentRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(submitPaymentSchema)
    .mutation(({ ctx, input }) =>
      createPaymentService(ctx.db).submitPayment(ctx.user.id, input),
    ),

  myPayments: protectedProcedure
    .input(userGetPaymentsSchema.optional())
    .query(({ ctx, input }) =>
      createPaymentService(ctx.db).getMyPayments(
        ctx.user.id,
        input?.page ?? 0,
        input?.limit ?? 10,
      ),
    ),

  verify: adminProcedure
    .input(adminVerifyPaymentSchema)
    .mutation(({ ctx, input }) =>
      createPaymentService(ctx.db).verifyPayment(ctx.admin.id, input),
    ),

  list: adminProcedure
    .input(adminGetPaymentsSchema.optional())
    .query(({ ctx, input }) =>
      createPaymentService(ctx.db).getPayments({
        status: input?.status,
        userId: input?.userId,
        page: input?.page ?? 0,
        limit: input?.limit ?? 20,
      }),
    ),

  getMine: protectedProcedure.query(async ({ ctx }) => {
    const active = await ctx.db.query.subscription.findFirst({
      where: (s, { eq, and }) =>
        and(eq(s.userId, ctx.user.id), eq(s.status, "active")),
      orderBy: desc(subscription.currentPeriodEnd),
    });

    return { subscription: active ?? null };
  }),
});
