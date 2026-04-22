import { api } from "~/trpc/server";

export async function GET(req: Request) {
  console.log("Starting Daily Cron Service.");

  try {
    await api.crons.expireStaleAttempts();

    return Response.json({ success: true });
  } catch (error) {
    console.error("CRON_ERROR:", error);

    return Response.json({ success: false }, { status: 500 });
  }
}
