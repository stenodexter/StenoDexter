import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  createAttemptSchema,
  syncAttemptSchema,
  submitAttemptSchema,
  getAttemptSchema,
} from "./attempt.schema";
import { attemptService } from "./attempt.service";

export const attemptRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.create(input, ctx.user.id)),

  sync: protectedProcedure
    .input(syncAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.sync(input, ctx.user.id)),

  submit: protectedProcedure
    .input(submitAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.submit(input, ctx.user.id)),

  getResume: protectedProcedure
    .input(getAttemptSchema)
    .query(({ input, ctx }) =>
      attemptService.getResume(input.attemptId, ctx.user.id),
    ),
});
