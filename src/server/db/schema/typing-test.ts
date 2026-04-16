// typing-test.schema.db.ts

import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { admin } from "./admin";
import { user } from "./user";
import { relations, sql } from "drizzle-orm";

export const typingAttemptStageEnum = pgEnum("typing_attempt_stage", [
  "writing",
  "submitted",
]);
export const typingAttemptTypeEnum = pgEnum("typing_attempt_type", [
  "test",
  "practice",
]);

// ── tables ────────────────────────────────────────────────────────────────────

export const typingTests = pgTable("typing_tests", {
  id: text("id")
    .$defaultFn(() => nanoid(8))
    .primaryKey(),
  title: text("title").notNull(),
  correctTranscription: text("correct_transcription").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  adminId: text("admin_id")
    .notNull()
    .default("system")
    .references(() => admin.id, { onDelete: "set default" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const typingAttempts = pgTable(
  "typing_attempts",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    testId: text("test_id")
      .notNull()
      .references(() => typingTests.id, { onDelete: "cascade" }),
    type: typingAttemptTypeEnum("type").notNull(),
    stage: typingAttemptStageEnum("stage").notNull().default("writing"),
    answerDraft: text("answer_draft"),
    answerFinal: text("answer_final"),
    writingStartedAt: timestamp("writing_started_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    isSubmitted: boolean("is_submitted").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("typing_attempts_user_test_idx").on(t.userId, t.testId),
    index("typing_attempts_active_idx")
      .on(t.userId, t.stage)
      .where(sql`is_submitted = false`),
    index("typing_attempts_test_id_idx").on(t.testId),
  ],
);

export const typingResults = pgTable(
  "typing_results",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => typingAttempts.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fullMistakes: integer("full_mistakes").notNull(),
    halfMistakes: integer("half_mistakes").notNull(),
    grossErrors: integer("gross_errors").notNull(),   // stored ×2
    errorStrokes: integer("error_strokes").notNull(),
    totalStrokes: integer("total_strokes").notNull(),
    netStrokes: integer("net_strokes").notNull(),
    grossWpm: integer("gross_wpm").notNull(),
    netWpm: integer("net_wpm").notNull(),
    accuracy: integer("accuracy").notNull(),
    netDph: integer("net_dph").notNull(),
    marksOutOf50: integer("marks_out_of_50_x100").notNull(), // stored ×100
    transcriptionTimeSeconds: integer("transcription_time_seconds").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("typing_results_user_idx").on(t.userId),
    index("typing_results_attempt_idx").on(t.attemptId),
  ],
);

export const typingLeaderboard = pgTable(
  "typing_leaderboard",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),

    testId: text("test_id")
      .notNull()
      .references(() => typingTests.id, { onDelete: "cascade" }),

    resultId: text("result_id")
      .notNull()
      .references(() => typingResults.id, { onDelete: "restrict" })
      .unique(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    netDph: integer("net_dph").notNull(),
    marksOutOf50: integer("marks_out_of_50_x100").notNull(), // stored ×100
    accuracy: integer("accuracy").notNull(),
    fullMistakes: integer("full_mistakes").notNull(),
    transcriptionTimeSeconds: integer("transcription_time_seconds").notNull(),

    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    // one entry per user per test — safety net matches service logic
    uniqueIndex("typing_leaderboard_test_user_idx").on(t.testId, t.userId),
    // leaderboard sort: fewer mistakes first, then higher dph
    index("typing_leaderboard_test_rank_idx").on(
      t.testId,
      t.fullMistakes,
      t.netDph,
    ),
  ],
);

// ── relations ─────────────────────────────────────────────────────────────────

export const typingTestsRelations = relations(typingTests, ({ many }) => ({
  attempts: many(typingAttempts),
  leaderboard: many(typingLeaderboard),
}));

export const typingAttemptsRelations = relations(
  typingAttempts,
  ({ one }) => ({
    test: one(typingTests, {
      fields: [typingAttempts.testId],
      references: [typingTests.id],
    }),
    user: one(user, {
      fields: [typingAttempts.userId],
      references: [user.id],
    }),
    result: one(typingResults, {
      fields: [typingAttempts.id],
      references: [typingResults.attemptId],
    }),
  }),
);

export const typingResultsRelations = relations(typingResults, ({ one }) => ({
  attempt: one(typingAttempts, {
    fields: [typingResults.attemptId],
    references: [typingAttempts.id],
  }),
  user: one(user, {
    fields: [typingResults.userId],
    references: [user.id],
  }),
  leaderboardEntry: one(typingLeaderboard, {
    fields: [typingResults.id],
    references: [typingLeaderboard.resultId],
  }),
}));

export const typingLeaderboardRelations = relations(
  typingLeaderboard,
  ({ one }) => ({
    test: one(typingTests, {
      fields: [typingLeaderboard.testId],
      references: [typingTests.id],
    }),
    user: one(user, {
      fields: [typingLeaderboard.userId],
      references: [user.id],
    }),
    result: one(typingResults, {
      fields: [typingLeaderboard.resultId],
      references: [typingResults.id],
    }),
  }),
);