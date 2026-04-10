import { z } from "zod";

export const createAttemptSchema = z.object({
  testId: z.string().min(1, "Test ID is required"),
  speedId: z.string().min(1, "Speed variant is required"),
});

export const syncAttemptSchema = z.object({
  attemptId: z.string().min(1, "Attempt ID is required"),
  audioProgressSeconds: z
    .number()
    .int()
    .min(0, "Progress cannot be negative")
    .optional(),
  answerDraft: z.string().optional(),
  stage: z.enum(["audio", "break", "writing", "submitted"]).optional(),
  breakSkipped: z.boolean().optional(),
  markAudioStarted: z.boolean().optional(),
  audioSkipped: z.boolean().optional(),
  markWritingStarted: z.boolean().optional(),
});

export const submitAttemptSchema = z.object({
  attemptId: z.string().min(1, "Attempt ID is required"),
  answerFinal: z.string().min(1, "Answer cannot be empty"),
});

export const getAttemptSchema = z.object({
  attemptId: z.string().min(1, "Attempt ID is required"),
});

export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;
export type SyncAttemptInput = z.infer<typeof syncAttemptSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
