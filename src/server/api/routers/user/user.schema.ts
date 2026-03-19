import z from "zod";

const attemptTypeFilter = z.enum(["assessment", "practice"]).optional();

// Update existing schemas to include type:
export const userIdSchema = z.object({
  userId: z.string(),
  type: attemptTypeFilter,
});

export const adminDateRangeSchema = z.object({
  userId: z.string(),
  from: z.date().optional(),
  to: z.date().optional(),
  type: attemptTypeFilter,
});

export const adminTestWiseSchema = z.object({
  userId: z.string(),
  limit: z.number().min(1).max(200).default(50),
  type: attemptTypeFilter,
});

export const getProgressSeriesSchema = z.object({
  userId: z.string().optional(),
  limit: z.number().min(1).max(200).default(60),
  type: attemptTypeFilter,
});

export const getAttemptsAdminSchema = z.object({
  userId: z.string(),
  page: z.number().min(0).default(0),
  limit: z.number().min(1).max(100).default(15),
  type: attemptTypeFilter,
});

// User-facing schemas (no userId — comes from ctx):
export const dateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
  type: attemptTypeFilter,
});

export const testWiseInputSchema = z.object({
  limit: z.number().min(1).max(200).default(50),
  type: attemptTypeFilter,
});
