import { db } from "~/server/db";
import { user } from "~/server/db/schema/user";
import { tests, testAttempts } from "~/server/db/schema/tests";
import { results } from "~/server/db/schema";
import { leaderboard } from "~/server/db/schema";

import { sql, count, eq, gte, lte, and, inArray } from "drizzle-orm";
import R2Service from "~/server/services/r2.service";

export const analyticsService = {
  // =====================================
  // 📊 1. PLATFORM OVERVIEW
  // =====================================
  async getPlatformOverview() {
    const [usersCount] = await db.select({ count: count() }).from(user);

    const [testsCount] = await db.select({ count: count() }).from(tests);

    const [attemptsCount] = await db
      .select({ count: count() })
      .from(testAttempts);

    const [active1d] = await db
      .select({
        count: sql<number>`count(distinct ${testAttempts.userId})`,
      })
      .from(testAttempts)
      .where(sql`${testAttempts.createdAt} >= now() - interval '1 day'`);

    const [active7d] = await db
      .select({
        count: sql<number>`count(distinct ${testAttempts.userId})`,
      })
      .from(testAttempts)
      .where(sql`${testAttempts.createdAt} >= now() - interval '7 day'`);

    const [active30d] = await db
      .select({
        count: sql<number>`count(distinct ${testAttempts.userId})`,
      })
      .from(testAttempts)
      .where(sql`${testAttempts.createdAt} >= now() - interval '30 day'`);

    return {
      totalUsers: usersCount?.count ?? 0,
      totalTests: testsCount?.count ?? 0,
      totalAttempts: attemptsCount?.count ?? 0,
      activeUsers: {
        last1d: active1d?.count ?? 0,
        last7d: active7d?.count ?? 0,
        last30d: active30d?.count ?? 0,
      },
    };
  },

  // =====================================
  // 📈 2. GROWTH ANALYTICS
  // =====================================
  async getGrowthAnalytics(from?: Date, to?: Date) {
    const filters = [];
    if (from) filters.push(gte(user.createdAt, from));
    if (to) filters.push(lte(user.createdAt, to));

    const newUsers = await db
      .select({
        date: sql<string>`date(${user.createdAt})`,
        count: count(),
      })
      .from(user)
      .where(filters.length ? and(...filters) : undefined)
      .groupBy(sql`date(${user.createdAt})`)
      .orderBy(sql`date(${user.createdAt})`);

    const attempts = await db
      .select({
        date: sql<string>`date(${testAttempts.createdAt})`,
        count: count(),
      })
      .from(testAttempts)
      .groupBy(sql`date(${testAttempts.createdAt})`)
      .orderBy(sql`date(${testAttempts.createdAt})`);

    const submissions = await db
      .select({
        date: sql<string>`date(${results.submittedAt})`,
        count: count(),
      })
      .from(results)
      .groupBy(sql`date(${results.submittedAt})`)
      .orderBy(sql`date(${results.submittedAt})`);

    return {
      newUsers,
      attempts,
      submissions,
    };
  },

  // =====================================
  // 🔥 3. ENGAGEMENT METRICS
  // =====================================
  async getEngagementMetrics() {
    const [dau] = await db
      .select({
        count: sql<number>`count(distinct ${testAttempts.userId})`,
      })
      .from(testAttempts)
      .where(sql`${testAttempts.createdAt} >= now() - interval '1 day'`);

    const [wau] = await db
      .select({
        count: sql<number>`count(distinct ${testAttempts.userId})`,
      })
      .from(testAttempts)
      .where(sql`${testAttempts.createdAt} >= now() - interval '7 day'`);

    const [mau] = await db
      .select({
        count: sql<number>`count(distinct ${testAttempts.userId})`,
      })
      .from(testAttempts)
      .where(sql`${testAttempts.createdAt} >= now() - interval '30 day'`);

    // ✅ Raw SQL subquery — avoids the broken Drizzle alias forwarding
    const [avgAttempts] = await db.execute<{ avg: string }>(sql`
    SELECT avg(attempts_per_user) as avg
    FROM (
      SELECT count(*) as attempts_per_user
      FROM ${testAttempts}
      GROUP BY ${testAttempts.userId}
    ) sub
  `);

    return {
      dau: dau?.count ?? 0,
      wau: wau?.count ?? 0,
      mau: mau?.count ?? 0,
      avgAttemptsPerUser: avgAttempts?.avg ? Number(avgAttempts.avg) : 0,
    };
  },

  // =====================================
  // 📄 4. TEST PERFORMANCE
  // =====================================
  async getTestPerformance() {
    return db
      .select({
        testId: results.testId,
        attempts: count(),
        avgScore: sql<number>`avg(${results.score})`,
        avgWpm: sql<number>`avg(${results.wpm})`,
        avgAccuracy: sql<number>`avg(${results.accuracy})`,
      })
      .from(results)
      .groupBy(results.testId);
  },

  // =====================================
  // 🏆 5. LEADERBOARD ANALYTICS
  // =====================================
  async getLeaderboardAnalytics() {
    // since each (userId, testId) unique
    // this = number of participants per test

    const perTest = await db
      .select({
        testId: leaderboard.testId,
        participants: count(),
        avgScore: sql<number>`avg(${leaderboard.bestScore})`,
      })
      .from(leaderboard)
      .groupBy(leaderboard.testId);

    const [overall] = await db
      .select({
        totalEntries: count(),
        avgScore: sql<number>`avg(${leaderboard.bestScore})`,
      })
      .from(leaderboard);

    return {
      overall,
      perTest,
    };
  },

  async getGlobalTopPerformers(input: {
    limit?: number;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const { limit = 10, fromDate, toDate } = input;

    const from = fromDate?.toISOString();
    const to = toDate?.toISOString();

    const dateFilter =
      from && to
        ? sql`WHERE l.created_at BETWEEN ${from}::timestamptz AND ${to}::timestamptz`
        : from
          ? sql`WHERE l.created_at >= ${from}::timestamptz`
          : to
            ? sql`WHERE l.created_at <= ${to}::timestamptz`
            : sql``;

    const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        l.user_id,
        l.test_id,
        l.best_score,
        l.best_accuracy,
        l.best_wpm,

        RANK() OVER (
          PARTITION BY l.test_id
          ORDER BY l.best_score DESC, l.best_accuracy DESC, l.best_wpm DESC
        ) AS rank,

        COUNT(*) OVER (PARTITION BY l.test_id) AS total
      FROM leaderboard l
      ${dateFilter}
    ),

    scored AS (
      SELECT
        user_id,
        CASE
          WHEN total <= 1 THEN 100
          ELSE 100.0 * (total - rank) / (total - 1)
        END AS points,
        (rank = 1) AS is_first
      FROM ranked
    )

    SELECT
      s.user_id                                          AS "userId",
      SUM(s.points)                                      AS "totalPoints",
      COUNT(*)                                           AS "testsPlayed",
      SUM(CASE WHEN s.is_first THEN 1 ELSE 0 END)       AS "firstPlaces"
    FROM scored s
    GROUP BY s.user_id
    ORDER BY "totalPoints" DESC, "firstPlaces" DESC
    LIMIT ${limit}
  `);

    const rows = result.map((r) => ({
      userId: String(r.userId),
      totalPoints: Number(r.totalPoints),
      testsPlayed: Number(r.testsPlayed),
      firstPlaces: Number(r.firstPlaces),
    }));

    const userIds = rows.map((r) => r.userId);

    if (userIds.length === 0) return [];

    const users = await db.query.user.findMany({
      columns: { id: true, name: true, email: true, image: true },
      where: inArray(user.id, userIds),
    });

    const userMap = Object.fromEntries(
      users.map((u) => [
        u.id,
        {
          ...u,
          profilePicUrl: u.image ? R2Service.getPublicUrl(u.image) : null,
        },
      ]),
    );

    return rows.map((r, i) => ({
      rank: i + 1,
      user: userMap[r.userId]!,
      totalPoints: Number(r.totalPoints),
      testsPlayed: Number(r.testsPlayed),
      firstPlaces: Number(r.firstPlaces),
    }));
  },
};
