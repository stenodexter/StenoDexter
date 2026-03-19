import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { attemptTypeEnum, testAttempts } from "./tests";

import { user } from "./user";
import { tests } from "./tests";
import { relations } from "drizzle-orm";

export const results = pgTable(
  "results",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),

    attemptId: text("attempt_id")
      .notNull()
      .references(() => testAttempts.id, { onDelete: "cascade" })
      .unique(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    testId: text("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),

    type: attemptTypeEnum("type").notNull(),

    score: integer("score").notNull(),
    wpm: integer("wpm").notNull(),
    accuracy: integer("accuracy").notNull(),

    mistakes: integer("mistakes"),

    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
    }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_results_user").on(table.userId),
    testIdx: index("idx_results_test").on(table.testId),
    typeIdx: index("idx_results_type").on(table.type),
  }),
);

export const leaderboard = pgTable("leaderboard", {
  id: text("id")
    .$defaultFn(() => nanoid(8))
    .primaryKey(),

  testId: text("test_id").notNull(),
  userId: text("user_id").notNull(),

  bestScore: integer("best_score").notNull(),
  bestWpm: integer("best_wpm"),
  bestAccuracy: integer("best_accuracy"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const resultsRelations = relations(results, ({ one }) => ({
  attempt: one(testAttempts, {
    fields: [results.attemptId],
    references: [testAttempts.id],
  }),

  test: one(tests, {
    fields: [results.testId],
    references: [tests.id],
  }),

  user: one(user, {
    fields: [results.userId],
    references: [user.id],
  }),
}));

export const leaderboardRelations = relations(leaderboard, ({ one }) => ({
  test: one(tests, {
    fields: [leaderboard.testId],
    references: [tests.id],
  }),

  user: one(user, {
    fields: [leaderboard.userId],
    references: [user.id],
  }),
}));
