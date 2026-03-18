import type { NextApiResponse } from "next";
import { serialize } from "cookie";

export function setCookie(
  res: NextApiResponse,
  name: string,
  value: string,
  opts?: {
    httpOnly?: boolean;
    path?: string;
    maxAge?: number;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  }
) {
  const cookieStr = serialize(name, value, {
    httpOnly: opts?.httpOnly ?? true,
    path: opts?.path ?? "/",
    maxAge: opts?.maxAge,
    secure: opts?.secure ?? (process.env.NODE_ENV === "production"),
    sameSite: opts?.sameSite ?? "lax",
  });

  const prev = res.getHeader("Set-Cookie");
  if (!prev) {
    res.setHeader("Set-Cookie", cookieStr);
  } else if (Array.isArray(prev)) {
    res.setHeader("Set-Cookie", [...prev, cookieStr]);
  } else {
    res.setHeader("Set-Cookie", [String(prev), cookieStr]);
  }
}