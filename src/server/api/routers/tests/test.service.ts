import {
  testAttempts,
  tests,
  testSpeeds,
  results,
  notifications,
} from "~/server/db/schema";
import {
  eq,
  desc,
  count,
  and,
  asc,
  inArray,
  gte,
  lte,
  ilike,
  sql,
  SQL,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import type {
  CreateTestInput,
  GetTestInput,
  GetTestsAdminInput,
  ListTestsInput,
  ListUserTestsInput,
  SearchTestsInput,
  UpdateTestInput,
  AddSpeedInput,
  EditSpeedInput,
  DeleteSpeedInput,
  ReorderSpeedsInput,
  SaveDraftInput,
} from "./test.schema";
import R2Service from "~/server/services/r2.service";
import { notificationsService } from "../notifications/notification.service";

const PAGE_SIZE = 12;

function resolveSpeed(speed: typeof testSpeeds.$inferSelect) {
  return {
    ...speed,
    audioUrl: R2Service.getPublicUrl(speed.audioKey),
  };
}

function resolveTest(test: typeof tests.$inferSelect) {
  return {
    ...test,
    matterPdfUrl: R2Service.getPublicUrl(test.matterPdfKey),
    outlinePdfUrl: test.outlinePdfKey
      ? R2Service.getPublicUrl(test.outlinePdfKey)
      : null,
    solutionAudioUrl: test.solutionAudioKey
      ? R2Service.getPublicUrl(test.solutionAudioKey)
      : null,
  };
}

import type { db as dbInstance } from "~/server/db";
type Db = typeof dbInstance;

export function createTestService(db: Db) {
  return {
    async create(input: CreateTestInput, adminId: string) {
      const { speeds, ...testFields } = input;

      const result = await db.transaction(async (tx) => {
        const [test] = await tx
          .insert(tests)
          .values({ ...testFields, adminId })
          .returning();

        await tx.insert(testSpeeds).values(
          speeds.map((s, i) => ({
            id: nanoid(8),
            testId: test!.id,
            ...s,
            sortOrder: s.sortOrder ?? i,
          })),
        );

        return test!;
      });

      await notificationsService.send({
        title: "New test available",
        message: `"${result.title}" has been published. Attempt now!`,
        to: "everyone",
        link: `/user/tests/${result.id}`,
        isLinkExternal: false,
      });

      return result;
    },

    async update(input: UpdateTestInput) {
      const { id, upsertSpeeds = [], deleteSpeeds = [], ...testFields } = input;

      const existing = await db.query.tests.findFirst({
        where: eq(tests.id, id),
      });
      if (!existing) throw new Error("Test not found");

      if (existing.status === "active") {
        const blockedChanges = Object.keys(testFields).filter(
          (k) => !["solutionAudioKey", "correctAnswer"].includes(k),
        );
        if (blockedChanges.length > 0) {
          throw new Error(
            "Active tests: only solutionAudioKey and correctAnswer can be modified",
          );
        }
        if (upsertSpeeds.some((s) => "id" in s)) {
          throw new Error(
            "Cannot edit existing speed variants on an active test",
          );
        }
        if (deleteSpeeds.length > 0) {
          throw new Error("Cannot delete speed variants from an active test");
        }
      }

      await db.transaction(async (tx) => {
        if (Object.keys(testFields).length > 0) {
          await tx.update(tests).set(testFields).where(eq(tests.id, id));
        }

        if (deleteSpeeds.length > 0) {
          await tx
            .delete(testSpeeds)
            .where(
              and(
                inArray(testSpeeds.id, deleteSpeeds),
                eq(testSpeeds.testId, id),
              ),
            );
        }

        if (upsertSpeeds.length > 0) {
          type NewSpeed = Required<
            Pick<
              typeof testSpeeds.$inferInsert,
              | "wpm"
              | "audioKey"
              | "dictationSeconds"
              | "breakSeconds"
              | "writtenDurationSeconds"
            >
          > & { sortOrder?: number };

          const toInsert: NewSpeed[] = [];
          const toUpdate: Array<{ id: string } & Partial<NewSpeed>> = [];

          for (const s of upsertSpeeds) {
            if ("id" in s) {
              toUpdate.push(s as { id: string } & Partial<NewSpeed>);
            } else {
              toInsert.push(s as NewSpeed);
            }
          }

          if (toInsert.length > 0) {
            await tx.insert(testSpeeds).values(
              toInsert.map((s, i) => ({
                id: nanoid(8),
                testId: id,
                wpm: s.wpm,
                audioKey: s.audioKey,
                dictationSeconds: s.dictationSeconds,
                breakSeconds: s.breakSeconds,
                writtenDurationSeconds: s.writtenDurationSeconds,
                sortOrder: s.sortOrder ?? i,
              })),
            );
          }

          await Promise.all(
            toUpdate.map(({ id: speedId, ...fields }) =>
              tx
                .update(testSpeeds)
                .set(fields)
                .where(
                  and(eq(testSpeeds.id, speedId), eq(testSpeeds.testId, id)),
                ),
            ),
          );
        }
      });

      return db.query.tests.findFirst({ where: eq(tests.id, id) });
    },

    // ── delete ────────────────────────────────────────────────────────────────

    async delete(input: GetTestInput) {
      await db.delete(tests).where(eq(tests.id, input.id));
      return { success: true };
    },

    async uploadExplanationAudioForTest(testId: string, audioKey: string) {
      return db.transaction(async (tx) => {
        // 1. Get existing test
        const test = await tx.query.tests.findFirst({
          where: eq(tests.id, testId),
        });

        if (!test) throw new Error("Test not found");

        const isFirstUpload = !test.solutionAudioKey;

        await tx
          .update(tests)
          .set({ solutionAudioKey: audioKey })
          .where(eq(tests.id, testId));

        const attemptedUsers = await tx
          .selectDistinct({ userId: testAttempts.userId })
          .from(testAttempts)
          .where(eq(testAttempts.testId, testId));

        if (attemptedUsers.length === 0) return { ok: true };

        const userIds = attemptedUsers.map((u) => u.userId);

        const notifs = userIds.map((userId) => ({
          id: nanoid(),
          title: isFirstUpload
            ? "Solution audio available 🎧"
            : "Solution audio updated 🔄",
          message: isFirstUpload
            ? `Solution audio for "${test.title}" is now available.`
            : `Solution audio for "${test.title}" has been updated.`,
          to: userId,
          seenBy: [],
          link: `/user/tests/${testId}`,
          isLinkExternal: false,
        }));

        notifs.map(async (n) => {
          await notificationsService.send({ ...n });
        });

        return { ok: true };
      });
    },

    // ── list (admin) ──────────────────────────────────────────────────────────

    async list(input: ListTestsInput) {
      const offset = (input.page - 1) * PAGE_SIZE;

      const conditions: SQL[] = [];
      if (input.type !== "all") conditions.push(eq(tests.type, input.type));
      if (input.status !== "all")
        conditions.push(eq(tests.status, input.status));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const orderBy =
        input.sort === "oldest" ? asc(tests.createdAt) : desc(tests.createdAt);

      // Run data + count + speeds in parallel — all proper Drizzle, no raw SQL
      const [rows, [countRow]] = await Promise.all([
        db.query.tests.findMany({
          where,
          orderBy,
          limit: PAGE_SIZE,
          offset,
          with: {
            speeds: {
              columns: { id: true, wpm: true, sortOrder: true },
              orderBy: asc(testSpeeds.sortOrder),
            },
            attempts: {
              columns: { id: true },
            },
          },
        }),
        db.select({ count: count() }).from(tests).where(where),
      ]);

      const total = countRow?.count ?? 0;

      return {
        data: rows.map((t) => ({
          ...resolveTest(t),
          speeds: t.speeds,
          attemptCount: t.attempts.length,
        })),
        page: input.page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      };
    },

    async saveDraft(input: SaveDraftInput, adminId: string) {
      const { speeds, ...testFields } = input;

      return db.transaction(async (tx) => {
        const [test] = await tx
          .insert(tests)
          .values({
            ...testFields,
            adminId,
            status: "draft",
          })
          .returning();

        if (speeds.length > 0) {
          await tx.insert(testSpeeds).values(
            speeds.map((s, i) => ({
              id: nanoid(8),
              testId: test!.id,
              ...s,
              sortOrder: s.sortOrder ?? i,
            })),
          );
        }

        return test!;
      });
    },

    // ── listForUserFeed ───────────────────────────────────────────────────────

    async listForUserFeed(input: ListUserTestsInput, userId: string) {
      const { page, pageSize = PAGE_SIZE, sort, type, q } = input;
      const offset = (page - 1) * pageSize;

      const conditions: SQL[] = [eq(tests.status, "active")];
      if (type !== "all") conditions.push(eq(tests.type, type));
      if (q?.trim()) conditions.push(ilike(tests.title, `%${q.trim()}%`));
      const where = and(...conditions);
      const orderBy =
        sort === "oldest" ? asc(tests.createdAt) : desc(tests.createdAt);

      const [rows, [countRow], assessedRows] = await Promise.all([
        db.query.tests.findMany({
          where,
          orderBy,
          limit: pageSize,
          offset,
          with: { attempts: { columns: { id: true } } },
        }),
        db.select({ count: count() }).from(tests).where(where),
        db
          .selectDistinct({ testId: testAttempts.testId })
          .from(results)
          .innerJoin(testAttempts, eq(results.attemptId, testAttempts.id))
          .where(eq(results.userId, userId)),
      ]);

      const total = countRow?.count ?? 0;
      if (rows.length === 0)
        return { data: [], page, pageSize, total: 0, totalPages: 0 };

      const testIds = rows.map((r) => r.id);
      const hasAttemptedSet = new Set(assessedRows.map((r) => r.testId));

      const [speedRows, assessedSpeedRows] = await Promise.all([
        db
          .select({
            id: testSpeeds.id,
            testId: testSpeeds.testId,
            wpm: testSpeeds.wpm,
            dictationSeconds: testSpeeds.dictationSeconds,
            breakSeconds: testSpeeds.breakSeconds,
            writtenDurationSeconds: testSpeeds.writtenDurationSeconds,
            sortOrder: testSpeeds.sortOrder,
          })
          .from(testSpeeds)
          .where(inArray(testSpeeds.testId, testIds))
          .orderBy(asc(testSpeeds.sortOrder)),
        db
          .selectDistinct({
            testId: testAttempts.testId,
            speedId: testAttempts.speedId,
          })
          .from(results)
          .innerJoin(testAttempts, eq(results.attemptId, testAttempts.id))
          .where(
            and(
              eq(results.userId, userId),
              inArray(testAttempts.testId, testIds),
            ),
          ),
      ]);

      const assessedSpeedSet = new Set(
        assessedSpeedRows.map((r) => `${r.testId}:${r.speedId}`),
      );
      const speedsByTest = speedRows.reduce<Record<string, typeof speedRows>>(
        (acc, s) => {
          (acc[s.testId] ??= []).push(s);
          return acc;
        },
        {},
      );

      return {
        data: rows.map((t) => ({
          ...resolveTest(t),
          attemptCount: t.attempts.length,
          hasAttempted: hasAttemptedSet.has(t.id),
          speeds: (speedsByTest[t.id] ?? []).map((s) => ({
            ...s,
            hasAssessed: assessedSpeedSet.has(`${t.id}:${s.id}`),
          })),
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    // ── getById ───────────────────────────────────────────────────────────────

    async getById(input: GetTestInput) {
      const test = await db.query.tests.findFirst({
        where: eq(tests.id, input.id),
        with: {
          speeds: { orderBy: asc(testSpeeds.sortOrder) },
          attempts: {
            columns: { id: true },
          },
        },
      });

      if (!test) throw new Error("Test not found");

      return {
        ...resolveTest(test),
        speeds: test.speeds.map(resolveSpeed),
        attemptsCount: test.attempts.length,
      };
    },

    // ── getLast24HourTests ────────────────────────────────────────────────────

    async getLast24HourTests() {
      const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return db.query.tests.findMany({
        where: and(
          eq(tests.status, "active"),
          gte(tests.createdAt, past24Hours),
        ),
        orderBy: desc(tests.createdAt),
        with: { speeds: { orderBy: asc(testSpeeds.sortOrder) } },
      });
    },

    // ── searchForUser ─────────────────────────────────────────────────────────

    async searchForUser(input: SearchTestsInput, userId: string) {
      const { query, type, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const rows = await db.execute<{
        id: string;
        title: string;
        type: string;
        status: string;
        created_at: Date;
        attempt_count: string;
        total_count: string;
        matter_pdf_key: string;
        outline_pdf_key: string | null;
        correct_answer: string;
        solution_audio_key: string | null;
      }>(sql`
        SELECT
          t.*,
          COUNT(ta.id) OVER (PARTITION BY t.id) AS attempt_count,
          COUNT(*) OVER ()                       AS total_count
        FROM tests t
        LEFT JOIN test_attempts ta ON ta.test_id = t.id
        WHERE t.status = 'active'
          AND t.title ILIKE ${`%${query}%`}
          ${type ? sql`AND t.type = ${type}` : sql``}
        GROUP BY t.id
        ORDER BY t.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      if (rows.length === 0)
        return { data: [], page, pageSize, total: 0, totalPages: 0 };

      const testIds = rows.map((r) => r.id);
      const total = Number(rows[0]!.total_count);

      const assessedRows = await db
        .select({ testId: testAttempts.testId })
        .from(results)
        .innerJoin(testAttempts, eq(results.attemptId, testAttempts.id))
        .where(
          and(
            eq(results.userId, userId),
            inArray(testAttempts.testId, testIds),
          ),
        )
        .groupBy(testAttempts.testId);

      const assessedSet = new Set(assessedRows.map((r) => r.testId));

      return {
        data: rows.map((r) => ({
          ...r,
          attemptCount: Number(r.attempt_count),
          hasAttempted: assessedSet.has(r.id),
          ...resolveTest(r as any),
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    async getTests(input: GetTestsAdminInput) {
      const { page, pageSize, status, type, fromDate, toDate, adminId, sort } =
        input;
      const offset = (page - 1) * pageSize;

      const conditions = [
        status ? eq(tests.status, status) : undefined,
        type ? eq(tests.type, type) : undefined,
        adminId ? eq(tests.adminId, adminId) : undefined,
        fromDate ? gte(tests.createdAt, fromDate) : undefined,
        toDate ? lte(tests.createdAt, toDate) : undefined,
      ].filter(Boolean);

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const orderBy =
        sort === "oldest" ? asc(tests.createdAt) : desc(tests.createdAt);

      const [data, totalRows] = await Promise.all([
        db.query.tests.findMany({
          where,
          limit: pageSize,
          offset,
          orderBy,
          with: { speeds: { orderBy: asc(testSpeeds.sortOrder) } },
        }),
        db.select({ total: count() }).from(tests).where(where),
      ]);

      const total = totalRows[0]?.total ?? 0;

      return {
        data: data.map((t) => ({
          ...resolveTest(t),
          speeds: t.speeds.map(resolveSpeed),
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    // ── addSpeed ──────────────────────────────────────────────────────────────

    async addSpeed(input: AddSpeedInput) {
      const { testId, ...speedFields } = input;
      const test = await db.query.tests.findFirst({
        where: eq(tests.id, testId),
      });
      if (!test) throw new Error("Test not found");

      const [speed] = await db
        .insert(testSpeeds)
        .values({ id: nanoid(8), testId, ...speedFields })
        .returning();

      return resolveSpeed(speed!);
    },

    // ── editSpeed ─────────────────────────────────────────────────────────────

    async editSpeed(input: EditSpeedInput) {
      const { id, testId, ...fields } = input;

      const [test, speed] = await Promise.all([
        db.query.tests.findFirst({ where: eq(tests.id, testId) }),
        db.query.testSpeeds.findFirst({
          where: and(eq(testSpeeds.id, id), eq(testSpeeds.testId, testId)),
        }),
      ]);

      if (!test) throw new Error("Test not found");
      if (!speed) throw new Error("Speed not found");
      if (test.status === "active")
        throw new Error("Cannot edit speed variants on an active test");

      const [updated] = await db
        .update(testSpeeds)
        .set(fields)
        .where(and(eq(testSpeeds.id, id), eq(testSpeeds.testId, testId)))
        .returning();

      return resolveSpeed(updated!);
    },

    // ── deleteSpeed ───────────────────────────────────────────────────────────

    async deleteSpeed(input: DeleteSpeedInput) {
      const { id, testId } = input;

      const [test, [countRow]] = await Promise.all([
        db.query.tests.findFirst({ where: eq(tests.id, testId) }),
        db
          .select({ total: count() })
          .from(testSpeeds)
          .where(eq(testSpeeds.testId, testId)),
      ]);

      if (!test) throw new Error("Test not found");
      if (test.status === "active")
        throw new Error("Cannot delete speed variants from an active test");
      if ((countRow?.total ?? 0) <= 1)
        throw new Error("A test must have at least one speed variant");

      await db
        .delete(testSpeeds)
        .where(and(eq(testSpeeds.id, id), eq(testSpeeds.testId, testId)));

      return { ok: true };
    },

    // ── reorderSpeeds ─────────────────────────────────────────────────────────

    async reorderSpeeds(input: ReorderSpeedsInput) {
      const { testId, speeds } = input;

      const existing = await db.query.testSpeeds.findMany({
        where: eq(testSpeeds.testId, testId),
        columns: { id: true },
      });

      const existingIds = new Set(existing.map((s) => s.id));
      if (!speeds.every((s) => existingIds.has(s.id))) {
        throw new Error("One or more speed ids do not belong to this test");
      }

      await Promise.all(
        speeds.map((s) =>
          db
            .update(testSpeeds)
            .set({ sortOrder: s.sortOrder })
            .where(and(eq(testSpeeds.id, s.id), eq(testSpeeds.testId, testId))),
        ),
      );

      return { ok: true };
    },
  };
}

// ── default export bound to global db ────────────────────────────────────────
// Normal usage: testService.create(input, adminId)
// Cross-service transaction: createTestService(tx).create(input, adminId)

import { db } from "~/server/db";
export const testService = createTestService(db);
