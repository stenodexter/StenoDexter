import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db as globalDb } from "~/server/db";
import { account, session, user } from "~/server/db/schema";
import type {
  CreateDemoUserInput,
  EditDemoUserInput,
  ListDemoUsersInput,
} from "./dus.schema";
import type { db as dbInstance } from "~/server/db";
import { hashPassword } from "~/server/lib/hash";
import { invalidateSubscriptionCache } from "../../trpc";
import { notificationsService } from "../notifications/notification.service";

type Db = typeof dbInstance;

function generateTempPassword(length = 10): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

function getDemoStatus(
  u: Pick<typeof user.$inferSelect, "isDemo" | "demoExpiresAt" | "demoRevoked">,
): "active" | "expired" | "revoked" {
  if (u.demoRevoked) return "revoked";
  if (u.demoExpiresAt && new Date() > new Date(u.demoExpiresAt))
    return "expired";
  return "active";
}

export function createDusService(db: Db) {
  return {
    async create(input: CreateDemoUserInput, createdByAdminId: string) {
      const num = Math.floor(10000 + Math.random() * 90000);
      const SDID = "DEMO" + num;

      const userEmail = SDID.toLowerCase() + "@stenodexter.com";

      const existing = await db.query.user.findFirst({
        where: eq(user.email, userEmail),
      });
      if (existing) throw new Error("A user with this email already exists");

      const tempPassword = generateTempPassword();

      const passwordHash = await hashPassword(tempPassword);

      const newUser = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(user)
          .values({
            id: crypto.randomUUID(),
            name: "SD_" + SDID,
            email: userEmail,
            userCode: SDID,
            emailVerified: true,
            isDemo: true,
            demoExpiresAt: input.expiresAt ?? null,
            demoNote: input.note ?? null,
            demoCreatedByAdminId: createdByAdminId,
          })
          .returning();

        // Credential account so they can actually log in
        await tx.insert(account).values({
          id: crypto.randomUUID(),
          accountId: created!.id,
          providerId: "credential",
          userId: created!.id,
          password: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return created!;
      });

      await notificationsService.send({
        title: "🎉 Your demo access is ready",
        message: `You can now explore the app. ${
          input.expiresAt
            ? `Valid till ${new Date(input.expiresAt).toLocaleDateString(
                "en-IN",
                {
                  day: "2-digit",
                  month: "short",
                },
              )}.`
            : "Enjoy your access."
        }`,
        to: newUser.id,
        link: "/user",
        isLinkExternal: false,
      });

      return {
        user: newUser,
        tempPassword,
      };
    },

    async list(input: ListDemoUsersInput) {
      const { page, limit, search, status } = input;
      const offset = (page - 1) * limit;
      const now = new Date();

      // Build where conditions
      const conditions = [eq(user.isDemo, true)];

      if (search) {
        conditions.push(
          or(
            ilike(user.name, `%${search}%`),
            ilike(user.email, `%${search}%`),
          )!,
        );
      }

      if (status === "revoked") {
        conditions.push(eq(user.demoRevoked, true));
      } else if (status === "expired") {
        conditions.push(
          and(
            eq(user.demoRevoked, false),
            sql`${user.demoExpiresAt} IS NOT NULL AND ${user.demoExpiresAt} < ${now}`,
          )!,
        );
      } else if (status === "active") {
        conditions.push(
          and(
            eq(user.demoRevoked, false),
            or(
              sql`${user.demoExpiresAt} IS NULL`,
              sql`${user.demoExpiresAt} >= ${now}`,
            )!,
          )!,
        );
      }

      const where = and(...conditions);

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(user)
          .where(where)
          .orderBy(desc(user.createdAt))
          .limit(limit)
          .offset(offset),

        db.select({ total: count() }).from(user).where(where),
      ]);

      const total = Number(countResult[0]?.total ?? 0);
      return {
        items: rows.map((u) => ({ ...u, status: getDemoStatus(u) })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    },

    // ── get single ────────────────────────────────────────────────────────────

    async get(id: string) {
      const u = await db.query.user.findFirst({
        where: and(eq(user.id, id), eq(user.isDemo, true)),
      });
      if (!u) throw new Error("Demo user not found");
      return { ...u, status: getDemoStatus(u) };
    },

    // ── edit ─────────────────────────────────────────────────────────────────

    async edit(input: EditDemoUserInput) {
      const existing = await db.query.user.findFirst({
        where: and(eq(user.id, input.id), eq(user.isDemo, true)),
      });
      if (!existing) throw new Error("Demo user not found");
      if (existing.demoRevoked)
        throw new Error("Cannot edit a revoked demo user");

      const patch: Partial<typeof user.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.expiresAt !== undefined) patch.demoExpiresAt = input.expiresAt;
      if (input.note !== undefined) patch.demoNote = input.note;

      const [updated] = await db
        .update(user)
        .set(patch)
        .where(eq(user.id, input.id))
        .returning();

      return { ...updated!, status: getDemoStatus(updated!) };
    },

    // ── revoke ────────────────────────────────────────────────────────────────
    // Revoke = soft-delete. Kills all active sessions too.

    async revoke(id: string) {
      const existing = await db.query.user.findFirst({
        where: and(eq(user.id, id), eq(user.isDemo, true)),
      });
      if (!existing) throw new Error("Demo user not found");
      if (existing.demoRevoked) throw new Error("Already revoked");

      await db.transaction(async (tx) => {
        // Kill all active sessions
        await tx.delete(session).where(eq(session.userId, id));

        // Mark revoked
        await tx
          .update(user)
          .set({ demoRevoked: true, updatedAt: new Date() })
          .where(eq(user.id, id));
      });

      await invalidateSubscriptionCache(existing.id);

      return { ok: true };
    },

    async delete(id: string) {
      const existing = await db.query.user.findFirst({
        where: and(eq(user.id, id), eq(user.isDemo, true)),
      });
      if (!existing) throw new Error("Demo user not found");

      await db.transaction(async (tx) => {
        await tx.delete(session).where(eq(session.userId, id));
        await tx.delete(account).where(eq(account.userId, id));
        await tx.delete(user).where(eq(user.id, id));
      });

      return { ok: true };
    },

    // ── reset password ────────────────────────────────────────────────────────
    // Admin can regenerate credentials if demo user loses access

    async resetPassword(id: string) {
      const existing = await db.query.user.findFirst({
        where: and(eq(user.id, id), eq(user.isDemo, true)),
      });
      if (!existing) throw new Error("Demo user not found");
      if (existing.demoRevoked) throw new Error("User is revoked");

      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);

      await db
        .update(account)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(
          and(eq(account.userId, id), eq(account.providerId, "credential")),
        );

      return { tempPassword };
    },
  };
}

export const dusService = createDusService(globalDb);
