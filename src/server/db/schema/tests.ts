import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { admin } from "./admin";
import { user } from "./user";
import { relations, sql } from "drizzle-orm";

export const testTypeEnum = pgEnum("test_type", [
  "legal",
  "general",
  "special",
]);
export const testStatusEnum = pgEnum("test_status", ["draft", "active"]);
export const attemptTypeEnum = pgEnum("attempt_type", [
  "assessment",
  "practice",
]);
export const attemptStageEnum = pgEnum("attempt_stage", [
  "audio",
  "break",
  "writing",
  "submitted",
]);

export const tests = pgTable(
  "tests",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),

    title: text("title").notNull(),
    type: testTypeEnum("type").notNull(),

    matterPdfKey: text("matter_pdf_key").notNull(),
    outlinePdfKey: text("outline_pdf_key"),

    correctAnswer: text("correct_answer").notNull(),

    status: testStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    solutionAudioKey: text("solution_audio_key"),

    adminId: text("admin_id")
      .notNull()
      .default("system")
      .references(() => admin.id, { onDelete: "set default" }),
  },
  (t) => [
    index("tests_status_idx").on(t.status),
    index("tests_admin_id_idx").on(t.adminId),
    index("tests_type_status_idx").on(t.type, t.status),
  ],
);

export const testSpeeds = pgTable(
  "test_speeds",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),
    testId: text("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),

    wpm: integer("wpm").notNull(),

    audioKey: text("audio_key").notNull(),
    dictationSeconds: integer("dictation_seconds").notNull(),
    breakSeconds: integer("break_seconds").notNull(),
    writtenDurationSeconds: integer("written_duration_seconds").notNull(),

    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("test_speeds_test_id_idx").on(t.testId),
    index("test_speeds_test_wpm_idx").on(t.testId, t.wpm),
  ],
);

export const testAttempts = pgTable(
  "test_attempts",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    testId: text("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),

    speedId: text("speed_id")
      .notNull()
      .references(() => testSpeeds.id, { onDelete: "restrict" }),

    type: attemptTypeEnum("type").notNull(),
    stage: attemptStageEnum("stage").notNull().default("audio"),

    stageStartedAt: timestamp("stage_started_at", {
      withTimezone: true,
    }).defaultNow(),
    audioProgressSeconds: integer("audio_progress_seconds").default(0),
    lastAudioSyncAt: timestamp("last_audio_sync_at", { withTimezone: true }),

    answerDraft: text("answer_draft"),
    answerFinal: text("answer_final"),

    writingStartedAt: timestamp("writing_started_at", { withTimezone: true }),
    breakSkipped: boolean("break_skipped").default(false),
    audioSkipped: boolean("audio_skipped").default(false),

    score: integer("score"),
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    isSubmitted: boolean("is_submitted").default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_user_test").on(table.userId, table.testId),

    index("idx_active_attempts")
      .on(table.userId, table.stage)
      .where(sql`is_submitted = false`),

    index("idx_unscored")
      .on(table.testId, table.submittedAt)
      .where(sql`is_submitted = true AND score IS NULL`),

    index("idx_attempts_speed_id").on(table.speedId),
  ],
);

export const testsRelations = relations(tests, ({ many }) => ({
  speeds: many(testSpeeds),
  attempts: many(testAttempts),
}));

export const testSpeedsRelations = relations(testSpeeds, ({ one, many }) => ({
  test: one(tests, { fields: [testSpeeds.testId], references: [tests.id] }),
  attempts: many(testAttempts),
}));

export const userTestRelations = relations(user, ({ many }) => ({
  attempts: many(testAttempts),
}));

export const testAttemptsRelations = relations(testAttempts, ({ one }) => ({
  test: one(tests, { fields: [testAttempts.testId], references: [tests.id] }),
  speed: one(testSpeeds, {
    fields: [testAttempts.speedId],
    references: [testSpeeds.id],
  }),
  user: one(user, { fields: [testAttempts.userId], references: [user.id] }),
}));
