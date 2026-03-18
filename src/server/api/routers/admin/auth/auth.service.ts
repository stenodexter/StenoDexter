import { eq } from "drizzle-orm";
import { admin, adminSession, adminInvite } from "~/server/db/schema";
import { nanoid } from "nanoid";
import { hashPassword, comparePassword } from "~/server/lib/hash";
import { serialize } from "cookie";
import { env } from "~/env";
import type { LoginInput, RegisterInput } from "./auth.schema";
import type { TRPCContext } from "~/server/api/trpc";

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

    // 🔥 SUPER ADMIN
    if (code === env.ADMIN_INVITE_CODE) {
      isSuper = true;
    }

    // 🔥 INVITE FLOW
    else {
      const invite = await ctx.db.query.adminInvite.findFirst({
        where: eq(adminInvite.token, code),
      });

      if (!invite) throw new Error("Invalid invite code");

      if (invite.usedCount >= invite.maxUses) {
        throw new Error("Invite usage limit reached");
      }

      invitedByAdminId = invite.createdByAdminId;

      // increment usage
      await ctx.db
        .update(adminInvite)
        .set({
          usedCount: invite.usedCount + 1,
        })
        .where(eq(adminInvite.id, invite.id));
    }

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

    if (newAdmin) return this.createSession(newAdmin, ctx);
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

    ctx.setCookie = serialize(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });

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

    ctx.setCookie = serialize(COOKIE_NAME, token, cookieOptions);

    return {
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        isSuper: adminUser.isSuper,
      },
    };
  },
};
