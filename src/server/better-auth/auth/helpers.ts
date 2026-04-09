const DEVICE_ID_HEADER = "x-device-id";

export function getDeviceId(request: Request | undefined): string | null {
  if (!request) return null;
  return request.headers.get(DEVICE_ID_HEADER) ?? null;
}

export function getUserAgent(request: Request | undefined): string | null {
  return request?.headers.get("user-agent") ?? null;
}

export function getIpAddress(request: Request | undefined): string | null {
  return (
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request?.headers.get("x-real-ip") ??
    null
  );
}