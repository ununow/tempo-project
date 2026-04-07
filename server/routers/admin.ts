import { z } from "zod";
import { router, protectedProcedure, centerManagerProcedure, TRPCError } from "./middleware";
import * as db from "../db";
import * as adminProxy from "../adminProxy";

export const adminRouter = router({
  login: centerManagerProcedure
    .input(z.object({ id: z.string(), password: z.string() }))
    .mutation(({ input }) => adminProxy.loginToAdmin(input.id, input.password)),
  sessionStatus: protectedProcedure.query(() => adminProxy.checkAdminSession()),
  trainers: protectedProcedure.query(() => adminProxy.fetchTrainers()),
  notifications: protectedProcedure.query(() => adminProxy.fetchNotifications()),
  notificationCount: protectedProcedure.query(() => adminProxy.fetchNotificationCount()),
  emergencyNotice: protectedProcedure.query(() => adminProxy.fetchEmergencyNotice()),
  links: protectedProcedure.query(() => adminProxy.ADMIN_LINKS),
  memberByUid: protectedProcedure
    .input(z.object({ uid: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const role = ctx.user.tempoRole ?? "trainer";
      if (role === "trainer") {
        const myMembers = await db.getTrainerMembers(ctx.user.id);
        const allowed = myMembers.some(m => m.memberUid === input.uid);
        if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "본인 담당 회원만 조회할 수 있습니다." });
      }
      return adminProxy.fetchMemberByUid(input.uid);
    }),
  memberPtSchedule: protectedProcedure
    .input(z.object({ uid: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const role = ctx.user.tempoRole ?? "trainer";
      if (role === "trainer") {
        const myMembers = await db.getTrainerMembers(ctx.user.id);
        const allowed = myMembers.some(m => m.memberUid === input.uid);
        if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "본인 담당 회원만 조회할 수 있습니다." });
      }
      return adminProxy.fetchMemberPtSchedule(input.uid);
    }),
  memberLectureProgress: protectedProcedure
    .input(z.object({ uid: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const role = ctx.user.tempoRole ?? "trainer";
      if (role === "trainer") {
        const myMembers = await db.getTrainerMembers(ctx.user.id);
        const allowed = myMembers.some(m => m.memberUid === input.uid);
        if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "본인 담당 회원만 조회할 수 있습니다." });
      }
      return adminProxy.fetchMemberLectureProgress(input.uid);
    }),
  memberThumbnailMaster: protectedProcedure
    .input(z.object({ uid: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const role = ctx.user.tempoRole ?? "trainer";
      if (role === "trainer") {
        const myMembers = await db.getTrainerMembers(ctx.user.id);
        const allowed = myMembers.some(m => m.memberUid === input.uid);
        if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "본인 담당 회원만 조회할 수 있습니다." });
      }
      return adminProxy.fetchMemberThumbnailMaster(input.uid);
    }),
});
