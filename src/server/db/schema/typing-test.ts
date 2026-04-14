// typing-test.schema.db.ts

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
import { sql } from "drizzle-orm";

export const typingAttemptStageEnum = pgEnum("typing_attempt_stage", [
  "writing",
  "submitted",
]);
export const typingAttemptTypeEnum = pgEnum("typing_attempt_type", [
  "test",
  "practice",
]);

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
    grossErrors: integer("gross_errors").notNull(), // stored as *2 to avoid float, or just numeric
    errorStrokes: integer("error_strokes").notNull(),
    totalStrokes: integer("total_strokes").notNull(),
    netStrokes: integer("net_strokes").notNull(),
    grossWpm: integer("gross_wpm").notNull(),
    netWpm: integer("net_wpm").notNull(),
    accuracy: integer("accuracy").notNull(),
    netDph: integer("net_dph").notNull(),
    marksOutOf50: integer("marks_out_of_50_x100").notNull(), // store as *100 e.g. 537 = 5.37
    transcriptionTimeSeconds: integer("transcription_time_seconds").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("typing_results_user_idx").on(t.userId)],
);
