import { createTRPCRouter, demoOrTypingUserProcedure } from "~/server/api/trpc";
import {
  createTypingAttemptSchema,
  syncTypingAttemptSchema,
  submitTypingAttemptSchema,
  getTypingAttemptSchema,
} from "./typing-attempt.schema";
import { typingAttemptService } from "./typing-attempt.service";

export const typingAttemptRouter = createTRPCRouter({
  create: demoOrTypingUserProcedure
    .input(createTypingAttemptSchema)
    .mutation(({ input, ctx }) =>
      typingAttemptService.create(input, ctx.user.id),
    ),

  sync: demoOrTypingUserProcedure
    .input(syncTypingAttemptSchema)
    .mutation(({ input, ctx }) =>
      typingAttemptService.sync(input, ctx.user.id),
    ),

  submit: demoOrTypingUserProcedure
    .input(submitTypingAttemptSchema)
    .mutation(({ input, ctx }) =>
      typingAttemptService.submit(input, ctx.user.id),
    ),

  getResume: demoOrTypingUserProcedure
    .input(getTypingAttemptSchema)
    .query(({ input, ctx }) =>
      typingAttemptService.getResume(input.attemptId, ctx.user.id),
    ),
});
