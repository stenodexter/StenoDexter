import { z } from "zod";

export const createTypingAttemptSchema = z.object({
  testId: z.string().min(1),
});

export const syncTypingAttemptSchema = z.object({
  attemptId: z.string().min(1),
  answerDraft: z.string().optional(),
  markWritingStarted: z.boolean().optional(),
});

export const submitTypingAttemptSchema = z.object({
  attemptId: z.string().min(1),
  answerFinal: z.string().optional().default(" "),
});

export const getTypingAttemptSchema = z.object({
  attemptId: z.string().min(1),
});

export type CreateTypingAttemptInput = z.infer<
  typeof createTypingAttemptSchema
>;
export type SyncTypingAttemptInput = z.infer<typeof syncTypingAttemptSchema>;
export type SubmitTypingAttemptInput = z.infer<
  typeof submitTypingAttemptSchema
>;
