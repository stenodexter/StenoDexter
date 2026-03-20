import { nanoid } from "nanoid";
import { eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { adminInvite, adminInviteUsage, admin } from "~/server/db/schema";
import type { InviteStatus } from "~/server/db/schema/admin";
import type { CreateInviteInput, UpdateInviteInput } from "./invite.schema";

// ── status helpers ────────────────────────────────────────────────────────────

/**
 * Derives the correct status from current DB values.
 * 'invalidated' is always preserved — it can only be set manually.
 */
function deriveStatus(row: {
  status: InviteStatus;
  usedCount: number;
  maxUses: number;
  expiresAt: Date | null;
}): InviteStatus {
  if (row.status === "invalidated") return "invalidated";
  if (row.expiresAt && row.expiresAt <= new Date()) return "expired";
  if (row.usedCount >= row.maxUses) return "limit_reached";
  return "active";
}

/**
 * Refreshes the stored status if it has drifted (e.g. expiry time just passed).
 * Writes back to DB only when the status actually changed.
 * Eliminates the need for a cron job.
 */
async function withFreshStatus<
  T extends {
    id: string;
    status: InviteStatus;
    usedCount: number;
    maxUses: number;
    expiresAt: Date | null;
  },
>(row: T): Promise<T> {
  const live = deriveStatus(row);
  if (live !== row.status) {
    await db
      .update(adminInvite)
      .set({ status: live })
      .where(eq(adminInvite.id, row.id));
    return { ...row, status: live };
  }
  return row;
}

// ── service ───────────────────────────────────────────────────────────────────

export const inviteService = {
  async create(input: CreateInviteInput, adminId: string) {
    const [invite] = await db
      .insert(adminInvite)
      .values({
        id: nanoid(),
        token: nanoid(8),
        createdByAdminId: adminId,
        maxUses: input.maxUses,
        usedCount: 0,
        expiresAt: input.expiresAt ?? null,
        status: "active",
      })
      .returning();
    return invite!;
  },

  async list() {
    const rows = await db.query.adminInvite.findMany({
      orderBy: (i, { desc }) => [desc(i.createdAt)],
      with: {
        createdBy: { columns: { id: true, name: true, username: true } },
      },
    });
    // Lazily update any expired/limit_reached invites that are still marked active
    return Promise.all(rows.map(withFreshStatus));
  },

  async getById(id: string) {
    const row = await db.query.adminInvite.findFirst({
      where: (i, { eq }) => eq(i.id, id),
      with: {
        createdBy: { columns: { id: true, name: true, username: true } },
      },
    });
    if (!row) return null;
    return withFreshStatus(row);
  },

  async update(input: UpdateInviteInput) {
    const existing = await db.query.adminInvite.findFirst({
      where: (i, { eq }) => eq(i.id, input.id),
    });
    if (!existing)
      throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });

    const patch: Partial<typeof adminInvite.$inferInsert> = {};

    if (input.maxUses !== undefined) patch.maxUses = input.maxUses;
    if (input.expiresAt !== undefined) patch.expiresAt = input.expiresAt;

    if (input.invalidate) {
      // Manual invalidation — stored directly, never auto-reverted
      patch.status = "invalidated";
    } else if (patch.maxUses !== undefined || patch.expiresAt !== undefined) {
      // Re-derive when limits/expiry change, but never un-invalidate
      if (existing.status !== "invalidated") {
        patch.status = deriveStatus({
          status: existing.status,
          usedCount: existing.usedCount,
          maxUses: patch.maxUses ?? existing.maxUses,
          expiresAt: patch.expiresAt ?? existing.expiresAt,
        });
      }
    }

    const [updated] = await db
      .update(adminInvite)
      .set(patch)
      .where(eq(adminInvite.id, input.id))
      .returning();
    return updated!;
  },

  /**
   * Called during admin registration to consume one use.
   * Transitions to limit_reached when the last slot is taken.
   */
  async recordUse(inviteId: string, newAdminId: string) {
    const invite = await db.query.adminInvite.findFirst({
      where: (i, { eq }) => eq(i.id, inviteId),
    });
    if (!invite)
      throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });

    // Refresh status before checking — might have just expired
    const fresh = await withFreshStatus(invite);
    if (fresh.status !== "active") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Invite is ${fresh.status}`,
      });
    }

    const newCount = fresh.usedCount + 1;
    const newStatus: InviteStatus =
      newCount >= fresh.maxUses ? "limit_reached" : "active";

    await db
      .update(adminInvite)
      .set({ usedCount: newCount, status: newStatus })
      .where(eq(adminInvite.id, inviteId));

    await db.insert(adminInviteUsage).values({
      id: nanoid(),
      inviteId,
      usedByAdminId: newAdminId,
    });

    return { ok: true, remaining: fresh.maxUses - newCount };
  },

  async delete(id: string) {
    await db.delete(adminInvite).where(eq(adminInvite.id, id));
    return { ok: true };
  },

  async deleteMany(ids: string[]) {
    await db.delete(adminInvite).where(inArray(adminInvite.id, ids));
    return { deleted: ids.length };
  },

  async listAdmins() {
    return db.query.admin.findMany({
      columns: {
        id: true,
        name: true,
        username: true,
        image: true,
        isSuper: true,
        isSystem: true,
        createdAt: true,
      },
      orderBy: (a, { asc }) => [asc(a.createdAt)],
    });
  },

  async promoteToSuper(targetAdminId: string, callerAdminId: string) {
    const target = await db.query.admin.findFirst({
      where: (a, { eq }) => eq(a.id, targetAdminId),
    });
    if (!target)
      throw new TRPCError({ code: "NOT_FOUND", message: "Admin not found" });
    if (target.isSystem)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot modify system admin",
      });
    if (target.id === callerAdminId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot modify your own role",
      });
    await db
      .update(admin)
      .set({ isSuper: true })
      .where(eq(admin.id, targetAdminId));
    return { ok: true };
  },

  async demoteFromSuper(targetAdminId: string, callerAdminId: string) {
    const target = await db.query.admin.findFirst({
      where: (a, { eq }) => eq(a.id, targetAdminId),
    });
    if (!target)
      throw new TRPCError({ code: "NOT_FOUND", message: "Admin not found" });
    if (target.isSystem)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot modify system admin",
      });
    if (target.id === callerAdminId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot modify your own role",
      });
    await db
      .update(admin)
      .set({ isSuper: false })
      .where(eq(admin.id, targetAdminId));
    return { ok: true };
  },
};
