// ═══════════════════════════════════════════════════════════════════════════════
// FILE 3: test.router.ts
// ═══════════════════════════════════════════════════════════════════════════════

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
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
} from "./test.schema";
import { testService } from "./test.service";

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
  listForUser: protectedProcedure
    .input(listUserTestsSchema)
    .query(({ input, ctx }) => testService.listForUserFeed(input, ctx.user.id)),

  // Public: get single test with all speeds (test detail page)
  get: publicProcedure
    .input(getTestSchema)
    .query(({ input }) => testService.getById(input)),

  // Admin: rich filtered list with speeds
  getTests: adminProcedure
    .input(getTestsAdminSchema)
    .query(({ input }) => testService.getTests(input)),

  // User: search active tests
  search: protectedProcedure
    .input(searchTestsSchema)
    .query(({ input, ctx }) => testService.searchForUser(input, ctx.user.id)),

  // Public: tests created in last 24h (dashboard featured strip)
  todaysTests: publicProcedure.query(() => testService.getLast24HourTests()),
});
