import { z } from "zod";

export const TEST_TYPE_VALUES = ["legal", "general", "special"] as const;
export const TEST_STATUS_VALUES = ["draft", "active"] as const;

export const TestTypeEnum = z.enum(TEST_TYPE_VALUES);
export const TestStatusEnum = z.enum(TEST_STATUS_VALUES);
export type TestType = z.infer<typeof TestTypeEnum>;
export type TestStatus = z.infer<typeof TestStatusEnum>;

// ── Speed variant ─────────────────────────────────────────────────────────────

export const createSpeedSchema = z.object({
  wpm: z.number().int().positive(),
  audioKey: z.string().min(1),
  dictationSeconds: z.number().int().nonnegative(),
  breakSeconds: z.number().int().nonnegative(),
  writtenDurationSeconds: z.number().int().positive(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const updateSpeedSchema = createSpeedSchema.partial().extend({
  id: z.string(), // existing speed id
});

// ── Test CRUD ─────────────────────────────────────────────────────────────────

export const createTestSchema = z.object({
  title: z.string().min(1),
  type: TestTypeEnum,
  matterPdfKey: z.string().min(1),
  outlinePdfKey: z.string().optional(),
  correctAnswer: z.string().min(1),
  solutionAudioKey: z.string().optional(),
  status: TestStatusEnum.default("draft"),

  // At least one speed must be provided when creating a test
  speeds: z.array(createSpeedSchema).min(1, "At least one speed is required"),
});

export const updateTestSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  type: TestTypeEnum.optional(),
  matterPdfKey: z.string().optional(),
  outlinePdfKey: z.string().nullable().optional(),
  correctAnswer: z.string().optional(),
  solutionAudioKey: z.string().nullable().optional(),
  status: TestStatusEnum.optional(),

  // Speeds to upsert (create if no id, update if id present)
  upsertSpeeds: z
    .array(z.union([createSpeedSchema, updateSpeedSchema]))
    .optional(),

  // Speed ids to delete
  deleteSpeeds: z.array(z.string()).optional(),
});

export const getTestSchema = z.object({ id: z.string() });

export const listTestsSchema = z.object({
  page: z.number().int().min(1).default(1),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  type: z.union([TestTypeEnum, z.literal("all")]).default("all"),
  status: z.union([TestStatusEnum, z.literal("all")]).default("all"),
});

export const listUserTestsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().optional().default(12),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  type: z.union([TestTypeEnum, z.literal("all")]).default("all"),
  q: z.string().optional(),
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

// ── Speed management (standalone — called after test creation) ────────────────

export const addSpeedSchema = createSpeedSchema.extend({
  testId: z.string(),
});

export const editSpeedSchema = createSpeedSchema.partial().extend({
  id: z.string(),
  testId: z.string(), // for ownership verification
});

export const deleteSpeedSchema = z.object({
  id: z.string(),
  testId: z.string(), // for ownership verification
});

export const reorderSpeedsSchema = z.object({
  testId: z.string(),
  // Array of { id, sortOrder } — only the order changes
  speeds: z
    .array(
      z.object({
        id: z.string(),
        sortOrder: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export const saveDraftSchema = z.object({
  title: z.string().min(1).default("Untitled Draft"),
  type: TestTypeEnum.default("general"),
  matterPdfKey: z.string().optional().default(""),
  outlinePdfKey: z.string().optional(),
  correctAnswer: z.string().optional().default(""),
  solutionAudioKey: z.string().optional(),
  speeds: z
    .array(
      z.object({
        wpm: z.number().int().nonnegative().default(0),
        audioKey: z.string().default(""),
        dictationSeconds: z.number().int().nonnegative().default(0),
        breakSeconds: z.number().int().nonnegative().default(0),
        writtenDurationSeconds: z.number().int().nonnegative().default(0),
        sortOrder: z.number().int().nonnegative().default(0),
      }),
    )
    .optional()
    .default([]),
});

export type SaveDraftInput = z.infer<typeof saveDraftSchema>;
export type AddSpeedInput = z.infer<typeof addSpeedSchema>;
export type EditSpeedInput = z.infer<typeof editSpeedSchema>;
export type DeleteSpeedInput = z.infer<typeof deleteSpeedSchema>;
export type ReorderSpeedsInput = z.infer<typeof reorderSpeedsSchema>;
export type UpdateSpeedInput = z.infer<typeof updateSpeedSchema>;
export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type GetTestInput = z.infer<typeof getTestSchema>;
export type ListTestsInput = z.infer<typeof listTestsSchema>;
export type ListUserTestsInput = z.infer<typeof listUserTestsSchema>;
export type GetTestsAdminInput = z.infer<typeof getTestsAdminSchema>;
export type SearchTestsInput = z.infer<typeof searchTestsSchema>;
