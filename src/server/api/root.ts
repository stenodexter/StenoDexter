import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

// User routers
import { authRouter as userAuthRouter } from "./routers/user/auth";
import { adminRouter } from "./routers/admin";
import { storeRouter } from "./routers/store/store.router";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  // Admin routes
  admin: adminRouter,
  store: storeRouter,

  // User routes
  user: createTRPCRouter({
    auth: userAuthRouter,
  }),

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
