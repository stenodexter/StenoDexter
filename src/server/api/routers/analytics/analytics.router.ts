import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
  secureProcedure,
} from "../../trpc";
import { analyticsService } from "./analytics.service";
import {
  dateRangeSchema,
  getGlobalTopPerformersSchema,
  getTestStatsSchema,
  getUsersSchema,
} from "./analytics.schema";
import { redisService } from "~/server/services/redis.service";

const TTL = 60 * 60 * 5;

export const analyticsRouter = createTRPCRouter({
  getPlatformOverview: adminProcedure.query(() =>
    redisService.cache(
      "analytics:platformOverview",
      () => analyticsService.getPlatformOverview(),
      TTL,
    ),
  ),

  getGrowthAnalytics: adminProcedure
    .input(dateRangeSchema.optional())
    .query(({ input }) => {
      const key = `analytics:growth:${input?.from ?? "all"}:${input?.to ?? "all"}`;
      return redisService.cache(
        key,
        () => analyticsService.getGrowthAnalytics(input?.from, input?.to),
        TTL,
      );
    }),

  getEngagementMetrics: adminProcedure.query(() =>
    redisService.cache(
      "analytics:engagement",
      () => analyticsService.getEngagementMetrics(),
      TTL,
    ),
  ),

  getTestStats: secureProcedure
    .input(getTestStatsSchema)
    .query(({ input }) =>
      redisService.cache(
        `analytics:testStats:${input.testId}`,
        () => analyticsService.getTestStats(input.testId),
        TTL,
      ),
    ),

  getTestPerformance: adminProcedure.query(() =>
    redisService.cache(
      "analytics:testPerformance",
      () => analyticsService.getTestPerformance(),
      TTL,
    ),
  ),

  getLeaderboardAnalytics: adminProcedure.query(() =>
    redisService.cache(
      "analytics:leaderboard",
      () => analyticsService.getLeaderboardAnalytics(),
      TTL,
    ),
  ),

  getUsers: adminProcedure
    .input(getUsersSchema)
    .query(({ input }) => analyticsService.getUsers(input)),
});
