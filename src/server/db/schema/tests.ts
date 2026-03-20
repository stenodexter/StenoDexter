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

export const testTypeEnum = pgEnum("test_type", ["legal", "general"]);

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
    audioKey: text("audio_key").notNull(),
    matter: text("matter").notNull(),
    outline: text("outline").notNull(),
    breakSeconds: integer("break_seconds").notNull(),
    writtenDurationSeconds: integer("written_duration_seconds").notNull(),
    dictationSeconds: integer("dictation_duration_seconds").notNull(),
    status: testStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    adminId: text("admin_id")
      .notNull()
      .default("system")
      .references(() => admin.id, { onDelete: "set default" }),
  },
  (t) => [
    // Most common read: fetch all active tests for users
    index("tests_status_idx").on(t.status),

    // Admin dashboard: list tests by a specific admin
    index("tests_admin_id_idx").on(t.adminId),

    // Filtering by type (legal vs general) — often combined with status
    index("tests_type_status_idx").on(t.type, t.status),
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
  ],
);

export const testsRelations = relations(tests, ({ many }) => ({
  attempts: many(testAttempts),
}));

export const userTestRelations = relations(user, ({ many }) => ({
  attempts: many(testAttempts),
}));

export const testAttemptsRelations = relations(testAttempts, ({ one }) => ({
  test: one(tests, {
    fields: [testAttempts.testId],
    references: [tests.id],
  }),

  user: one(user, {
    fields: [testAttempts.userId],
    references: [user.id],
  }),
}));
