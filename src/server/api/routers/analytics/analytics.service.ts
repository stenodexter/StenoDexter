import {
  sql,
  count,
  gte,
  lte,
  and,
  inArray,
  asc,
  ilike,
  or,
  desc,
  eq,
  gt,
} from "drizzle-orm";
import { db as globalDb } from "~/server/db";
import { user } from "~/server/db/schema/user";
import { tests, testAttempts, testSpeeds } from "~/server/db/schema/tests";
import { results, leaderboard, subscription } from "~/server/db/schema";
import R2Service from "~/server/services/r2.service";
import type { GetUsersInput } from "./analytics.schema";

import type { db as dbInstance } from "~/server/db";
import { redisService } from "~/server/services/redis.service";
type Db = typeof dbInstance;

const PLATFORM_OVERWIEV_STALE = 60 * 3;

export function createAnalyticsService(db: Db) {
  return {
    // ── 1. Platform overview ─────────────────────────────────────────────────

    async getPlatformOverview() {
      return redisService.cache(
        "global:analytics:platform-overview",
        async () => {
          const nonDemo = and(
            eq(user.isDemo, false),
            // also excludes revoked demo users that somehow have isDemo=false
          );

          const realUser = and(eq(user.isDemo, false));

          const [
            usersCount,
            paidUsersCount,
            active1d,
            active7d,
            active30d,
            testsCount,
            attemptsCount,
          ] = await Promise.all([
            // total registered (non-demo only)
            db
              .select({ count: count() })
              .from(user)
              .where(realUser)
              .then(([r]) => r),

            // paid = active sub + non-demo + non-revoked
            db
              .select({ count: count() })
              .from(user)
              .innerJoin(
                subscription,
                and(
                  eq(subscription.userId, user.id),
                  eq(subscription.status, "active"),
                  gt(subscription.currentPeriodEnd, new Date()),
                ),
              )
              .where(and(eq(user.isDemo, false), eq(user.demoRevoked, false)))
              .then(([r]) => r),

            // active users — join user to filter demo/revoked
            db
              .select({
                count: sql<number>`count(distinct ${testAttempts.userId})`,
              })
              .from(testAttempts)
              .innerJoin(user, eq(user.id, testAttempts.userId))
              .where(
                and(
                  sql`${testAttempts.createdAt} >= now() - interval '1 day'`,
                  eq(user.isDemo, false),
                  eq(user.demoRevoked, false),
                ),
              )
              .then(([r]) => r),

            db
              .select({
                count: sql<number>`count(distinct ${testAttempts.userId})`,
              })
              .from(testAttempts)
              .innerJoin(user, eq(user.id, testAttempts.userId))
              .where(
                and(
                  sql`${testAttempts.createdAt} >= now() - interval '7 days'`,
                  eq(user.isDemo, false),
                  eq(user.demoRevoked, false),
                ),
              )
              .then(([r]) => r),

            db
              .select({
                count: sql<number>`count(distinct ${testAttempts.userId})`,
              })
              .from(testAttempts)
              .innerJoin(user, eq(user.id, testAttempts.userId))
              .where(
                and(
                  sql`${testAttempts.createdAt} >= now() - interval '30 days'`,
                  eq(user.isDemo, false),
                  eq(user.demoRevoked, false),
                ),
              )
              .then(([r]) => r),

            db
              .select({ count: count() })
              .from(tests)
              .then(([r]) => r),

            db
              .select({ count: count() })
              .from(testAttempts)
              .then(([r]) => r),
          ]);

          return {
            totalUsers: usersCount?.count ?? 0,
            paidUsers: paidUsersCount?.count ?? 0,
            totalTests: testsCount?.count ?? 0,
            totalAttempts: attemptsCount?.count ?? 0,
            activeUsers: {
              last1d: active1d?.count ?? 0,
              last7d: active7d?.count ?? 0,
              last30d: active30d?.count ?? 0,
            },
          };
        },
        PLATFORM_OVERWIEV_STALE,
      );
    },

    // ── 2. Growth analytics ──────────────────────────────────────────────────

    async getGrowthAnalytics(from?: Date, to?: Date) {
      const filters = [
        from ? gte(user.createdAt, from) : undefined,
        to ? lte(user.createdAt, to) : undefined,
      ].filter((c): c is NonNullable<typeof c> => c !== undefined);

      const [newUsers, attempts, submissions] = await Promise.all([
        db
          .select({
            date: sql<string>`date(${user.createdAt})`,
            count: count(),
          })
          .from(user)
          .where(filters.length ? and(...filters) : undefined)
          .groupBy(sql`date(${user.createdAt})`)
          .orderBy(sql`date(${user.createdAt})`),

        db
          .select({
            date: sql<string>`date(${testAttempts.createdAt})`,
            count: count(),
          })
          .from(testAttempts)
          .groupBy(sql`date(${testAttempts.createdAt})`)
          .orderBy(sql`date(${testAttempts.createdAt})`),

        db
          .select({
            date: sql<string>`date(${results.submittedAt})`,
            count: count(),
          })
          .from(results)
          .groupBy(sql`date(${results.submittedAt})`)
          .orderBy(sql`date(${results.submittedAt})`),
      ]);

      return { newUsers, attempts, submissions };
    },

    // ── 3. Engagement metrics ────────────────────────────────────────────────

    async getEngagementMetrics() {
      const [dau, wau, mau, avgRow] = await Promise.all([
        db
          .select({
            count: sql<number>`count(distinct ${testAttempts.userId})`,
          })
          .from(testAttempts)
          .where(sql`${testAttempts.createdAt} >= now() - interval '1 day'`)
          .then(([r]) => r),
        db
          .select({
            count: sql<number>`count(distinct ${testAttempts.userId})`,
          })
          .from(testAttempts)
          .where(sql`${testAttempts.createdAt} >= now() - interval '7 day'`)
          .then(([r]) => r),
        db
          .select({
            count: sql<number>`count(distinct ${testAttempts.userId})`,
          })
          .from(testAttempts)
          .where(sql`${testAttempts.createdAt} >= now() - interval '30 day'`)
          .then(([r]) => r),
        db
          .execute<{ avg: string }>(
            sql`
          SELECT avg(attempts_per_user) as avg
          FROM (
            SELECT count(*) as attempts_per_user
            FROM ${testAttempts}
            GROUP BY ${testAttempts.userId}
          ) sub
        `,
          )
          .then(([r]) => r),
      ]);

      return {
        dau: dau?.count ?? 0,
        wau: wau?.count ?? 0,
        mau: mau?.count ?? 0,
        avgAttemptsPerUser: avgRow?.avg ? Number(avgRow.avg) : 0,
      };
    },

    // ── 4. Test performance ───────────────────────────────────────────────────
    // results has no testId — join through testAttempts.

    async getTestPerformance() {
      return db
        .execute<{
          test_id: string;
          attempts: string;
          avg_score: string;
          avg_wpm: string;
          avg_accuracy: string;
        }>(
          sql`
        SELECT
          ta.test_id,
          COUNT(r.attempt_id)   AS attempts,
          AVG(r.score)          AS avg_score,
          AVG(r.wpm)            AS avg_wpm,
          AVG(r.accuracy)       AS avg_accuracy
        FROM results r
        INNER JOIN test_attempts ta ON ta.id = r.attempt_id
        GROUP BY ta.test_id
      `,
        )
        .then((rows) =>
          rows.map((r) => ({
            testId: r.test_id,
            attempts: Number(r.attempts),
            avgScore: Number(r.avg_score),
            avgWpm: Number(r.avg_wpm),
            avgAccuracy: Number(r.avg_accuracy),
          })),
        );
    },

    // ── 5. Leaderboard analytics ─────────────────────────────────────────────
    // leaderboard is now per (testId, speedId, userId).
    // Group by testId for overview; column names changed to score/wpm/accuracy.

    async getLeaderboardAnalytics() {
      const [perTest, [overall]] = await Promise.all([
        db
          .select({
            testId: leaderboard.testId,
            participants: count(),
            avgScore: sql<number>`avg(${leaderboard.score})`,
          })
          .from(leaderboard)
          .groupBy(leaderboard.testId),

        db
          .select({
            totalEntries: count(),
            avgScore: sql<number>`avg(${leaderboard.score})`,
          })
          .from(leaderboard),
      ]);

      return { overall, perTest };
    },

    // ── 6. Global top performers ─────────────────────────────────────────────
    // Per-speed leaderboard: rank within each (testId, speedId) partition.
    // Column names updated: score/accuracy/wpm (not best_score etc).

    async getGlobalTopPerformers(input: {
      page?: number;
      pageSize?: number;
      fromDate?: Date;
      toDate?: Date;
    }) {
      const { page = 1, pageSize = 10, fromDate, toDate } = input;
      const offset = (page - 1) * pageSize;

      const from = fromDate?.toISOString();
      const to = toDate?.toISOString();

      const dateFilter =
        from && to
          ? sql`WHERE l.attempted_at BETWEEN ${from}::timestamptz AND ${to}::timestamptz`
          : from
            ? sql`WHERE l.attempted_at >= ${from}::timestamptz`
            : to
              ? sql`WHERE l.attempted_at <= ${to}::timestamptz`
              : sql``;

      const rows = await db.execute(sql`
        WITH ranked AS (
          SELECT
            l.user_id,
            l.test_id,
            l.speed_id,
            RANK() OVER (
              PARTITION BY l.test_id, l.speed_id
              ORDER BY l.score DESC, l.accuracy DESC, l.wpm DESC
            ) AS rank,
            COUNT(*) OVER (PARTITION BY l.test_id, l.speed_id) AS total
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
        ),
        aggregated AS (
          SELECT
            s.user_id,
            SUM(s.points)                                AS total_points,
            COUNT(*)                                     AS tests_played,
            SUM(CASE WHEN s.is_first THEN 1 ELSE 0 END) AS first_places
          FROM scored s
          GROUP BY s.user_id
        )
        SELECT
          a.*,
          COUNT(*) OVER() AS total_count
        FROM aggregated a
        ORDER BY a.total_points DESC, a.first_places DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      const total = Number(rows[0]?.total_count ?? 0);

      const entries = rows.map((r) => ({
        userId: String(r.user_id),
        totalPoints: Number(r.total_points),
        testsPlayed: Number(r.tests_played),
        firstPlaces: Number(r.first_places),
      }));

      const userIds = entries.map((r) => r.userId);

      if (userIds.length === 0) {
        return {
          data: [],
          meta: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        };
      }

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

      return {
        data: entries.map((r, i) => ({
          rank: offset + i + 1,
          user: userMap[r.userId]!,
          totalPoints: r.totalPoints,
          testsPlayed: r.testsPlayed,
          firstPlaces: r.firstPlaces,
        })),
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    },

    async getTestStats(testId: string) {
      const rows = await db.execute<{
        score: string;
        accuracy: string;
        mistakes: string | null;
        user_id: string;
      }>(sql`
        SELECT r.score, r.accuracy, r.mistakes, r.user_id
        FROM results r
        INNER JOIN test_attempts ta ON ta.id = r.attempt_id
        WHERE ta.test_id = ${testId}
      `);

      if (rows.length === 0) {
        return {
          totalAttempts: 0,
          uniqueUsers: 0,
          avgScore: 0,
          bestScore: 0,
          avgAccuracy: 0,
          bestAccuracy: 0,
          avgMistakes: 0,
          fewestMistakes: 0,
        };
      }

      const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;
      const scores = rows.map((r) => Number(r.score));
      const accuracies = rows.map((r) => Number(r.accuracy));
      const mistakes = rows.map((r) => Number(r.mistakes ?? 0));

      return {
        totalAttempts: rows.length,
        uniqueUsers,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        bestScore: Math.max(...scores),
        avgAccuracy: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
        bestAccuracy: Math.max(...accuracies),
        avgMistakes: mistakes.reduce((a, b) => a + b, 0) / mistakes.length,
        fewestMistakes: Math.min(...mistakes),
      };
    },

    async getUsers(input: GetUsersInput) {
      const { query, page, pageSize, sortField, sortOrder, filter } = input;
      const offset = (page - 1) * pageSize;

      const activeUsersSubquery = db
        .select({ id: testAttempts.userId })
        .from(testAttempts)
        .where(sql`${testAttempts.createdAt} >= now() - interval '30 days'`)
        .groupBy(testAttempts.userId);

      const searchConditions = [
        query
          ? or(
              ilike(user.userCode, `%${query}%`),
              ilike(user.name, `%${query}%`),
              ilike(user.email, `%${query}%`),
            )
          : undefined,
        filter === "active" ? inArray(user.id, activeUsersSubquery) : undefined,
      ];

      const whereClause = and(...searchConditions.filter(Boolean));

      const now = new Date();

      const dbOrderBy =
        sortField === "name"
          ? sortOrder === "asc"
            ? [asc(user.name)]
            : [desc(user.name)]
          : sortField === "joined"
            ? sortOrder === "asc"
              ? [asc(user.createdAt)]
              : [desc(user.createdAt)]
            : [desc(user.createdAt)];

      const [[countRow], rows] = await Promise.all([
        db.select({ count: count() }).from(user).where(whereClause),

        db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            createdAt: user.createdAt,
            userCode: user.userCode,
            isDemo: user.isDemo,
            demoRevoked: user.demoRevoked,
            demoExpiresAt: user.demoExpiresAt,
            subStatus: subscription.status,
            subEnd: subscription.currentPeriodEnd,
          })
          .from(user)
          .leftJoin(
            subscription,
            and(
              eq(subscription.userId, user.id),
              eq(subscription.status, "active"),
              gt(subscription.currentPeriodEnd, now),
            ),
          )
          .where(whereClause)
          .orderBy(...dbOrderBy)
          .limit(pageSize)
          .offset(offset),
      ]);

      const total = countRow?.count ?? 0;
      const totalPages = Math.ceil(total / pageSize);

      if (rows.length === 0) {
        return { data: [], meta: { page, pageSize, total, totalPages } };
      }

      const userIds = rows.map((u) => u.id);

      const renewCounts = await db.execute<{
        user_id: string;
        renew_count: string;
      }>(sql`
    SELECT user_id, COUNT(*) as renew_count
    FROM payment_proof
    WHERE user_id = ANY(ARRAY[${sql.join(
      userIds.map((id) => sql`${id}`),
      sql`, `,
    )}])
      AND type = 'renew'
      AND status = 'approved'
    GROUP BY user_id
  `);

      const renewMap = Object.fromEntries(
        renewCounts.map((r) => [String(r.user_id), Number(r.renew_count)]),
      );

      let shaped = rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        userCode: u.userCode,
        profilePicUrl: u.image ? R2Service.getPublicUrl(u.image) : null,
        createdAt: u.createdAt,
        renewCount: renewMap[u.id] ?? 0,
        isPaid: u.subStatus === "active",
      }));

      if (sortField === "renew") {
        shaped.sort((a, b) =>
          sortOrder === "asc"
            ? a.renewCount - b.renewCount
            : b.renewCount - a.renewCount,
        );
      }

      return {
        data: shaped.filter((r) => r.isPaid),
        meta: { page, pageSize, total, totalPages },
      };
    },
  };
}

export const analyticsService = createAnalyticsService(globalDb);
