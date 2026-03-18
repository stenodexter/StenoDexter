import { z } from "zod";

import {
  createTRPCRouter,
  paidUserProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  /**
   * Get current user profile
   */
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.user;
  }),

  /**
   * Check if user has active subscription
   */
  hasSubscription: paidUserProcedure.query(async ({ ctx }) => {
    // This would typically check the subscription table
    // For now, returning false as placeholder
    return ctx.subscription;
  }),

  /**
   * Get user's subscription status
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    // This would fetch from subscription table
    // For now, returning null as placeholder
    return null;
  }),
});
