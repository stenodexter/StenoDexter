import { createTRPCRouter } from "../../trpc";
import { adminAuthRouter } from "./auth/auth.router";
import { inviteRouter } from "./invite/invite.router";

export const adminRouter = createTRPCRouter({
  auth: adminAuthRouter,
  invite: inviteRouter,
});
