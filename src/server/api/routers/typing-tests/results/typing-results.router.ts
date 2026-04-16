import {
  adminProcedure,
  createTRPCRouter,
  demoOrPaidUserProcedure,
} from "~/server/api/trpc";
import { typingAttemptService } from "../attempt/typing-attempt.service";
import z from "zod";

// typing-result.router.ts
export const typingResultRouter = createTRPCRouter({
  getResult: demoOrPaidUserProcedure
    .input(z.object({ attemptId: z.string() }))
    .query(({ input, ctx }) =>
      typingAttemptService.getResult(input.attemptId, ctx.user.id),
    ),

  getResultAdmin: adminProcedure
    .input(z.object({ attemptId: z.string() }))
    .query(({ input }) => typingAttemptService.getResultAdmin(input.attemptId)),

  getUserAttempts: demoOrPaidUserProcedure
    .input(z.object({ testId: z.string() }))
    .query(({ input, ctx }) =>
      typingAttemptService.getUserAttempts(input.testId, ctx.user.id),
    ),

  getUserAttemptsAdmin: adminProcedure
    .input(z.object({ testId: z.string(), userId: z.string() }))
    .query(({ input }) =>
      typingAttemptService.getUserAttempts(input.testId, input.userId),
    ),
});
