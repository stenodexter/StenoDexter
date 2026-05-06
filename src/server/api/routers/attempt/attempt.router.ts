import {
  adminProcedure,
  createTRPCRouter,
  demoOrPaidUserProcedure,
} from "~/server/api/trpc";
import {
  createAttemptSchema,
  syncAttemptSchema,
  submitAttemptSchema,
  getAttemptSchema,
} from "./attempt.schema";
import { attemptService } from "./attempt.service";
import z from "zod";

export const attemptRouter = createTRPCRouter({
  create: demoOrPaidUserProcedure
    .input(createAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.create(input, ctx.user.id)),

  sync: demoOrPaidUserProcedure
    .input(syncAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.sync(input, ctx.user.id)),

  submit: demoOrPaidUserProcedure
    .input(submitAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.submit(input, ctx.user)),

  recheck: adminProcedure
    .input(
      z.object({
        attemptId: z.string(),
      }),
    )
    .mutation(({ input }) => attemptService.recheck(input.attemptId)),

  recheckAll: adminProcedure.mutation(() => attemptService.recheckAll()),

  recheckAllProgress: adminProcedure.query(() =>
    attemptService.recheckAllProgress(),
  ),

  getResume: demoOrPaidUserProcedure
    .input(getAttemptSchema)
    .query(({ input, ctx }) =>
      attemptService.getResume(input.attemptId, ctx.user.id),
    ),
});
