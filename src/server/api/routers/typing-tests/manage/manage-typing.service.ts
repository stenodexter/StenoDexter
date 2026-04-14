// typing-test.service.ts

import { and, asc, count, desc, eq, gte, ilike, lte } from "drizzle-orm";
import { typingTests } from "~/server/db/schema";
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

    async get(input: GetTypingTestInput) {
      const test = await db.query.typingTests.findFirst({
        where: eq(typingTests.id, input.id),
      });
      if (!test) throw new Error("Typing test not found");
      return test;
    },

    async list(input: ListTypingTestsInput) {
      const { page, pageSize, sort, date, search } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];

      if (search) {
        conditions.push(ilike(typingTests.title, `%${search}%`));
      }

      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        conditions.push(gte(typingTests.createdAt, start));
        conditions.push(lte(typingTests.createdAt, end));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const orderBy =
        sort === "oldest"
          ? asc(typingTests.createdAt)
          : desc(typingTests.createdAt);

      const [rows, [countRow]] = await Promise.all([
        db.query.typingTests.findMany({
          where,
          orderBy,
          limit: pageSize,
          offset,
        }),
        db.select({ count: count() }).from(typingTests).where(where),
      ]);

      const total = countRow?.count ?? 0;

      return {
        data: rows,
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
