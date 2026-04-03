import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import * as adminProxy from "./adminProxy";

// ─── Role guard helpers ───────────────────────────────────────────────────────
const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user.tempoRole;
  if (!role || !["owner", "center_manager", "sub_manager"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ─────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(async (opts) => {
      if (!opts.ctx.user) return null;
      const user = await db.getUserById(opts.ctx.user.id);
      return user ?? null;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        avatarUrl: z.string().optional(),
        bizPtTrainerId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ─── Organizations ────────────────────────────────────────────────────────
  org: router({
    list: protectedProcedure.query(() => db.getOrganizations()),
    create: managerProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["company", "center", "team", "tf"]),
        parentId: z.number().optional(),
        managerId: z.number().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(({ input }) => db.createOrganization(input)),
    members: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(({ input }) => db.getUsersByOrg(input.organizationId)),
  }),

  // ─── TODOs ────────────────────────────────────────────────────────────────
  todo: router({
    list: protectedProcedure
      .input(z.object({
        periodType: z.string().optional(),
        year: z.number().optional(),
        month: z.number().optional(),
        week: z.number().optional(),
        status: z.string().optional(),
      }))
      .query(({ ctx, input }) => db.getTodos(ctx.user.id, input)),

    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        periodType: z.enum(["annual", "half_year", "quarter", "monthly", "weekly", "daily", "custom"]),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        year: z.number().optional(),
        month: z.number().optional(),
        week: z.number().optional(),
        estimatedMinutes: z.number().optional(),
        priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
        category: z.string().optional(),
        organizationId: z.number().optional(),
        isTeamTask: z.boolean().optional(),
        parentTodoId: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { startDate, endDate, ...rest } = input;
        return db.createTodo({
          ...rest,
          userId: ctx.user.id,
          startDate: startDate ? new Date(startDate) as any : undefined,
          endDate: endDate ? new Date(endDate) as any : undefined,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
        priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
        estimatedMinutes: z.number().optional(),
        actualMinutes: z.number().optional(),
        completionRate: z.number().optional(),
        category: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateTodo(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteTodo(input.id, ctx.user.id)),

    weekSplits: protectedProcedure
      .input(z.object({ todoId: z.number() }))
      .query(({ input }) => db.getTodoWeekSplits(input.todoId)),

    upsertWeekSplit: protectedProcedure
      .input(z.object({
        todoId: z.number(),
        year: z.number(),
        week: z.number(),
        plannedMinutes: z.number(),
        actualMinutes: z.number().optional(),
      }))
      .mutation(({ input }) => db.upsertTodoWeekSplit(input)),
  }),

  // ─── Schedule ─────────────────────────────────────────────────────────────
  schedule: router({
    blocks: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(({ ctx, input }) => db.getScheduleBlocks(ctx.user.id, input.startDate, input.endDate)),

    createBlock: protectedProcedure
      .input(z.object({
        title: z.string(),
        blockType: z.enum(["todo", "free", "team_task", "template", "private"]),
        todoId: z.number().optional(),
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        durationMinutes: z.number(),
        color: z.string().optional(),
        note: z.string().optional(),
        organizationId: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { date, ...rest } = input;
        return db.createScheduleBlock({ ...rest, date: new Date(date) as any, userId: ctx.user.id });
      }),

    updateBlock: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        date: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        durationMinutes: z.number().optional(),
        isCompleted: z.boolean().optional(),
        note: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, date, ...data } = input;
        return db.updateScheduleBlock(id, ctx.user.id, { ...data, ...(date ? { date: new Date(date) as any } : {}) });
      }),

    deleteBlock: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteScheduleBlock(input.id, ctx.user.id)),

    templates: protectedProcedure.query(({ ctx }) => db.getScheduleTemplates(ctx.user.id)),

    createTemplate: protectedProcedure
      .input(z.object({
        name: z.string(),
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
        title: z.string(),
        blockType: z.enum(["todo", "free", "team_task", "private"]),
        color: z.string().optional(),
        organizationId: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => db.createScheduleTemplate({ ...input, userId: ctx.user.id })),

    applyTemplate: protectedProcedure
      .input(z.object({ weekStartDate: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const templates = await db.getScheduleTemplates(ctx.user.id);
        const startDate = new Date(input.weekStartDate);
        const created = [];
        for (const tmpl of templates) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + tmpl.dayOfWeek);
          const dateStr = date.toISOString().split("T")[0];
          const [sh, sm] = tmpl.startTime.split(":").map(Number);
          const [eh, em] = tmpl.endTime.split(":").map(Number);
          const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
          const block = await db.createScheduleBlock({
            userId: ctx.user.id,
            title: tmpl.title,
            blockType: tmpl.blockType,
            date: dateStr as any,
            startTime: tmpl.startTime,
            endTime: tmpl.endTime,
            durationMinutes,
            color: tmpl.color,
            organizationId: tmpl.organizationId,
          });
          created.push(block);
        }
        return { created: created.length };
      }),
  }),

  // ─── Reports ──────────────────────────────────────────────────────────────
  report: router({
    daily: protectedProcedure
      .input(z.object({ reportDate: z.string() }))
      .query(({ ctx, input }) => db.getDailyReport(ctx.user.id, input.reportDate)),

    dailyList: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(({ ctx, input }) => db.getDailyReports(ctx.user.id, input.startDate, input.endDate)),

    saveDailyReport: protectedProcedure
      .input(z.object({
        reportDate: z.string(),
        totalMembers: z.number().optional(),
        newMembers: z.number().optional(),
        cancelledMembers: z.number().optional(),
        netChange: z.number().optional(),
        revenueTarget: z.number().optional(),
        revenueActual: z.number().optional(),
        importantMatters: z.array(z.any()).optional(),
        scheduleAchievementRate: z.number().optional(),
        completedBlocks: z.number().optional(),
        totalBlocks: z.number().optional(),
        tomorrowTasks: z.array(z.any()).optional(),
        memo: z.string().optional(),
        status: z.enum(["draft", "submitted", "approved"]).optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { reportDate, ...rest } = input;
        return db.upsertDailyReport({
          ...rest,
          reportDate: new Date(reportDate) as any,
          userId: ctx.user.id,
          organizationId: ctx.user.organizationId ?? undefined,
        });
      }),

    weekly: protectedProcedure
      .input(z.object({ year: z.number(), week: z.number() }))
      .query(({ ctx, input }) => db.getWeeklyReport(ctx.user.id, input.year, input.week)),

    saveWeeklyReport: protectedProcedure
      .input(z.object({
        year: z.number(),
        week: z.number(),
        weekStartDate: z.string(),
        weekEndDate: z.string(),
        totalMembers: z.number().optional(),
        weeklyNewMembers: z.number().optional(),
        weeklyCancelledMembers: z.number().optional(),
        weeklyRevenue: z.number().optional(),
        revenueTarget: z.number().optional(),
        todoCompletionRate: z.number().optional(),
        completedTodos: z.number().optional(),
        totalTodos: z.number().optional(),
        achievements: z.array(z.any()).optional(),
        issues: z.array(z.any()).optional(),
        nextWeekPlan: z.array(z.any()).optional(),
        memo: z.string().optional(),
        status: z.enum(["draft", "submitted", "approved"]).optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { weekStartDate, weekEndDate, ...rest } = input;
        return db.upsertWeeklyReport({
          ...rest,
          weekStartDate: new Date(weekStartDate) as any,
          weekEndDate: new Date(weekEndDate) as any,
          userId: ctx.user.id,
          organizationId: ctx.user.organizationId ?? undefined,
        });
      }),
  }),

  // ─── Approval Requests ────────────────────────────────────────────────────
  approval: router({
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
  }),

  // ─── Member Interviews ────────────────────────────────────────────────────
  interview: router({
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
      .mutation(({ input }) => {
        const { id, nextInterviewDate, ...rest } = input;
        return db.updateMemberInterview(id, {
          ...rest,
          nextInterviewDate: nextInterviewDate ? new Date(nextInterviewDate) : undefined,
        });
      }),
  }),

  // ─── Admin Proxy ──────────────────────────────────────────────────────────
  admin: router({
    login: managerProcedure
      .input(z.object({ id: z.string(), password: z.string() }))
      .mutation(({ input }) => adminProxy.loginToAdmin(input.id, input.password)),

    sessionStatus: protectedProcedure.query(() => adminProxy.checkAdminSession()),

    trainers: protectedProcedure.query(() => adminProxy.fetchTrainers()),

    todayStats: protectedProcedure.query(() => adminProxy.fetchTodayMemberStats()),

    cancellations: protectedProcedure.query(() => adminProxy.fetchCancellationList()),

    newMembers: protectedProcedure.query(() => adminProxy.fetchNewMemberList()),

    revenue: protectedProcedure.query(() => adminProxy.fetchRevenueData()),

    trainerSchedule: protectedProcedure
      .input(z.object({ trainerId: z.string().optional() }))
      .query(({ input }) => adminProxy.fetchTrainerSchedule(input.trainerId)),

    notifications: protectedProcedure.query(() => adminProxy.fetchNotifications()),
  }),
});

export type AppRouter = typeof appRouter;
