// ─── attempt.router.ts ───────────────────────────────────────────────────────
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  createAttemptSchema,
  syncAttemptSchema,
  submitAttemptSchema,
  getAttemptSchema,
} from "./attempt.schema";
import { attemptService } from "./attempt.service";

export const attemptRouter = createTRPCRouter({
  /** Create attempt → returns attemptId to redirect to */
  create: protectedProcedure
    .input(createAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.create(input, ctx.user.id)),

  /** Sync progress / stage transitions */
  sync: protectedProcedure
    .input(syncAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.sync(input, ctx.user.id)),

  /** Final submit */
  submit: protectedProcedure
    .input(submitAttemptSchema)
    .mutation(({ input, ctx }) => attemptService.submit(input, ctx.user.id)),

  /** Resume hydration on page load */
  getResume: protectedProcedure
    .input(getAttemptSchema)
    .query(({ input, ctx }) =>
      attemptService.getResume(input.attemptId, ctx.user.id),
    ),
});
