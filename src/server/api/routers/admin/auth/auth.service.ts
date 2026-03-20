import { eq } from "drizzle-orm";
import { admin, adminSession, adminInvite } from "~/server/db/schema";
import { nanoid } from "nanoid";
import { hashPassword, comparePassword } from "~/server/lib/hash";
import { serialize } from "cookie";
import { env } from "~/env";
import type { LoginInput, RegisterInput } from "./auth.schema";
import type { TRPCContext } from "~/server/api/trpc";
import { inviteService } from "../invite/invite.service";

const COOKIE_NAME = "admin_token";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};

export const authService = {
  async register(input: RegisterInput, ctx: TRPCContext) {
    const { name, username, password, code } = input;

    const existing = await ctx.db.query.admin.findFirst({
      where: eq(admin.username, username),
    });
    if (existing) throw new Error("Username already exists");

    let isSuper = false;
    let invitedByAdminId = null;
    let inviteId: string | null = null;

    // ── Super admin via env code ──────────────────────────────────────────────
    if (code === env.ADMIN_INVITE_CODE) {
      isSuper = true;
    }

    // ── Invite flow ───────────────────────────────────────────────────────────
    else {
      const invite = await ctx.db.query.adminInvite.findFirst({
        where: eq(adminInvite.token, code),
      });

      if (!invite) throw new Error("Invalid invite code");

      // Check stored status first — fast path for already-dead invites
      if (invite.status === "invalidated")
        throw new Error("This invite has been invalidated");
      if (invite.status === "limit_reached")
        throw new Error("This invite has reached its usage limit");

      // Check expiry against real time (status may not have been refreshed yet)
      if (invite.expiresAt && invite.expiresAt <= new Date()) {
        // Write the drift back so future reads are accurate
        await ctx.db
          .update(adminInvite)
          .set({ status: "expired" })
          .where(eq(adminInvite.id, invite.id));
        throw new Error("This invite has expired");
      }

      if (invite.status !== "active")
        throw new Error("This invite is no longer valid");

      invitedByAdminId = invite.createdByAdminId;
      inviteId = invite.id;
      // Don't increment here — we do it after insert so we have the new admin's ID
    }

    // ── Create admin ──────────────────────────────────────────────────────────
    const passwordHash = await hashPassword(password);

    const [newAdmin] = await ctx.db
      .insert(admin)
      .values({
        id: nanoid(),
        name,
        username,
        passwordHash,
        isSuper,
        invitedByAdminId,
      })
      .returning();

    if (!newAdmin) throw new Error("Failed to create admin");

    if (inviteId) {
      await inviteService.recordUse(inviteId, newAdmin.id);
    }

    return this.createSession(newAdmin, ctx);
  },

  async login(input: LoginInput, ctx: TRPCContext) {
    const { username, password } = input;

    const adminUser = await ctx.db.query.admin.findFirst({
      where: eq(admin.username, username),
    });

    if (!adminUser) throw new Error("Invalid credentials");

    const valid = await comparePassword(password, adminUser.passwordHash);

    if (!valid) throw new Error("Invalid credentials");

    return this.createSession(adminUser, ctx);
  },

  async logout(ctx: TRPCContext) {
    const token = ctx.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];

    if (token) {
      await ctx.db.delete(adminSession).where(eq(adminSession.token, token));
    }

    // ctx.resHeaders.append(
    //   "Set-Cookie",
    //   serialize(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 }),
    // );
    return { success: true };
  },

  async createSession(adminUser: typeof admin.$inferSelect, ctx: TRPCContext) {
    const token = nanoid(40);

    await ctx.db.insert(adminSession).values({
      id: nanoid(),
      adminId: adminUser.id,
      token,
      ipAddress: null,
      userAgent: null,
      expiresAt: new Date(Date.now() + SEVEN_DAYS),
    });

    return {
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        isSuper: adminUser.isSuper,
        token,
      },
    };
  },
};
