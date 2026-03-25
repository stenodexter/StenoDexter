// ═══════════════════════════════════════════════════════════════════════════════
// FILE 3: test.router.ts
// ═══════════════════════════════════════════════════════════════════════════════

import {
  adminProcedure,
  createTRPCRouter,
  paidUserProcedure,
  publicProcedure,
  secureProcedure,
} from "~/server/api/trpc";
import {
  createTestSchema,
  updateTestSchema,
  getTestSchema,
  listTestsSchema,
  listUserTestsSchema,
  getTestsAdminSchema,
  searchTestsSchema,
  addSpeedSchema,
  editSpeedSchema,
  deleteSpeedSchema,
  reorderSpeedsSchema,
  saveDraftSchema,
} from "./test.schema";
import { testService } from "./test.service";
import z from "zod";

export const testRouter = createTRPCRouter({
  // ── test CRUD ──────────────────────────────────────────────────────────────

  create: adminProcedure
    .input(createTestSchema)
    .mutation(({ input, ctx }) => testService.create(input, ctx.admin.id)),

  update: adminProcedure
    .input(updateTestSchema)
    .mutation(({ input }) => testService.update(input)),

  delete: adminProcedure
    .input(getTestSchema)
    .mutation(({ input }) => testService.delete(input)),

  uploadExplanationAudioForTest: adminProcedure
    .input(
      z.object({
        audioKey: z.string(),
        testId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return testService.uploadExplanationAudioForTest(
        input.testId,
        input.audioKey,
      );
    }),

  saveDraft: adminProcedure
    .input(saveDraftSchema)
    .mutation(({ input, ctx }) => testService.saveDraft(input, ctx.admin.id)),

  // ── speed management ───────────────────────────────────────────────────────
  // Standalone routes — admin manages speeds independently after test creation.

  addSpeed: adminProcedure
    .input(addSpeedSchema)
    .mutation(({ input }) => testService.addSpeed(input)),

  editSpeed: adminProcedure
    .input(editSpeedSchema)
    .mutation(({ input }) => testService.editSpeed(input)),

  deleteSpeed: adminProcedure
    .input(deleteSpeedSchema)
    .mutation(({ input }) => testService.deleteSpeed(input)),

  reorderSpeeds: adminProcedure
    .input(reorderSpeedsSchema)
    .mutation(({ input }) => testService.reorderSpeeds(input)),

  // ── queries ────────────────────────────────────────────────────────────────

  // Admin: paginated test list with attempt counts
  list: adminProcedure
    .input(listTestsSchema)
    .query(({ input }) => testService.list(input)),

  // User: active tests feed with hasAttempted flag
  listForUser: paidUserProcedure
    .input(listUserTestsSchema)
    .query(({ input, ctx }) => testService.listForUserFeed(input, ctx.user.id)),

  // Public: get single test with all speeds (test detail page)
  get: secureProcedure
    .input(getTestSchema)
    .query(({ input }) => testService.getById(input)),

  // Admin: rich filtered list with speeds
  getTests: adminProcedure
    .input(getTestsAdminSchema)
    .query(({ input }) => testService.getTests(input)),

  // User: search active tests
  search: paidUserProcedure
    .input(searchTestsSchema)
    .query(({ input, ctx }) => testService.searchForUser(input, ctx.user.id)),

  // Public: tests created in last 24h (dashboard featured strip)
  todaysTests: publicProcedure.query(() => testService.getLast24HourTests()),
});
