import { z } from "zod";

export const createAttemptSchema = z.object({
  testId: z.string(),
  speedId: z.string(), // user picks which speed variant to attempt
});

export const syncAttemptSchema = z.object({
  attemptId: z.string(),
  audioProgressSeconds: z.number().int().min(0).optional(),
  answerDraft: z.string().optional(),
  stage: z.enum(["audio", "break", "writing", "submitted"]).optional(),
  breakSkipped: z.boolean().optional(),
  markAudioStarted: z.boolean().optional(),
  markWritingStarted: z.boolean().optional(), // fixed typo from original
});

export const submitAttemptSchema = z.object({
  attemptId: z.string(),
  answerFinal: z.string(),
});

export const getAttemptSchema = z.object({
  attemptId: z.string(),
});

export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;
export type SyncAttemptInput = z.infer<typeof syncAttemptSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
