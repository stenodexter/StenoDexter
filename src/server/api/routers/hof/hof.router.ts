import { z } from "zod";
import { adminProcedure, createTRPCRouter, publicProcedure } from "../../trpc";
import { createHofService } from "./hof.service";
import { db } from "~/server/db";
import { createSchema, updateSchema } from "./hof.schema";

export const hofRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z
        .object({
          department: z.string().optional(),
          search: z.string().optional(),
          page: z.number().min(0).default(0),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(({ input }) => createHofService(db).list(input)),

  create: adminProcedure
    .input(createSchema)
    .mutation(({ input, ctx }) =>
      createHofService(ctx.db).create(input, ctx.admin.id),
    ),

  update: adminProcedure.input(updateSchema).mutation(({ input, ctx }) => {
    const { id, ...rest } = input;
    return createHofService(ctx.db).update(id, rest);
  }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input, ctx }) => createHofService(ctx.db).delete(input.id)),
});
