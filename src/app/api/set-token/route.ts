import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { token, name, time } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const cookieStore = await cookies();

  cookieStore.set(name ?? "token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: time ?? 60 * 60 * 24 * 7,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
