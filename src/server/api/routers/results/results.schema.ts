import z from "zod";

export const getTestResultsSchema = z.object({
  testId: z.string(),

  page: z.number().min(0).default(0),
  limit: z.number().min(1).max(100).default(20),

  type: z.enum(["assessment", "practice"]).optional(),

  sortBy: z.enum(["score", "mistakes", "time"]).default("score"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetTestResults = z.infer<typeof getTestResultsSchema>;

export const getResultsAdminSchema = z.object({
  // testId is now optional — omit for a global feed
  testId: z.string().optional(),

  page: z.number().min(0).default(0),
  limit: z.number().min(1).max(100).default(20),

  type: z.enum(["practice", "assessment"]).optional(),
  userId: z.string().optional(),

  minScore: z.number().optional(),
  maxScore: z.number().optional(),

  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),

  sortBy: z
    .enum(["score", "mistakes", "time", "wpm", "accuracy"])
    .default("time"),

  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetResultsAdminInput = z.infer<typeof getResultsAdminSchema>;

export const GetTopPerformersByTestSchema = z.object({
  testId: z.string(),
  limit: z.number().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});
