// typing-leaderboard.service.ts
import { and, desc, eq, ilike, or, sql, count } from "drizzle-orm";
import {
  typingAttempts,
  typingTests,
  typingResults,
  typingLeaderboard,
  user,
} from "~/server/db/schema";

import type { db as dbInstance } from "~/server/db";
type Db = typeof dbInstance;

export function createTypingLeaderboardService(db: Db) {
  return {
    /**
     * Ranked leaderboard for a single test (best attempt per user).
     * Ranked by: marksOutOf50 DESC, accuracy DESC, transcriptionTimeSeconds ASC
     */
    async getLeaderboard(
      testId: string,
      opts?: { limit?: number },
    ) {
      const limit = opts?.limit ?? 100;

      // Best result per user: highest marks, then highest accuracy, then least time
      const rows = await db
        .select({
          userId: typingLeaderboard.userId,
          resultId: typingLeaderboard.resultId,
          netDph: typingLeaderboard.netDph,
          marksOutOf50: typingLeaderboard.marksOutOf50,
          accuracy: typingLeaderboard.accuracy,
          fullMistakes: typingLeaderboard.fullMistakes,
          transcriptionTimeSeconds: typingLeaderboard.transcriptionTimeSeconds,
          attemptedAt: typingLeaderboard.attemptedAt,
          userName: user.name,
          userEmail: user.email,
          userCode: user.userCode,
          // result details
          grossWpm: typingResults.grossWpm,
          netWpm: typingResults.netWpm,
          totalStrokes: typingResults.totalStrokes,
          netStrokes: typingResults.netStrokes,
          halfMistakes: typingResults.halfMistakes,
          grossErrors: typingResults.grossErrors,
        })
        .from(typingLeaderboard)
        .innerJoin(user, eq(typingLeaderboard.userId, user.id))
        .innerJoin(typingResults, eq(typingLeaderboard.resultId, typingResults.id))
        .where(eq(typingLeaderboard.testId, testId))
        .orderBy(
          desc(typingLeaderboard.marksOutOf50),
          desc(typingLeaderboard.accuracy),
          typingLeaderboard.transcriptionTimeSeconds,
        )
        .limit(limit);

      return rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        resultId: r.resultId,
        user: {
          name: r.userName,
          email: r.userEmail,
          userCode: r.userCode,
        },
        marksOutOf50: r.marksOutOf50 / 100, // stored as integer * 100
        accuracy: r.accuracy,
        netDph: r.netDph,
        grossWpm: r.grossWpm,
        netWpm: r.netWpm,
        fullMistakes: r.fullMistakes,
        halfMistakes: r.halfMistakes,
        grossErrors: r.grossErrors / 2, // stored as * 2
        totalStrokes: r.totalStrokes,
        netStrokes: r.netStrokes,
        transcriptionTimeSeconds: r.transcriptionTimeSeconds,
        attemptedAt: r.attemptedAt,
      }));
    },

    /**
     * Paginated list of users who attempted a test (for admin).
     */
    async getUsersForTest(input: {
      testId: string;
      page: number;
      limit: number;
      search?: string;
      type?: "test" | "practice";
    }) {
      const { testId, page, limit, search, type } = input;
      const offset = page * limit;

      const whereConditions = [
        eq(typingAttempts.testId, testId),
        eq(typingAttempts.isSubmitted, true),
      ];

      if (type) whereConditions.push(eq(typingAttempts.type, type));

      // Sub-query: per-user aggregates
      const subq = db
        .select({
          userId: typingAttempts.userId,
          attempts: count(typingAttempts.id).as("attempts"),
          lastAttemptAt: sql<Date>`max(${typingAttempts.submittedAt})`.as(
            "last_attempt_at",
          ),
        })
        .from(typingAttempts)
        .where(and(...whereConditions))
        .groupBy(typingAttempts.userId)
        .as("agg");

      const searchCondition = search
        ? or(
            ilike(user.name, `%${search}%`),
            ilike(user.email, `%${search}%`),
          )
        : undefined;

      const baseQuery = db
        .select({
          userId: subq.userId,
          attempts: subq.attempts,
          lastAttemptAt: subq.lastAttemptAt,
          userName: user.name,
          userEmail: user.email,
          userCode: user.userCode,
        })
        .from(subq)
        .innerJoin(user, eq(subq.userId, user.id));

      const [dataRows, totalRows] = await Promise.all([
        (searchCondition
          ? baseQuery.where(searchCondition)
          : baseQuery
        )
          .orderBy(desc(subq.lastAttemptAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count() })
          .from(subq)
          .innerJoin(user, eq(subq.userId, user.id))
          .then((r) => r[0]?.total ?? 0),
      ]);

      return {
        data: dataRows,
        total: totalRows,
        totalPages: Math.ceil(totalRows / limit),
      };
    },
  };
}

import { db } from "~/server/db";
export const typingLeaderboardService = createTypingLeaderboardService(db);