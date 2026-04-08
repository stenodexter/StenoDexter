// ─── server/services/notifications.service.ts ────────────────────────────────

import {
  and,
  arrayContains,
  desc,
  eq,
  inArray,
  not,
  or,
  sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import { db as globalDb } from "~/server/db";
import { notifications, user } from "~/server/db/schema";
import type {
  DeleteManyNotificationsInput,
  DeleteNotificationInput,
  ListNotificationsInput,
  MarkAllSeenInput,
  MarkSeenInput,
  SendNotificationInput,
  UpdateNotificationInput,
} from "./notification.schema";

import type { db as dbInstance } from "~/server/db";
type Db = typeof dbInstance;

function visibleTo(userId: string) {
  return or(eq(notifications.to, "everyone"), eq(notifications.to, userId));
}

function unreadFor(userId: string) {
  return not(arrayContains(notifications.seenBy, [userId]));
}

const markSeenSql = (userId: string) => sql`
  CASE
    WHEN ${sql.raw(`'${userId}'`)} = ANY(seen_by)
      THEN seen_by
    ELSE array_append(seen_by, ${userId})
  END
`;

// ─── factory ──────────────────────────────────────────────────────────────────

export function createNotificationsService(db: Db) {
  return {
    async send(input: SendNotificationInput) {
      const [row] = await db
        .insert(notifications)
        .values({
          id: nanoid(),
          title: input.title,
          message: input.message,
          to: input.to,
          seenBy: [],
          link: input.link ?? null,
          isLinkExternal: input.isLinkExternal ?? null,
        })
        .returning();

      return row!;
    },

    async list(input: ListNotificationsInput) {
      const { userId, unreadOnly, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (userId) {
        conditions.push(visibleTo(userId));
        if (unreadOnly) conditions.push(unreadFor(userId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [countRow]] = await Promise.all([
        db
          .select({
            id: notifications.id,
            title: notifications.title,
            message: notifications.message,
            to: notifications.to,
            seenBy: notifications.seenBy,
            link: notifications.link,
            isLinkExternal: notifications.isLinkExternal,
            createdAt: notifications.createdAt,
            userEmail: user.email,
            userCode: user.userCode,
          })
          .from(notifications)
          .leftJoin(
            user,
            and(
              eq(notifications.to, user.id),
              not(eq(notifications.to, "everyone")),
            ),
          )
          .where(where)
          .orderBy(desc(notifications.createdAt))
          .limit(pageSize)
          .offset(offset),

        db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(notifications)
          .where(where),
      ]);

      const total = countRow?.count ?? 0;

      let unreadCount = 0;
      if (userId) {
        const [unreadRow] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(notifications)
          .where(and(visibleTo(userId), unreadFor(userId)));
        unreadCount = unreadRow?.count ?? 0;
      }

      return {
        data: rows,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          unreadCount,
        },
      };
    },

    async getById(id: string) {
      const [row] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1);
      return row ?? null;
    },

    async markSeen(input: MarkSeenInput): Promise<void> {
      await db
        .update(notifications)
        .set({ seenBy: markSeenSql(input.userId) })
        .where(
          and(inArray(notifications.id, input.ids), visibleTo(input.userId)),
        );
    },

    async markAllSeen(input: MarkAllSeenInput): Promise<void> {
      await db
        .update(notifications)
        .set({ seenBy: markSeenSql(input.userId) })
        .where(and(visibleTo(input.userId), unreadFor(input.userId)));
    },

    async update(input: UpdateNotificationInput) {
      const patch: Partial<typeof notifications.$inferInsert> = {};
      if (input.title !== undefined) patch.title = input.title;
      if (input.message !== undefined) patch.message = input.message;
      if (input.link !== undefined) patch.link = input.link;
      if (input.isLinkExternal !== undefined)
        patch.isLinkExternal = input.isLinkExternal;

      const [row] = await db
        .update(notifications)
        .set(patch)
        .where(eq(notifications.id, input.id))
        .returning();

      if (!row) throw new Error(`Notification ${input.id} not found`);
      return row;
    },

    async delete(input: DeleteNotificationInput): Promise<void> {
      await db.delete(notifications).where(eq(notifications.id, input.id));
    },

    async deleteMany(input: DeleteManyNotificationsInput): Promise<void> {
      await db
        .delete(notifications)
        .where(inArray(notifications.id, input.ids));
    },

    async deleteOlderThan(before: Date): Promise<number> {
      const result = await db
        .delete(notifications)
        .where(
          sql`${notifications.createdAt} < ${before.toISOString()}::timestamptz`,
        )
        .returning({ id: notifications.id });
      return result.length;
    },

    async unreadCount(userId: string): Promise<number> {
      const [row] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(notifications)
        .where(and(visibleTo(userId), unreadFor(userId)));
      return row?.count ?? 0;
    },
  };
}

export const notificationsService = createNotificationsService(globalDb);
