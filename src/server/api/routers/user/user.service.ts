// ─── server/api/routers/user/user.service.ts ─────────────────────────────────

import { db as globalDb } from "~/server/db";
import { results, testAttempts, tests, testSpeeds } from "~/server/db/schema";
import { and, eq, gte, lte, sql, desc, asc } from "drizzle-orm";

import type { db as dbInstance } from "~/server/db";
type Db = typeof dbInstance;

type AttemptType = "assessment" | "practice";

function buildWhere(
  userId: string,
  opts?: { from?: Date; to?: Date; type?: AttemptType },
) {
  const conditions = [eq(results.userId, userId)];
  if (opts?.type) conditions.push(eq(results.type, opts.type));
  if (opts?.from) conditions.push(gte(results.submittedAt, opts.from));
  if (opts?.to) conditions.push(lte(results.submittedAt, opts.to));
  return and(...conditions);
}

export function createUserService(db: Db) {
  return {
    async getReport(userId: string, type?: AttemptType) {
      const where = buildWhere(userId, { type });
      const res = await db
        .select({
          totalAttempts: sql<number>`count(*)`,
          avgScore: sql<number>`avg(${results.score})`,
          avgWpm: sql<number>`avg(${results.wpm})`,
          avgAccuracy: sql<number>`avg(${results.accuracy})`,
          totalMistakes: sql<number>`sum(${results.mistakes})`,
        })
        .from(results)
        .where(where);
      return res[0];
    },

    async getProgress(
      userId: string,
      from?: Date,
      to?: Date,
      type?: AttemptType,
    ) {
      const where = buildWhere(userId, { from, to, type });
      return db
        .select({
          submittedAt: results.submittedAt,
          score: results.score,
          wpm: results.wpm,
          accuracy: results.accuracy,
        })
        .from(results)
        .where(where)
        .orderBy(results.submittedAt);
    },

    async getPersonalBests(userId: string, type?: AttemptType) {
      const where = buildWhere(userId, { type });
      const res = await db
        .select({
          bestScore: sql<number>`max(${results.score})`,
          bestWpm: sql<number>`max(${results.wpm})`,
          bestAccuracy: sql<number>`max(${results.accuracy})`,
        })
        .from(results)
        .where(where);
      return res[0];
    },

    async getTestWisePerformance(
      userId: string,
      limit = 50,
      type?: AttemptType,
    ) {
      const conditions = [eq(results.userId, userId)];
      if (type) conditions.push(eq(results.type, type));

      return db
        .select({
          testId: testAttempts.testId,
          testTitle: tests.title,
          testType: tests.type,
          attempts: sql<number>`count(*)`,
          bestWpm: sql<number>`max(${results.wpm})`,
          avgWpm: sql<number>`avg(${results.wpm})`,
          bestAccuracy: sql<number>`max(${results.accuracy})`,
          avgAccuracy: sql<number>`avg(${results.accuracy})`,
        })
        .from(results)
        .innerJoin(testAttempts, eq(results.attemptId, testAttempts.id))
        .innerJoin(tests, eq(testAttempts.testId, tests.id))
        .where(and(...conditions))
        .groupBy(testAttempts.testId, tests.title, tests.type)
        .orderBy(desc(sql`max(${results.accuracy})`))
        .limit(limit);
    },

    async getProgressSeries(userId: string, limit = 60, type?: AttemptType) {
      const where = buildWhere(userId, { type });

      const data = await db
        .select({
          submittedAt: results.submittedAt,
          accuracy: results.accuracy,
          mistakes: results.mistakes,
          wpm: results.wpm,
          score: results.score,
          type: results.type,
          testSpeedWpm: testSpeeds.wpm,
          speedId: testSpeeds.id,
        })
        .from(results)
        .innerJoin(testAttempts, eq(results.attemptId, testAttempts.id))
        .innerJoin(testSpeeds, eq(testAttempts.speedId, testSpeeds.id))
        .where(where)
        .orderBy(asc(results.submittedAt))
        .limit(limit);

      return data.map((r, i) => ({
        index: i + 1,
        submittedAt: r.submittedAt,
        accuracy: r.accuracy,
        mistakes: r.mistakes ?? 0,
        wpm: r.wpm,
        testSpeedWpm: r.testSpeedWpm,
        score: r.score,
        type: r.type,
        speedId: r.speedId,
      }));
    },

    async getAttemptsPaginated(
      userId: string,
      page = 0,
      limit = 15,
      type?: AttemptType,
      testId?: string,
      date?: string,
    ) {
      const conditions = [eq(results.userId, userId)];
      if (type) conditions.push(eq(results.type, type));
      if (testId) conditions.push(eq(testAttempts.testId, testId));

      if (date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        conditions.push(gte(results.submittedAt, dayStart));
        conditions.push(lte(results.submittedAt, dayEnd));
      }

      const where = and(...conditions);

      const [data, [countRow]] = await Promise.all([
        db
          .select({
            attemptId: results.attemptId,
            type: results.type,
            wpm: results.wpm,
            accuracy: results.accuracy,
            mistakes: results.mistakes,
            submittedAt: results.submittedAt,
            testId: testAttempts.testId,
            speedId: testAttempts.speedId,
            testTitle: tests.title,
            testType: tests.type,
            speedWpm: testSpeeds.wpm,
          })
          .from(results)
          .innerJoin(testAttempts, eq(results.attemptId, testAttempts.id))
          .innerJoin(tests, eq(testAttempts.testId, tests.id))
          .innerJoin(testSpeeds, eq(testAttempts.speedId, testSpeeds.id))
          .where(where)
          .orderBy(desc(results.submittedAt))
          .limit(limit)
          .offset(page * limit),

        db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(results)
          .innerJoin(testAttempts, eq(results.attemptId, testAttempts.id))
          .where(where),
      ]);

      const total = countRow?.count ?? 0;

      return {
        data: data.map((r) => ({
          attemptId: r.attemptId,
          type: r.type,
          testId: r.testId,
          speedId: r.speedId,
          testTitle: r.testTitle,
          testType: r.testType,
          speedWpm: r.speedWpm,
          result: {
            wpm: r.wpm,
            accuracy: r.accuracy,
            mistakes: r.mistakes ?? 0,
            submittedAt: r.submittedAt,
          },
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    },

    async getHeatmap(
      userId: string,
      from: Date,
      to: Date,
      includePractice = true,
    ) {
      const conditions = [
        eq(results.userId, userId),
        gte(results.submittedAt, from),
        lte(results.submittedAt, to),
      ];
      if (!includePractice) conditions.push(eq(results.type, "assessment"));

      return db
        .select({
          date: sql<string>`date(${results.submittedAt})::text`,
          count: sql<number>`count(*)`,
          avgScore: sql<number>`avg(${results.score})`,
        })
        .from(results)
        .where(and(...conditions))
        .groupBy(sql`date(${results.submittedAt})`)
        .orderBy(sql`date(${results.submittedAt})`);
    },
  };
}

// ── default export bound to global db ─────────────────────────────────────────
export const userService = createUserService(globalDb);
