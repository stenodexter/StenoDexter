import { APIError, type BetterAuthOptions } from "better-auth";
import { getOAuthState } from "better-auth/api";
import { and, eq, ne } from "drizzle-orm";

import { getDeviceId, getUserAgent, getIpAddress } from "./helpers";
import { deviceService } from "~/server/api/routers/device/device.service";
import { db } from "~/server/db";
import { session as sessionTable } from "~/server/db/schema";
import { redisService } from "~/server/services/redis.service";

async function invalidatePreviousSessions(
  userId: string,
  keepToken: string | null,
): Promise<void> {
  const existingSessions = await db
    .select({ token: sessionTable.token })
    .from(sessionTable)
    .where(eq(sessionTable.userId, userId));

  const tokensToDelete = existingSessions
    .map((s) => s.token)
    .filter((t) => t !== keepToken);

  if (tokensToDelete.length === 0) return;

  if (keepToken) {
    await db
      .delete(sessionTable)
      .where(
        and(ne(sessionTable.token, keepToken), eq(sessionTable.userId, userId)),
      );
  } else {
    await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
  }

  await Promise.allSettled(
    tokensToDelete.map((token) => redisService.del(token)),
  );

  const ACTIVE_SESSIONS_KEY = `active-sessions-${userId}`;
  if (keepToken) {
    try {
      const raw = await redisService.get<string>(ACTIVE_SESSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          token: string;
          expiresAt: number;
        }[];
        const filtered = parsed.filter((s) => s.token === keepToken);
        if (filtered.length > 0) {
          await redisService.set(
            ACTIVE_SESSIONS_KEY,
            JSON.stringify(filtered),
            6 * 24 * 60 * 60,
          );
        } else {
          await redisService.del(ACTIVE_SESSIONS_KEY);
        }
      }
    } catch {
      await redisService.del(ACTIVE_SESSIONS_KEY).catch(() => null);
    }
  } else {
    await redisService.del(ACTIVE_SESSIONS_KEY).catch(() => null);
  }
}

export const databaseHooks: BetterAuthOptions["databaseHooks"] = {
  session: {
    create: {
      before: async (session, ctx) => {
        const request = ctx?.request as Request | undefined;

        let deviceId = getDeviceId(request);

        if (!deviceId) {
          const oauthState = await getOAuthState();
          const data = oauthState as { deviceId?: string } | null;
          deviceId = data?.deviceId ?? null;
        }

        const userId = session.userId;
        const existing = await deviceService.get(userId);

        if (!existing) {
          if (!deviceId) {
            throw new APIError("UNAUTHORIZED", { message: "DEVICE_MISSING" });
          }

          await invalidatePreviousSessions(userId, null);

          await deviceService.create({
            userId,
            deviceId,
            userAgent: getUserAgent(request),
            ipAddress: getIpAddress(request),
          });

          return { data: session };
        }

        if (!deviceId || existing.deviceId !== deviceId) {
          throw new APIError("UNAUTHORIZED", { message: "DEVICE_MISMATCH" });
        }

        await invalidatePreviousSessions(userId, session.token);

        void deviceService.update({
          userId,
          userAgent: getUserAgent(request),
          ipAddress: getIpAddress(request),
        });

        return { data: session };
      },
    },
  },
};
