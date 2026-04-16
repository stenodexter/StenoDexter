// typing-test.service.ts

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
} from "drizzle-orm";
import { typingAttempts, typingTests } from "~/server/db/schema";
import type {
  CreateTypingTestInput,
  GetTypingTestInput,
  ListTypingTestsInput,
  UpdateTypingTestInput,
} from "./manage.typing.schema";

import type { db as dbInstance } from "~/server/db";
type Db = typeof dbInstance;

export function createTypingTestManageService(db: Db) {
  return {
    async create(input: CreateTypingTestInput, adminId: string) {
      const [test] = await db
        .insert(typingTests)
        .values({ ...input, adminId })
        .returning();
      return test!;
    },

    async update(input: UpdateTypingTestInput) {
      const { id, ...fields } = input;

      const existing = await db.query.typingTests.findFirst({
        where: eq(typingTests.id, id),
      });
      if (!existing) throw new Error("Typing test not found");

      const [updated] = await db
        .update(typingTests)
        .set(fields)
        .where(eq(typingTests.id, id))
        .returning();

      return updated!;
    },

    async delete(input: GetTypingTestInput) {
      const existing = await db.query.typingTests.findFirst({
        where: eq(typingTests.id, input.id),
      });
      if (!existing) throw new Error("Typing test not found");

      await db.delete(typingTests).where(eq(typingTests.id, input.id));
      return { ok: true };
    },

    async get(input: GetTypingTestInput, userId?: string) {
      const [test, attemptCount] = await Promise.all([
        db.query.typingTests.findFirst({ where: eq(typingTests.id, input.id) }),
        userId
          ? db
              .select({ count: count() })
              .from(typingAttempts)
              .where(
                and(
                  eq(typingAttempts.testId, input.id),
                  eq(typingAttempts.userId, userId),
                  eq(typingAttempts.isSubmitted, true),
                ),
              )
              .then((r) => r[0]?.count ?? 0)
          : Promise.resolve(0),
      ]);

      if (!test) throw new Error("Typing test not found");

      return {
        ...test,
        userAttemptCount: attemptCount,
        isAssessed: (attemptCount as number) > 0,
      };
    },

    async list(input: ListTypingTestsInput, userId?: string) {
      const { page, pageSize, sort, date, search } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        conditions.push(gte(typingTests.createdAt, start));
        conditions.push(lte(typingTests.createdAt, end));
      }
      if (search?.trim())
        conditions.push(ilike(typingTests.title, `%${search.trim()}%`));

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const orderBy =
        sort === "oldest"
          ? asc(typingTests.createdAt)
          : desc(typingTests.createdAt);

      const [rows, [countRow], assessedRows] = await Promise.all([
        db.query.typingTests.findMany({
          where,
          orderBy,
          limit: pageSize,
          offset,
        }),
        db.select({ count: count() }).from(typingTests).where(where),
        userId
          ? db
              .select({
                testId: typingAttempts.testId,
                attempts: count(),
              })
              .from(typingAttempts)
              .where(
                and(
                  eq(typingAttempts.userId, userId),
                  eq(typingAttempts.isSubmitted, true),
                  inArray(typingAttempts.testId, []),
                ),
              )
              .groupBy(typingAttempts.testId)
          : Promise.resolve([]),
      ]);

      // re-run with actual testIds if userId present
      const testIds = rows.map((r) => r.id);
      const userAttemptMap = new Map<string, number>();

      if (userId && testIds.length > 0) {
        const userAttempts = await db
          .select({ testId: typingAttempts.testId, attempts: count() })
          .from(typingAttempts)
          .where(
            and(
              eq(typingAttempts.userId, userId),
              eq(typingAttempts.isSubmitted, true),
              inArray(typingAttempts.testId, testIds),
            ),
          )
          .groupBy(typingAttempts.testId);

        for (const r of userAttempts) {
          userAttemptMap.set(r.testId, Number(r.attempts));
        }
      }

      const total = countRow?.count ?? 0;

      return {
        data: rows.map((t) => {
          const userAttemptCount = userAttemptMap.get(t.id) ?? 0;
          return {
            ...t,
            userAttemptCount,
            isAssessed: userAttemptCount > 0,
          };
        }),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  };
}

import { db } from "~/server/db";
export const typingTestManageService = createTypingTestManageService(db);
