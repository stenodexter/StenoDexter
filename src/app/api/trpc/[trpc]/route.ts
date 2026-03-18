import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

async function handler(req: NextRequest) {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: req.headers,
      }),
  });

  const res = new NextResponse(response.body, response);

  return res;
}

export { handler as GET, handler as POST };
