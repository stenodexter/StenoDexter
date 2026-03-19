import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

// User routers
import { adminRouter } from "./routers/admin";
import { storeRouter } from "./routers/store/store.router";
import { testRouter } from "./routers/tests/test.router";
import { attemptRouter } from "./routers/attempt/attempt.router";
import { resultRouter } from "./routers/results/results.router";
import { userRouter } from "./routers/user/user.router";
import { analyticsRouter } from "./routers/analytics/analytics.router";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  admin: adminRouter,
  store: storeRouter,
  test: testRouter,
  attempt: attemptRouter,
  result: resultRouter,
  user: userRouter,
  analytics: analyticsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
