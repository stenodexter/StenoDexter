import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

// User routers
import { authRouter as userAuthRouter } from "./routers/user/auth";
import { postsRouter } from "./routers/user/posts";
import { adminAuthRouter } from "./routers/admin/auth/auth.router";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  // Admin routes
  admin: createTRPCRouter({
    auth: adminAuthRouter,
  }),

  // User routes
  user: createTRPCRouter({
    auth: userAuthRouter,
    posts: postsRouter,
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
