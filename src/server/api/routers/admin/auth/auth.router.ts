import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { authService } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schema";

export const adminAuthRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(({ input, ctx }) => authService.register(input, ctx)),

  login: publicProcedure
    .input(loginSchema)
    .mutation(({ input, ctx }) => authService.login(input, ctx)),

  logout: publicProcedure.mutation(({ ctx }) => authService.logout(ctx)),
});
