import { createTRPCRouter, paidUserProcedure } from "~/server/api/trpc";
import {
  createAttemptSchema,
  syncAttemptSchema,
  submitAttemptSchema,
  getAttemptSchema,
} from "./attempt.schema";
import { attemptService } from "./attempt.service";

export const attemptRouter = createTRPCRouter({
  create: paidUserProcedure
    .input(createAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.create(input, ctx.user.id)),

  sync: paidUserProcedure
    .input(syncAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.sync(input, ctx.user.id)),

  submit: paidUserProcedure
    .input(submitAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.submit(input, ctx.user.id)),

  getResume: paidUserProcedure
    .input(getAttemptSchema)
    .query(({ input, ctx }) =>
      attemptService.getResume(input.attemptId, ctx.user.id),
    ),
});
