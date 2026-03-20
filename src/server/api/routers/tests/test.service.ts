import { db } from "~/server/db";
import { testAttempts, tests } from "~/server/db/schema/tests";
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
} from "drizzle-orm";
import type {
  CreateTestInput,
  GetTestInput,
  GetTestsAdminInput,
  ListTestsInput,
  ListUserTestsInput,
  listUserTestsSchema,
  SearchTestsInput,
  UpdateTestInput,
} from "./test.schema";
import R2Service from "~/server/services/r2.service";

const PAGE_SIZE = 12;

export const testService = {
  async create(input: CreateTestInput, adminId: string) {
    const [test] = await db
      .insert(tests)
      .values({
        ...input,
        adminId,
        outline: input.outline ?? "",
      })
      .returning();

    return test;
  },

  async update(input: UpdateTestInput) {
    const existing = await db.query.tests.findFirst({
      where: eq(tests.id, input.id),
    });

    if (!existing) throw new Error("Test not found");

    if (existing.status === "active" && input.status !== "active") {
      throw new Error("Active tests cannot be modified");
    }

    const { id, ...rest } = input;

    const [updated] = await db
      .update(tests)
      .set({ ...rest, outline: rest.outline ?? "" })
      .where(eq(tests.id, id))
      .returning();

    return updated;
  },

  async delete(input: GetTestInput) {
    await db.delete(tests).where(eq(tests.id, input.id));
    return { success: true };
  },

  async list(input: ListTestsInput) {
    const offset = (input.page - 1) * PAGE_SIZE;

    // Build where conditions
    const conditions = [];

    if (input.type !== "all") {
      conditions.push(eq(tests.type, input.type));
    }

    if (input.status !== "all") {
      conditions.push(eq(tests.status, input.status));
    }

    const orderBy =
      input.sort === "oldest" ? asc(tests.createdAt) : desc(tests.createdAt);

    // Fetch tests
    const data = await db.query.tests.findMany({
      limit: PAGE_SIZE,
      offset,
      orderBy,
      where: conditions.length > 0 ? and(...conditions) : undefined,
    });

    // Fetch attempt counts for each test in one query
    const testIds = data.map((t) => t.id);

    const attemptRows =
      testIds.length > 0
        ? await db
            .select({
              testId: testAttempts.testId,
              count: count(),
            })
            .from(testAttempts)
            .where(inArray(testAttempts.testId, testIds))
            .groupBy(testAttempts.testId)
        : [];

    const attemptCounts = Object.fromEntries(
      attemptRows.map((r) => [r.testId, r.count]),
    );

    const totalRows = await db
      .select({ total: count() })
      .from(tests)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalRows[0]?.total ?? 0;

    return {
      data: data.map((t) => ({
        ...t,
        attemptCount: attemptCounts[t.id] ?? 0,
      })),
      page: input.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  },

  async listForUserFeed(input: ListUserTestsInput, userId: string) {
    const { page, pageSize = PAGE_SIZE } = input;
    const offset = (page - 1) * pageSize;

    const data = await db.query.tests.findMany({
      where: eq(tests.status, "active"),
      limit: pageSize,
      offset,
      orderBy: desc(tests.createdAt),
    });

    const testIds = data.map((t) => t.id);

    if (testIds.length === 0) {
      return {
        data: [],
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      };
    }

    const attemptRows = await db
      .select({
        testId: testAttempts.testId,
        count: count(),
      })
      .from(testAttempts)
      .where(inArray(testAttempts.testId, testIds))
      .groupBy(testAttempts.testId);

    const attemptCountMap = Object.fromEntries(
      attemptRows.map((r) => [r.testId, r.count]),
    );

    const userAttemptRows = await db
      .select({
        testId: testAttempts.testId,
      })
      .from(testAttempts)
      .where(
        and(
          eq(testAttempts.userId, userId),
          inArray(testAttempts.testId, testIds),
        ),
      )
      .groupBy(testAttempts.testId);

    const userAttemptSet = new Set(userAttemptRows.map((r) => r.testId));

    const enriched = data.map((t) => ({
      ...t,
      attemptCount: attemptCountMap[t.id] ?? 0,
      hasAttempted: userAttemptSet.has(t.id),
    }));

    const totalRows = await db
      .select({ total: count() })
      .from(tests)
      .where(eq(tests.status, "active"));

    const total = totalRows[0]?.total ?? 0;

    return {
      data: enriched,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async getById(input: GetTestInput) {
    const test = await db.query.tests.findFirst({
      where: eq(tests.id, input.id),
    });

    if (!test) throw new Error("Test not found");

    return { ...test, audioUrl: R2Service.getPublicUrl(test.audioKey) };
  },

  async getLast24HourTests() {
    const now = new Date();

    const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const data = await db.query.tests.findMany({
      where: gte(tests.createdAt, past24Hours),
      orderBy: desc(tests.createdAt),
    });

    return data;
  },

  async searchForUser(input: SearchTestsInput, userId: string) {
    const { query, type, page, pageSize } = input;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(tests.status, "active"),
      ilike(tests.title, `%${query}%`),
      type ? eq(tests.type, type) : undefined,
    ].filter(Boolean);

    const whereClause = and(...conditions);

    const data = await db.query.tests.findMany({
      where: whereClause,
      limit: pageSize,
      offset,
      orderBy: desc(tests.createdAt),
    });

    const testIds = data.map((t) => t.id);

    // Attempt counts
    const attemptRows =
      testIds.length > 0
        ? await db
            .select({ testId: testAttempts.testId, count: count() })
            .from(testAttempts)
            .where(inArray(testAttempts.testId, testIds))
            .groupBy(testAttempts.testId)
        : [];
    const attemptCountMap = Object.fromEntries(
      attemptRows.map((r) => [r.testId, r.count]),
    );

    // User has attempted
    const userAttemptRows =
      testIds.length > 0
        ? await db
            .select({ testId: testAttempts.testId })
            .from(testAttempts)
            .where(
              and(
                eq(testAttempts.userId, userId),
                inArray(testAttempts.testId, testIds),
              ),
            )
            .groupBy(testAttempts.testId)
        : [];
    const userAttemptSet = new Set(userAttemptRows.map((r) => r.testId));

    const total = await db.$count(tests, whereClause);

    return {
      data: data.map((t) => ({
        ...t,
        attemptCount: attemptCountMap[t.id] ?? 0,
        hasAttempted: userAttemptSet.has(t.id),
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

    const conditions = [];

    if (status) {
      conditions.push(eq(tests.status, status));
    }

    if (type) {
      conditions.push(eq(tests.type, type));
    }

    if (adminId) {
      conditions.push(eq(tests.adminId, adminId));
    }

    if (fromDate) {
      conditions.push(gte(tests.createdAt, fromDate));
    }

    if (toDate) {
      conditions.push(lte(tests.createdAt, toDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderBy =
      sort === "oldest" ? asc(tests.createdAt) : desc(tests.createdAt);

    const data = await db.query.tests.findMany({
      where: whereClause,
      limit: pageSize,
      offset,
      orderBy,
    });

    const totalRows = await db
      .select({ total: count() })
      .from(tests)
      .where(whereClause);

    const total = totalRows[0]?.total ?? 0;

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  },
};
