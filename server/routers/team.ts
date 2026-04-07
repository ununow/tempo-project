import { z } from "zod";
import { router, protectedProcedure, managerProcedure, centerManagerProcedure, TRPCError } from "./middleware";
import * as db from "../db";

export const approvalRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(({ ctx, input }) => db.getApprovalRequests(ctx.user.organizationId ?? undefined, input.status)),

  create: protectedProcedure
    .input(z.object({
      type: z.enum(["cancel", "transfer", "exception", "other"]),
      memberName: z.string().optional(),
      memberId: z.string().optional(),
      title: z.string(),
      content: z.string().optional(),
      approverId: z.number().optional(),
    }))
    .mutation(({ ctx, input }) => db.createApprovalRequest({
      ...input,
      requesterId: ctx.user.id,
      organizationId: ctx.user.organizationId ?? undefined,
    })),

  process: managerProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      approverComment: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => db.updateApprovalRequest(input.id, {
      status: input.status,
      approverComment: input.approverComment,
      approverId: ctx.user.id,
      processedAt: new Date(),
    })),
});

export const interviewRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getMemberInterviews(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      memberName: z.string(),
      memberId: z.string().optional(),
      interviewDate: z.string(),
      interviewType: z.enum(["regular", "complaint", "renewal", "cancellation", "other"]),
      content: z.string().optional(),
      followUpActions: z.array(z.any()).optional(),
      result: z.enum(["positive", "neutral", "negative", "pending"]).optional(),
      nextInterviewDate: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { interviewDate, nextInterviewDate, ...rest } = input;
      return db.createMemberInterview({
        ...rest,
        trainerId: ctx.user.id,
        interviewDate: new Date(interviewDate) as any,
        nextInterviewDate: nextInterviewDate ? new Date(nextInterviewDate) as any : undefined,
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().optional(),
      followUpActions: z.array(z.any()).optional(),
      result: z.enum(["positive", "neutral", "negative", "pending"]).optional(),
      nextInterviewDate: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => {
      const { id, nextInterviewDate, ...rest } = input;
      return db.updateMemberInterview(id, ctx.user.id, {
        ...rest,
        nextInterviewDate: nextInterviewDate ? new Date(nextInterviewDate) : undefined,
      });
    }),
});

export const teamRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const role = ctx.user.tempoRole ?? "trainer";
    if (["owner", "center_manager"].includes(role)) {
      return db.getTeamsWithMembers();
    } else if (role === "sub_manager") {
      const myTeams = await db.getTeamsByManager(ctx.user.id);
      const ids = myTeams.map(t => t.id);
      return db.getTeamsWithMembers(ids);
    }
    const myTeams = await db.getTeamsByMember(ctx.user.id);
    const ids = myTeams.map(t => t.id);
    return db.getTeamsWithMembers(ids);
  }),
  create: managerProcedure
    .input(z.object({ name: z.string().min(1), color: z.string().optional(), description: z.string().optional() }))
    .mutation(({ input, ctx }) => db.createTeam({ ...input, managerId: ctx.user.id })),
  update: managerProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), color: z.string().optional(), description: z.string().optional() }))
    .mutation(({ input }) => db.updateTeam(input)),
  delete: centerManagerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteTeam(input.id)),
  addMember: managerProcedure
    .input(z.object({ teamId: z.number(), userId: z.number() }))
    .mutation(({ input }) => db.addTeamMember(input.teamId, input.userId)),
  removeMember: managerProcedure
    .input(z.object({ teamId: z.number(), userId: z.number() }))
    .mutation(({ input }) => db.removeTeamMember(input.teamId, input.userId)),
  schedules: protectedProcedure
    .input(z.object({
      teamId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const role = ctx.user.tempoRole ?? "trainer";
      const myTeams = await db.getTeamsByMember(ctx.user.id);
      const myManagerTeams = role === "sub_manager" ? await db.getTeamsByManager(ctx.user.id) : [];
      const allMyTeamIds = [
        ...myTeams.map(t => t.id),
        ...myManagerTeams.map(t => t.id),
      ];
      const isAdmin = ["owner", "center_manager"].includes(role);
      if (!isAdmin && !allMyTeamIds.includes(input.teamId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "팀 멤버만 스케줄을 조회할 수 있습니다." });
      }
      const memberIds = await db.getTeamMemberIds(input.teamId);
      const memberInfos = await db.getUserBasicInfo(memberIds);
      const blocks = await db.getScheduleBlocksByUserIds(memberIds, input.startDate, input.endDate);
      const sanitized = (blocks as any[]).map((b: any) => ({
        ...b,
        title: b.blockType === "private" && b.userId !== ctx.user.id ? "개인 일정" : b.title,
      }));
      return { members: memberInfos, blocks: sanitized };
    }),
  members: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ ctx, input }) => {
      const role = ctx.user.tempoRole ?? "trainer";
      const isAdmin = ["owner", "center_manager"].includes(role);
      if (!isAdmin) {
        const myTeams = await db.getTeamsByMember(ctx.user.id);
        const myManagerTeams = role === "sub_manager" ? await db.getTeamsByManager(ctx.user.id) : [];
        const allMyTeamIds = [...myTeams.map(t => t.id), ...myManagerTeams.map(t => t.id)];
        if (!allMyTeamIds.includes(input.teamId)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      const memberIds = await db.getTeamMemberIds(input.teamId);
      return db.getUserBasicInfo(memberIds);
    }),
});
