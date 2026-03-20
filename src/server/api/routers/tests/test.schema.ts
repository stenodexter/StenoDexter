import { z } from "zod";

export const TEST_TYPE_VALUES = ["legal", "general"] as const;
export const TestTypeEnum = z.enum(TEST_TYPE_VALUES);
export type TestType = z.infer<typeof TestTypeEnum>;

export const TEST_STATUS_VALUES = ["draft", "active"] as const;
export const TestStatusEnum = z.enum(TEST_STATUS_VALUES);
export type TestStatus = z.infer<typeof TestStatusEnum>;

export const createTestSchema = z.object({
  title: z.string().min(1),

  type: TestTypeEnum,

  audioKey: z.string(),

  matter: z.string(),
  outline: z.string().nullable().default(null),

  breakSeconds: z.number().int().nonnegative(),
  writtenDurationSeconds: z.number().int().positive(),
  dictationSeconds: z.number().int().nonnegative(),

  status: TestStatusEnum.default("draft"),
});

export const updateTestSchema = createTestSchema.extend({
  id: z.string(),
  status: TestStatusEnum.optional(),
});

export const getTestSchema = z.object({
  id: z.string(),
});

export const listTestsSchema = z.object({
  page: z.number().int().min(1).default(1),

  sort: z.enum(["newest", "oldest"]).default("newest"),

  type: z.union([TestTypeEnum, z.literal("all")]).default("all"),
  status: z.union([TestStatusEnum, z.literal("all")]).default("all"),
});

export const listUserTestsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().optional().default(12),
});

export const getTestsAdminSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),

  status: TestStatusEnum.optional(),
  type: TestTypeEnum.optional(),

  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),

  adminId: z.string().optional(),

  sort: z.enum(["newest", "oldest"]).default("newest"),
});

export const searchTestsSchema = z.object({
  query: z.string().min(1),
  type: z.enum(["legal", "general"]).optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(12),
});

export type SearchTestsInput = z.infer<typeof searchTestsSchema>;
export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type GetTestInput = z.infer<typeof getTestSchema>;
export type ListTestsInput = z.infer<typeof listTestsSchema>;
export type ListUserTestsInput = z.infer<typeof listUserTestsSchema>;
export type GetTestsAdminInput = z.infer<typeof getTestsAdminSchema>;
