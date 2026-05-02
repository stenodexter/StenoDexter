import {
  adminProcedure,
  createTRPCRouter,
  demoOrTypingUserProcedure,
} from "~/server/api/trpc";
import { typingAttemptService } from "../attempt/typing-attempt.service";
import z from "zod";

// typing-result.router.ts
export const typingResultRouter = createTRPCRouter({
  getResult: demoOrTypingUserProcedure
    .input(z.object({ attemptId: z.string() }))
    .query(
      async ({ input, ctx }) =>
        await typingAttemptService.getResult(input.attemptId, ctx.user.id),
    ),

  getResultAdmin: adminProcedure
    .input(z.object({ attemptId: z.string() }))
    .query(
      async ({ input }) =>
        await typingAttemptService.getResultAdmin(input.attemptId),
    ),

  getUserAttempts: demoOrTypingUserProcedure
    .input(z.object({ testId: z.string() }))
    .query(
      async ({ input, ctx }) =>
        await typingAttemptService.getUserAttempts(input.testId, ctx.user.id),
    ),

  getUserAttemptsAdmin: adminProcedure
    .input(z.object({ testId: z.string(), userId: z.string() }))
    .query(
      async ({ input }) =>
        await typingAttemptService.getUserAttempts(input.testId, input.userId),
    ),
});
