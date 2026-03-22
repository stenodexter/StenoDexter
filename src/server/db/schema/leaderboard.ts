import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { attemptTypeEnum, testAttempts, testSpeeds } from "./tests";
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

    // Kept for direct user-scoped queries without joining through attempts
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

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
    index("idx_results_user_type").on(t.userId, t.type),
  ],
);

export const leaderboard = pgTable(
  "leaderboard",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),

    testId: text("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),

    resultId: text("result_id")
      .notNull()
      .references(() => results.id, { onDelete: "restrict" })
      .unique(),

    speedId: text("speed_id")
      .notNull()
      .references(() => testSpeeds.id, { onDelete: "restrict" }),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    score: integer("score").notNull(),
    wpm: integer("wpm").notNull(),
    accuracy: integer("accuracy").notNull(),
    mistakes: integer("mistakes"),

    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("idx_leaderboard_test_user").on(t.testId, t.userId, t.speedId),

    index("idx_leaderboard_speed_score").on(t.speedId, t.score),

    index("idx_leaderboard_speed_id").on(t.speedId),
  ],
);

export const resultsRelations = relations(results, ({ one }) => ({
  attempt: one(testAttempts, {
    fields: [results.attemptId],
    references: [testAttempts.id],
  }),
  user: one(user, { fields: [results.userId], references: [user.id] }),
}));

export const leaderboardRelations = relations(leaderboard, ({ one }) => ({
  test: one(tests, { fields: [leaderboard.testId], references: [tests.id] }),
  speed: one(testSpeeds, {
    fields: [leaderboard.speedId],
    references: [testSpeeds.id],
  }),
  user: one(user, { fields: [leaderboard.userId], references: [user.id] }),
  result: one(results, {
    fields: [leaderboard.resultId],
    references: [results.id],
  }),
}));

// ─── service-layer logic (pseudocode reference) ───────────────────────────────
/*
  When a user starts an attempt on a test:

  1. Check if user has ANY prior result for this testId (any speedId):
       const hasAssessed = await db.query.results.findFirst({
         where: and(eq(results.userId, userId), eq(results.testId, testId))
       });

  2. If no prior result → this is their assessment attempt:
       - Create testAttempt with type = "assessment"
       - On submission → insert into leaderboard for the chosen speedId

  3. If prior result exists → practice:
       - Create testAttempt with type = "practice"
       - On submission → do NOT touch leaderboard

  This logic lives entirely in the attempt service.
  The DB uniqueIndex("idx_leaderboard_test_user") is a safety net —
  if the service ever bugs out and tries to insert a second leaderboard entry
  for the same (testId, userId), the DB will reject it.
*/
