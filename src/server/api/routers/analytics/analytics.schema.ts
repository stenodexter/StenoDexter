import { z } from "zod";

export const dateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

export const analyticsFilterSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
  testId: z.string().optional(),
});

export const getGlobalTopPerformersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().optional().default(12),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const getUsersSchema = z.object({
  query: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortField: z.enum(["name", "joined", "renew"]).default("joined"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  filter: z.enum(["all", "active"]).default("all"), // ← add this
});

export const getTestStatsSchema = z.object({
  testId: z.string(),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type AnalyticsFilterInput = z.infer<typeof analyticsFilterSchema>;
export type GetUsersInput = z.infer<typeof getUsersSchema>;
