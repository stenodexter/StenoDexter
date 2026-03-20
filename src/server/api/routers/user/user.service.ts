import { db } from "~/server/db";
import { results } from "~/server/db/schema";
import { and, eq, gte, lte, sql, desc, asc, inArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

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

export const userService = {
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

  async getTestWisePerformance(userId: string, limit = 50, type?: AttemptType) {
    const where = buildWhere(userId, { type });
    return db
      .select({
        testId: results.testId,
        attempts: sql<number>`count(*)`,
        bestScore: sql<number>`max(${results.score})`,
        avgScore: sql<number>`avg(${results.score})`,
        bestWpm: sql<number>`max(${results.wpm})`,
        avgWpm: sql<number>`avg(${results.wpm})`,
        bestAccuracy: sql<number>`max(${results.accuracy})`,
        avgAccuracy: sql<number>`avg(${results.accuracy})`,
      })
      .from(results)
      .where(where)
      .groupBy(results.testId)
      .orderBy(desc(sql`max(${results.score})`))
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
      })
      .from(results)
      .where(where)
      .orderBy(asc(results.submittedAt))
      .limit(limit);

    return data.map((r, i) => ({
      index: i + 1,
      submittedAt: r.submittedAt,
      accuracy: r.accuracy,
      mistakes: r.mistakes ?? 0,
      wpm: r.wpm,
      score: r.score,
      type: r.type,
    }));
  },

  async getAttemptsPaginated(
    userId: string,
    page = 0,
    limit = 15,
    type?: AttemptType,
  ) {
    const where = buildWhere(userId, { type });
    const data = await db.query.results.findMany({
      where,
      orderBy: [desc(results.submittedAt)],
      limit,
      offset: page * limit,
      with: {
        test: { columns: { id: true, title: true, type: true } },
        attempt: { columns: { id: true, type: true } },
      },
    });

    const total = await db.$count(results, where);

    return {
      data: data.map((r) => ({
        attemptId: r.attemptId,
        type: r.attempt?.type ?? r.type,
        test: r.test,
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

    if (!includePractice) {
      conditions.push(eq(results.type, "assessment"));
    }

    const where = and(...conditions);

    const data = await db
      .select({
        date: sql<string>`date(${results.submittedAt})`,
        count: sql<number>`count(*)`,
        avgScore: sql<number>`avg(${results.score})`,
      })
      .from(results)
      .where(where)
      .groupBy(sql`date(${results.submittedAt})`)
      .orderBy(sql`date(${results.submittedAt})`);

    return data;
  },
};
