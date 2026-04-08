import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { authService } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schema";
import { redisService } from "~/server/services/redis.service";

export const adminAuthRouter = createTRPCRouter({
  me: adminProcedure.query(({ ctx }) => {
    return ctx.admin;
  }),

  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      await redisService.rateLimitOrThrow(
        { headers: ctx.headers, route: "adminAuth.login" },
        10,
        60,
      );

      return authService.register(input, ctx);
    }),

  login: publicProcedure
    .input(loginSchema)

    .mutation(async ({ input, ctx }) => {
      console.log("NEW LOGIN", ctx);

      await redisService.rateLimitOrThrow(
        { headers: ctx.headers, route: "adminAuth.login" },
        10,
        60,
      );

      return authService.login(input, ctx);
    }),

  logout: publicProcedure.mutation(({ ctx }) => authService.logout(ctx)),
});
