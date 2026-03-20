import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
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
      .unique(), // already creates an index — don't add another

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

    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_results_user_id").on(t.userId),

    index("idx_results_test_id").on(t.testId),

    index("idx_results_user_test").on(t.userId, t.testId),

    index("idx_results_user_type").on(t.userId, t.type),
  ],
);

export const leaderboard = pgTable(
  "leaderboard",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),

    // ✅ Added FK constraints — was plain text before
    testId: text("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    bestScore: integer("best_score").notNull(),
    bestWpm: integer("best_wpm"),
    bestAccuracy: integer("best_accuracy"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("idx_leaderboard_test_user").on(t.testId, t.userId),

    index("idx_leaderboard_test_score").on(t.testId, t.bestScore),
  ],
);

// Relations unchanged
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
