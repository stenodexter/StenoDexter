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

export const analyticsRouter = createTRPCRouter({
  getPlatformOverview: adminProcedure.query(() =>
    analyticsService.getPlatformOverview(),
  ),

  getGrowthAnalytics: adminProcedure
    .input(dateRangeSchema.optional())
    .query(({ input }) =>
      analyticsService.getGrowthAnalytics(input?.from, input?.to),
    ),

  getEngagementMetrics: adminProcedure.query(() =>
    analyticsService.getEngagementMetrics(),
  ),

  getTestStats: secureProcedure
    .input(getTestStatsSchema)
    .query(({ input }) => analyticsService.getTestStats(input.testId)),

  getTestPerformance: adminProcedure.query(() =>
    analyticsService.getTestPerformance(),
  ),

  getLeaderboardAnalytics: adminProcedure.query(() =>
    analyticsService.getLeaderboardAnalytics(),
  ),

  getUsers: adminProcedure
    .input(getUsersSchema)
    .query(({ input }) => analyticsService.getUsers(input)),
});
