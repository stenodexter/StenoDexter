import { APIError, type BetterAuthOptions } from "better-auth";
import { getOAuthState } from "better-auth/api";

import { getDeviceId, getUserAgent, getIpAddress } from "./helpers";
import { deviceService } from "~/server/api/routers/device/device.service";

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

        console.log(deviceId, userId);

        const existing = await deviceService.get(userId);

        if (!existing) {
          if (!deviceId) {
            throw new APIError("UNAUTHORIZED", { message: "DEVICE_MISSING" });
          }

          await deviceService.create({
            userId,
            deviceId,
            userAgent: getUserAgent(request),
            ipAddress: getIpAddress(request),
          });

          return { data: session };
        }

        if (!deviceId || existing.deviceId !== deviceId) {
          throw new APIError("UNAUTHORIZED", {
            message: "DEVICE_MISMATCH",
          });
        }

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
