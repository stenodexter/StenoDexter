// ─── attempt.schema.ts ───────────────────────────────────────────────────────
import { z } from "zod";

export const createAttemptSchema = z.object({
  testId: z.string(),
});

export const syncAttemptSchema = z.object({
  attemptId: z.string(),
  audioProgressSeconds: z.number().int().min(0).optional(),
  answerDraft: z.string().optional(),
  stage: z.enum(["audio", "break", "writing", "submitted"]).optional(),
  breakSkipped: z.boolean().optional(),
  // Sent once when countdown ends — stamps the real audio start time server-side
  markAudioStarted: z.boolean().optional(),
  markWrittingStarted: z.boolean().optional(),
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
