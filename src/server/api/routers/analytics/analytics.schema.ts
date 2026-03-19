import { z } from "zod";

export const dateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

// optional filters for future scaling
export const analyticsFilterSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
  testId: z.string().optional(),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type AnalyticsFilterInput = z.infer<typeof analyticsFilterSchema>;

export const getGlobalTopPerformersSchema = z.object({
  limit: z.number().default(10),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});
