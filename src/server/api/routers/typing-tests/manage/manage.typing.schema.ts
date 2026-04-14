import { z } from "zod";

export const createTypingTestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  correctTranscription: z.string().min(1, "Correct transcription is required"),
  durationSeconds: z.number().int().positive("Duration must be positive"),
});

export const updateTypingTestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  correctTranscription: z.string().min(1).optional(),
  durationSeconds: z.number().int().positive().optional(),
});

export const getTypingTestSchema = z.object({
  id: z.string().min(1),
});

export const listTypingTestsSchema = z.object({
  page: z.number().int().min(1).default(1),
  search: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).default(20),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  date: z.coerce.date().optional(),
});

export type CreateTypingTestInput = z.infer<typeof createTypingTestSchema>;
export type UpdateTypingTestInput = z.infer<typeof updateTypingTestSchema>;
export type GetTypingTestInput = z.infer<typeof getTypingTestSchema>;
export type ListTypingTestsInput = z.infer<typeof listTypingTestsSchema>;
