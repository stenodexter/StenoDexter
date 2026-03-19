import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "~/server/db";
import { leaderboard, results, testAttempts } from "~/server/db/schema";
import R2Service from "~/server/services/r2.service";
import { scoringEngine } from "~/server/services/scoring.service";
import type { GetResultsAdminInput, GetTestResults } from "./results.schema";

export const resultService = {
  async getResult(attemptId: string, userId: string) {
    const attempt = await db.query.testAttempts.findFirst({
      where: and(
        eq(testAttempts.id, attemptId),
        eq(testAttempts.userId, userId),
      ),
      with: { test: true },
    });

    if (!attempt) throw new Error("Attempt not found");
    if (!attempt.isSubmitted) throw new Error("Attempt not yet submitted");

    const result = await db.query.results.findFirst({
      where: eq(results.attemptId, attempt.id),
    });

    if (!result) throw new Error("Result not found");

    const diff = scoringEngine.compare(
      attempt.test.matter,
      attempt.answerFinal ?? "",
    );

    return {
      attempt: {
        id: attempt.id,
        type: attempt.type,
        submittedAt: attempt.submittedAt,
        answerFinal: attempt.answerFinal,
      },
      test: {
        id: attempt.test.id,
        title: attempt.test.title,
        type: attempt.test.type,
        matter: attempt.test.matter,
        outline: attempt.test.outline,
        audioUrl: R2Service.getPublicUrl(attempt.test.audioKey),
      },
      result: {
        score: result.score,
        wpm: result.wpm,
        accuracy: result.accuracy,
        mistakes: result.mistakes ?? 0,
      },
      diff,
    };
  },

  async getTestResults(input: GetTestResults) {
    const {
      testId,
      page,
      limit,
      type,
      sortBy = "score",
      sortOrder = "desc",
    } = input;

    const whereClause = and(
      eq(results.testId, testId),
      type ? eq(results.type, type) : undefined,
    );

    let orderColumn;

    if (sortBy === "score") orderColumn = results.score;
    else if (sortBy === "mistakes") orderColumn = results.mistakes;
    else if (sortBy === "time") orderColumn = results.submittedAt;
    else orderColumn = results.submittedAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const data = await db.query.results.findMany({
      where: whereClause,

      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        attempt: {
          columns: {
            id: true,
            type: true,
          },
        },
      },

      orderBy: [orderFn(orderColumn)],

      limit,
      offset: page * limit,
    });

    const total = await db.$count(results, whereClause);

    return {
      data: data.map((r) => ({
        attemptId: r.attemptId,
        type: r.type,

        user: r.user,

        result: {
          score: r.score,
          wpm: r.wpm,
          accuracy: r.accuracy,
          mistakes: r.mistakes ?? 0,
          submittedAt: r.submittedAt,
        },
      })),

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getResultsAdmin(input: GetResultsAdminInput) {
    const {
      testId,
      page,
      limit,
      type,
      userId,
      minScore,
      maxScore,
      fromDate,
      toDate,
      sortBy,
      sortOrder,
    } = input;

    const conditions = [
      testId ? eq(results.testId, testId) : undefined, // ← now optional
      type ? eq(results.type, type) : undefined,
      userId ? eq(results.userId, userId) : undefined,

      minScore !== undefined ? gte(results.score, minScore) : undefined,
      maxScore !== undefined ? lte(results.score, maxScore) : undefined,

      fromDate ? gte(results.submittedAt, fromDate) : undefined,
      toDate ? lte(results.submittedAt, toDate) : undefined,
    ].filter(Boolean);

    // If no conditions at all, whereClause stays undefined (fetch everything)
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderColumn;
    switch (sortBy) {
      case "score":
        orderColumn = results.score;
        break;
      case "mistakes":
        orderColumn = results.mistakes;
        break;
      case "wpm":
        orderColumn = results.wpm;
        break;
      case "accuracy":
        orderColumn = results.accuracy;
        break;
      case "time":
      default:
        orderColumn = results.submittedAt;
        break;
    }

    const orderFn = sortOrder === "asc" ? asc : desc;

    const data = await db.query.results.findMany({
      where: whereClause,

      with: {
        user: {
          columns: { id: true, name: true, email: true },
        },
        attempt: {
          columns: { id: true, type: true },
        },
        // Join test so callers get title without a second query
        test: {
          columns: { id: true, title: true, type: true },
        },
      },

      orderBy: [orderFn(orderColumn)],
      limit,
      offset: page * limit,
    });

    const total = await db.$count(results, whereClause);

    return {
      data: data.map((r) => ({
        attemptId: r.attemptId,
        type: r.type,
        user: r.user,
        test: r.test, // ← available for global table
        result: {
          score: r.score,
          wpm: r.wpm,
          accuracy: r.accuracy,
          mistakes: r.mistakes ?? 0,
          submittedAt: r.submittedAt,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getTopPerformersByTest(input: {
    testId: string;
    limit?: number;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const { testId, limit = 10, fromDate, toDate } = input;

    const conditions = [
      eq(leaderboard.testId, testId),

      fromDate ? gte(leaderboard.createdAt, fromDate) : undefined,
      toDate ? lte(leaderboard.createdAt, toDate) : undefined,
    ].filter(Boolean);

    const data = await db.query.leaderboard.findMany({
      where: and(...conditions),

      with: {
        user: {
          columns: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: [
        desc(leaderboard.bestScore),
        desc(leaderboard.bestAccuracy),
        desc(leaderboard.bestWpm),
        asc(leaderboard.createdAt),
      ],

      limit,
    });

    return data.map((r, index) => ({
      rank: index + 1,
      user: r.user,
      score: r.bestScore,
      accuracy: r.bestAccuracy,
      wpm: r.bestWpm,
    }));
  },
};
