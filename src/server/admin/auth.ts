import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "~/server/db";
import { adminInvite, adminSession, adminUser } from "~/server/db/schema";

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_TTL_HOURS = 24;
const ADMIN_ALLOW_TOKEN = "FRESH_ADMIN_TOKEN_3489693";

function generateId(prefix: string) {
  return `${prefix}_${randomBytes(16).toString("hex")}`;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const now = new Date();
  const [session] = await db
    .select()
    .from(adminSession)
    .where(eq(adminSession.token, token))
    .limit(1);

  if (!session || session.expiresAt <= now) {
    return null;
  }

  const [admin] = await db
    .select()
    .from(adminUser)
    .where(eq(adminUser.id, session.adminId))
    .limit(1);

  return admin ?? null;
}

export async function requireSuperAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.isSuper) {
    throw new Error("Super admin required");
  }
  return admin;
}

export async function createAdminInvite() {
  const superAdmin = await requireSuperAdmin();
  const token = randomBytes(24).toString("base64url");
  const now = new Date();
  const expiresAt = addHours(now, 24 * 7); // 7 days

  const id = generateId("inv");
  await db.insert(adminInvite).values({
    id,
    token,
    createdByAdminId: superAdmin.id,
    createdAt: now,
    expiresAt,
  });

  return { token };
}

export async function registerAdminFromInvite(input: {
  token: string;
  name: string;
  username: string;
  password: string;
}) {
  const now = new Date();
  const [invite] = await db
    .select()
    .from(adminInvite)
    .where(
      and(
        eq(adminInvite.token, input.token),
        isNull(adminInvite.usedByAdminId),
      ),
    )
    .limit(1);

  
  if (
    !invite ||
    (invite.expiresAt && invite.expiresAt <= now)
  ) {
    throw new Error("Invalid or expired invite");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const adminId = generateId("adm");

  await db.transaction(async (tx) => {
    await tx.insert(adminUser).values({
      id: adminId,
      name: input.name,
      username: input.username,
      passwordHash,
      isSuper: false,
      createdAt: now,
      updatedAt: now,
    });

    await tx
      .update(adminInvite)
      .set({ usedByAdminId: adminId, usedAt: now })
      .where(eq(adminInvite.id, invite.id));
  });

  return await createAdminSession(adminId);
}

export async function loginAdmin(input: {
  username: string;
  password: string;
}) {
  const [admin] = await db
    .select()
    .from(adminUser)
    .where(eq(adminUser.username, input.username))
    .limit(1);

  if (!admin) {
    throw new Error("Invalid credentials");
  }

  const ok = await bcrypt.compare(input.password, admin.passwordHash);
  if (!ok) {
    throw new Error("Invalid credentials");
  }

  return await createAdminSession(admin.id);
}

async function createAdminSession(adminId: string) {
  const now = new Date();
  const expiresAt = addHours(now, ADMIN_SESSION_TTL_HOURS);
  const token = randomBytes(32).toString("base64url");

  const id = generateId("sess");
  const hdrs = await headers();

  await db.insert(adminSession).values({
    id,
    adminId,
    token,
    createdAt: now,
    expiresAt,
    ipAddress: hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? null,
    userAgent: hdrs.get("user-agent") ?? null,
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });

  return { success: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(adminSession).where(eq(adminSession.token, token));
    cookieStore.delete(ADMIN_SESSION_COOKIE);
  }
  return { success: true };
}
