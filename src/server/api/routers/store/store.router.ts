import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import R2Service, { r2Service } from "~/server/services/r2.service";

export const storeRouter = createTRPCRouter({
  generatePresignedUrl: publicProcedure
    .input(
      z.object({
        folder: z.string().min(1),
        contentType: z.string().min(1),
        ext: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const { folder, contentType, ext } = input;

      const result = await r2Service.generatePresignedUploadUrl({
        folder,
        contentType,
        ext,
      });

      return result;
    }),

  getPublicUrl: publicProcedure
    .input(
      z.object({
        key: z.string(),
      }),
    )
    .query(({ input }) => {
      return R2Service.getPublicUrl(input.key);
    }),
});
