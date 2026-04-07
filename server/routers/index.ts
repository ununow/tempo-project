import { router } from "./middleware";
import { systemRouter } from "../_core/systemRouter";
import { authRouter } from "./auth";
import { orgRouter, todoRouter } from "./todo";
import { scheduleRouter } from "./schedule";
import { reportRouter } from "./report";
import { adminRouter } from "./admin";
import { approvalRouter, interviewRouter, teamRouter } from "./team";
import { trainerMemberRouter } from "./member";
import {
  userManagementRouter,
  invitationRouter,
  boardRouter,
  postRouter,
  favoritesRouter,
  externalLinkRouter,
  profileRouter,
} from "./system";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  org: orgRouter,
  todo: todoRouter,
  schedule: scheduleRouter,
  report: reportRouter,
  admin: adminRouter,
  approval: approvalRouter,
  interview: interviewRouter,
  team: teamRouter,
  trainerMember: trainerMemberRouter,
  userManagement: userManagementRouter,
  invitation: invitationRouter,
  board: boardRouter,
  post: postRouter,
  favorites: favoritesRouter,
  externalLink: externalLinkRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
