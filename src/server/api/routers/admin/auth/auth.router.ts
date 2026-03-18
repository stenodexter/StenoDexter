import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { authService } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schema";

export const adminAuthRouter = createTRPCRouter({
  me: adminProcedure.query(({ ctx }) => {
    return ctx.admin;
  }),

  register: publicProcedure
    .input(registerSchema)
    .mutation(({ input, ctx }) => authService.register(input, ctx)),

  login: publicProcedure
    .input(loginSchema)
    .mutation(({ input, ctx }) => authService.login(input, ctx)),

  logout: publicProcedure.mutation(({ ctx }) => authService.logout(ctx)),
});
