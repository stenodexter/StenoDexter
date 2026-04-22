import { redisService } from "~/server/services/redis.service";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { cronService } from "./crons.service";

export const cronRouter = createTRPCRouter({
  expireSubscription: publicProcedure.query(async () => {
    await redisService.rateLimitOrThrow(
      { route: "cron.expireSubscription" },
      10,
      60,
    );

    await cronService.expireSubscriptions();
  }),

  sendExpiryReminders: publicProcedure.query(async () => {
    await redisService.rateLimitOrThrow(
      { route: "cron.sendExpiryReminders" },
      10,
      60,
    );

    await cronService.sendExpiryReminders();
  }),

  expireStaleAttempts: publicProcedure.query(async () => {
    await redisService.rateLimitOrThrow(
      { route: "cron.expireStaleAttempts" },
      10,
      60,
    );

    await cronService.deleteStaleAttempts();
  }),
});
