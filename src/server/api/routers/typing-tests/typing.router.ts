import { createTRPCRouter } from "../../trpc";
import { manageTypingRouter } from "./manage/manage-typing.router";

export const typingTestRouter = createTRPCRouter({
  manage: manageTypingRouter,
});
