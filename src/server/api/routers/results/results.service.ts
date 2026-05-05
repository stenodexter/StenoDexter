// server/services/results.service.ts
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db as globalDb } from "~/server/db";
import { leaderboard, results, testAttempts } from "~/server/db/schema";
import R2Service from "~/server/services/r2.service";
import { scoringEngine } from "~/server/services/scoring.service";
import type { GetResultsAdminInput, GetTestResults } from "./results.schema";

import type { db as dbInstance } from "~/server/db";
import { redisService } from "~/server/services/redis.service";
type Db = typeof dbInstance;

const ATTEMPT_RESULTS_CACHE_TTL = 12 * 60 * 60;

export function createResultService(db: Db) {
  return {
    async getResult(attemptId: string, userId: string) {
      return redisService.cache(
        `result:test:${attemptId}`,
        async () => {
          const attempt = await db.query.testAttempts.findFirst({
            where: and(
              eq(testAttempts.id, attemptId),
              eq(testAttempts.userId, userId),
            ),
            with: { test: true, speed: true },
          });

          if (!attempt) throw new Error("Attempt not found");
          if (!attempt.isSubmitted)
            throw new Error("Attempt not yet submitted");

          const result = await db.query.results.findFirst({
            where: eq(results.attemptId, attempt.id),
          });

          if (!result) throw new Error("Result not found");

          // ✅ Pass RAW correctAnswer to compare() — preserves paragraph \n
          const diff = scoringEngine.compare(
            attempt.test.correctAnswer,
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
              correctAnswer: attempt.test.correctAnswer,
              matterPdfUrl: R2Service.getPublicUrl(attempt.test.matterPdfKey),
              outlinePdfUrl: attempt.test.outlinePdfKey
                ? R2Service.getPublicUrl(attempt.test.outlinePdfKey)
                : null,
              solutionAudioUrl: attempt.test.solutionAudioKey
                ? R2Service.getPublicUrl(attempt.test.solutionAudioKey)
                : null,
            },
            speed: {
              id: attempt.speed.id,
              wpm: attempt.speed.wpm,
              audioUrl: R2Service.getPublicUrl(attempt.speed.audioKey),
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
        ATTEMPT_RESULTS_CACHE_TTL,
      );
    },

    async getTestResults(input: GetTestResults) {
      const {
        testId,
        speedId,
        page,
        limit,
        type,
        sortBy = "score",
        sortOrder = "desc",
      } = input;
      const offset = page * limit;

      const sortCol =
        sortBy === "score"
          ? "r.score"
          : sortBy === "mistakes"
            ? "r.mistakes"
            : "r.submitted_at";

      const order = sortOrder === "asc" ? "ASC" : "DESC";

      type Row = {
        attempt_id: string;
        type: string;
        score: number;
        wpm: number;
        accuracy: number;
        mistakes: number | null;
        submitted_at: Date;
        user_id: string;
        user_name: string | null;
        user_email: string;
        total_count: string;
      };

      const rows = await db.execute<Row>(sql`
        SELECT
          r.attempt_id, r.type, r.score, r.wpm, r.accuracy, r.mistakes,
          r.submitted_at,
          u.id    AS user_id,
          u.name  AS user_name,
          u.email AS user_email,
          COUNT(*) OVER () AS total_count
        FROM results r
        INNER JOIN test_attempts ta ON ta.id = r.attempt_id
        INNER JOIN "user" u         ON u.id  = r.user_id
        WHERE ta.test_id = ${testId}
          ${speedId ? sql`AND ta.speed_id = ${speedId}` : sql``}
          ${type ? sql`AND r.type = ${type}` : sql``}
        ORDER BY ${sql.raw(sortCol)} ${sql.raw(order)}
        LIMIT ${limit} OFFSET ${offset}
      `);

      const total = Number(rows[0]?.total_count ?? 0);

      return {
        data: rows.map((r) => ({
          attemptId: r.attempt_id,
          type: r.type,
          user: { id: r.user_id, name: r.user_name, email: r.user_email },
          result: {
            score: r.score,
            wpm: r.wpm,
            accuracy: r.accuracy,
            mistakes: r.mistakes ?? 0,
            submittedAt: r.submitted_at,
          },
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    },

    async getResultAdmin(attemptId: string) {
      return await redisService.cache(
        `result:test:admin:${attemptId}`,
        async () => {
          const attempt = await db.query.testAttempts.findFirst({
            where: eq(testAttempts.id, attemptId),
            with: { test: true, speed: true },
          });

          if (!attempt) throw new Error("Attempt not found");
          if (!attempt.isSubmitted)
            throw new Error("Attempt not yet submitted");

          const result = await db.query.results.findFirst({
            where: eq(results.attemptId, attempt.id),
          });

          if (!result) throw new Error("Result not found");

          // ✅ Raw correctAnswer — paragraph breaks preserved
          const diff = scoringEngine.compare(
            attempt.test.correctAnswer,
            attempt.answerFinal ?? "",
          );

          return {
            attempt: {
              id: attempt.id,
              type: attempt.type,
              submittedAt: attempt.submittedAt,
              answerFinal: attempt.answerFinal,
            },
            speed: {
              id: attempt.speed.id,
              wpm: attempt.speed.wpm,
              audioUrl: R2Service.getPublicUrl(attempt.speed.audioKey),
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

        ATTEMPT_RESULTS_CACHE_TTL,
      );
    },

    async getResultsAdmin(input: GetResultsAdminInput) {
      const {
        testId,
        speedId,
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
      const offset = page * limit;

      const sortCol =
        sortBy === "score"
          ? "r.score"
          : sortBy === "mistakes"
            ? "r.mistakes"
            : sortBy === "wpm"
              ? "r.wpm"
              : sortBy === "accuracy"
                ? "r.accuracy"
                : "r.submitted_at";

      const order = sortOrder === "asc" ? "ASC" : "DESC";

      type Row = {
        attempt_id: string;
        type: string;
        score: number;
        wpm: number;
        accuracy: number;
        mistakes: number | null;
        submitted_at: Date;
        user_id: string;
        user_name: string | null;
        user_email: string;
        user_code: string;
        test_id: string;
        test_title: string;
        test_type: string;
        speed_id: string;
        speed_wpm: number;
        total_count: string;
      };

      const rows = await db.execute<Row>(sql`
        SELECT
          r.attempt_id, r.type, r.score, r.wpm, r.accuracy, r.mistakes,
          r.submitted_at, r.user_id,
          u.name        AS user_name,
          u.email       AS user_email,
          
          ta.test_id,
          t.title       AS test_title,
          t.type        AS test_type,
          ta.speed_id,
          ts.wpm        AS speed_wpm,
          COUNT(*) OVER () AS total_count
        FROM results r
        INNER JOIN test_attempts ta ON ta.id  = r.attempt_id
        INNER JOIN "user"         u  ON u.id  = r.user_id
        INNER JOIN tests          t  ON t.id  = ta.test_id
        INNER JOIN test_speeds    ts ON ts.id = ta.speed_id
        WHERE 1=1
          ${testId ? sql`AND ta.test_id  = ${testId}` : sql``}
          ${speedId ? sql`AND ta.speed_id = ${speedId}` : sql``}
          ${type ? sql`AND r.type      = ${type}` : sql``}
          ${userId ? sql`AND r.user_id   = ${userId}` : sql``}
          ${minScore !== undefined ? sql`AND r.score >= ${minScore}` : sql``}
          ${maxScore !== undefined ? sql`AND r.score <= ${maxScore}` : sql``}
          ${fromDate ? sql`AND r.submitted_at >= ${fromDate}` : sql``}
          ${toDate ? sql`AND r.submitted_at <= ${toDate}` : sql``}
        ORDER BY ${sql.raw(sortCol)} ${sql.raw(order)}
        LIMIT ${limit} OFFSET ${offset}
      `);

      const total = Number(rows[0]?.total_count ?? 0);

      return {
        data: rows.map((r) => ({
          attemptId: r.attempt_id,
          type: r.type,
          user: {
            id: r.user_id,
            name: r.user_name,
            email: r.user_email,
          },
          test: { id: r.test_id, title: r.test_title, type: r.test_type },
          speed: { id: r.speed_id, wpm: r.speed_wpm },
          result: {
            score: r.score,
            wpm: r.wpm,
            accuracy: r.accuracy,
            mistakes: r.mistakes ?? 0,
            submittedAt: r.submitted_at,
          },
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    },

    async getTopPerformersByTest(input: {
      testId: string;
      speedId?: string;
      limit?: number;
      fromDate?: Date;
      toDate?: Date;
    }) {
      const { testId, speedId, limit = 10, fromDate, toDate } = input;

      const conditions = [
        eq(leaderboard.testId, testId),
        speedId ? eq(leaderboard.speedId, speedId) : undefined,
        fromDate ? gte(leaderboard.createdAt, fromDate) : undefined,
        toDate ? lte(leaderboard.createdAt, toDate) : undefined,
      ].filter((c): c is NonNullable<typeof c> => c !== undefined);

      const data = await db.query.leaderboard.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          user: {
            columns: { id: true, name: true, email: true, userCode: true },
          },
          speed: { columns: { id: true, wpm: true } },
          result: {
            columns: { id: true },
            with: {
              attempt: {
                columns: {
                  answerFinal: true,
                  writingStartedAt: true,
                  submittedAt: true,
                },
                with: { test: { columns: { id: true, correctAnswer: true } } },
              },
            },
          },
        },
        orderBy: [
          asc(leaderboard.mistakes),
          asc(leaderboard.transcriptionTime),
          asc(leaderboard.attemptedAt),
        ],
        limit,
      });

      return data.map((r, i) => {
        const attempt = r.result?.attempt;
        let writingDuration = null;
        let totalWords = 0;

        if (attempt?.writingStartedAt && attempt?.submittedAt) {
          writingDuration =
            new Date(attempt.submittedAt).getTime() -
            new Date(attempt.writingStartedAt).getTime();
        }

        if (attempt?.answerFinal) {
          totalWords = attempt.answerFinal.trim().length
            ? attempt.answerFinal.trim().split(/\s+/).length
            : 0;
        }

        return {
          rank: i + 1,
          user: r.user,
          speed: r.speed,
          mistakes: r.mistakes ?? 0,
          transcriptionTime: r.transcriptionTime,
          writingDuration,
          totalWords,
        };
      });
    },

    async getUsersForTest(input: {
      testId: string;
      page?: number;
      limit?: number;
      type?: "assessment" | "practice";
      search?: string;
    }) {
      const { testId, page = 0, limit = 20, type, search } = input;
      const offset = page * limit;

      type Row = {
        user_id: string;
        user_name: string | null;
        user_email: string;
        attempts: number;
        best_accuracy: number;
        avg_accuracy: number;
        best_wpm: number;
        last_attempt_at: Date;
        total_count: string;
      };

      const rows = await db.execute<Row>(sql`
        SELECT
          r.user_id,
          u.name                           AS user_name,
          u.email                          AS user_email,
          COUNT(*)::int                    AS attempts,
          MAX(r.accuracy)::int             AS best_accuracy,
          ROUND(AVG(r.accuracy))::int      AS avg_accuracy,
          MAX(r.wpm)::int                  AS best_wpm,
          MAX(r.submitted_at)              AS last_attempt_at,
          COUNT(*) OVER ()                 AS total_count
        FROM results r
        INNER JOIN test_attempts ta ON ta.id = r.attempt_id
        INNER JOIN "user"         u  ON u.id = r.user_id
        WHERE ta.test_id = ${testId}
          ${type ? sql`AND r.type = ${type}` : sql``}
          ${search ? sql`AND (u.name ILIKE ${"%" + search + "%"} OR u.email ILIKE ${"%" + search + "%"})` : sql``}
        GROUP BY r.user_id, u.name, u.email
        ORDER BY best_accuracy DESC, last_attempt_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const total = Number(rows[0]?.total_count ?? 0);

      return {
        data: rows.map((r) => ({
          userId: r.user_id,
          userName: r.user_name,
          userEmail: r.user_email,
          attempts: r.attempts,
          bestAccuracy: r.best_accuracy,
          avgAccuracy: r.avg_accuracy,
          bestWpm: r.best_wpm,
          lastAttemptAt: r.last_attempt_at,
        })),
        total,
        totalPages: Math.ceil(total / limit),
        page,
      };
    },
  };
}

export const resultService = createResultService(globalDb);
