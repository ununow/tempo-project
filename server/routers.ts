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

// 책임센터장 이상만 접근 가능
const centerManagerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user.tempoRole;
  if (!role || !["owner", "center_manager"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "책임센터장 이상 권한이 필요합니다." });
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
    // ─── 실제 시간 누적 업데이트 (타이머 종료 시) ───────────────────────────
    addActualMinutes: protectedProcedure
      .input(z.object({
        id: z.number(),
        minutes: z.number().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const todos = await db.getTodos(ctx.user.id, {});
        const todo = (todos as any[]).find((t: any) => t.id === input.id);
        if (!todo) throw new TRPCError({ code: "NOT_FOUND" });
        const newActual = (todo.actualMinutes ?? 0) + input.minutes;
        return db.updateTodo(input.id, ctx.user.id, { actualMinutes: newActual });
      }),
    // ─── 미완료 TODO 이월 ─────────────────────────────────────────────
    carryOver: protectedProcedure
      .input(z.object({
        todoIds: z.array(z.number()),
        targetPeriodType: z.enum(["daily", "weekly", "monthly"]).default("daily"),
        targetDate: z.string().optional(), // "YYYY-MM-DD"
      }))
      .mutation(async ({ ctx, input }) => {
        const { todoIds, targetPeriodType, targetDate } = input;
        const now = new Date();
        const targetD = targetDate ? new Date(targetDate) : now;
        const year = targetD.getFullYear();
        const month = targetD.getMonth() + 1;
        // ISO week
        const startOfYear = new Date(year, 0, 1);
        const weekNum = Math.ceil(((targetD.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

        const created = [];
        for (const todoId of todoIds) {
          const todos = await db.getTodos(ctx.user.id, {});
          const original = (todos as any[]).find((t: any) => t.id === todoId);
          if (!original) continue;
          // 원본 TODO를 취소로 표시
          await db.updateTodo(todoId, ctx.user.id, { status: "cancelled" });
          // 새 TODO 생성 (이월된 표시)
          const newTodo = await db.createTodo({
            userId: ctx.user.id,
            title: original.title,
            description: original.description,
            periodType: targetPeriodType,
            year,
            month: month,
            week: targetPeriodType === "daily" || targetPeriodType === "weekly" ? weekNum : undefined,
            estimatedMinutes: Math.max(0, (original.estimatedMinutes ?? 0) - (original.actualMinutes ?? 0)),
            priority: original.priority,
            category: original.category,
            isCarriedOver: true,
            originalDate: original.startDate ?? (targetDate ? new Date(targetDate) as any : undefined),
          });
          created.push(newTodo);
        }
        return { carried: created.length };
      }),
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
    deleteTemplate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteScheduleTemplate(input.id)),
    // ─── 자동 스케줄링 (Motion/Sunsama 스타일) ─────────────────────────────
    autoSchedule: protectedProcedure
      .input(z.object({
        weekStartDate: z.string(), // "YYYY-MM-DD" (월요일)
        workStartHour: z.number().default(9),  // 업무 시작 시간 (기본 9시)
        workEndHour: z.number().default(21),   // 업무 종료 시간 (기본 21시)
        breakMinutes: z.number().default(60),  // 점심 휴식 (분)
        breakStartHour: z.number().default(12),// 점심 시작 시간
        excludeWeekends: z.boolean().default(false), // 주말 제외 여부
      }))
      .mutation(async ({ ctx, input }) => {
        const { weekStartDate, workStartHour, workEndHour, breakMinutes, breakStartHour, excludeWeekends } = input;
        const startDate = new Date(weekStartDate);
        const endDate = new Date(weekStartDate);
        endDate.setDate(endDate.getDate() + 6);
        const endDateStr = endDate.toISOString().split("T")[0];

        // 이번 주 기존 블럭 조회
        const existingBlocks = await db.getScheduleBlocks(ctx.user.id, weekStartDate, endDateStr);

        // 이번 주 미완료 TODO 조회 (estimatedMinutes > 0, pending/in_progress)
        const pendingTodos = await db.getTodosForAutoSchedule(ctx.user.id);

        // 날짜별 빈 슬롯 계산
        const placed: Array<{ todoId: number; title: string; date: string; startTime: string; endTime: string }> = [];

        function timeToMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
        function minToTime(m: number) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + dayOffset);
          const dayOfWeek = date.getDay(); // 0=일, 6=토
          if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

          const dateStr = date.toISOString().split("T")[0];
          const dayBlocks = (existingBlocks as any[]).filter((b: any) => {
            const bd = new Date(b.date).toISOString().split("T")[0];
            return bd === dateStr;
          });

          // 이미 배치된 블럭을 시간 범위로 변환
          const busySlots = dayBlocks.map((b: any) => ({
            start: timeToMin(b.startTime),
            end: timeToMin(b.endTime),
          })).sort((a, b) => a.start - b.start);

          // 점심 시간 추가
          busySlots.push({ start: breakStartHour * 60, end: breakStartHour * 60 + breakMinutes });
          busySlots.sort((a, b) => a.start - b.start);

          // 빈 슬롯 계산
          const freeSlots: Array<{ start: number; end: number }> = [];
          let cursor = workStartHour * 60;
          for (const busy of busySlots) {
            if (busy.start > cursor) freeSlots.push({ start: cursor, end: busy.start });
            cursor = Math.max(cursor, busy.end);
          }
          if (cursor < workEndHour * 60) freeSlots.push({ start: cursor, end: workEndHour * 60 });

          // 우선순위 순으로 TODO 배치
          for (const slot of freeSlots) {
            let slotCursor = slot.start;
            while (slotCursor < slot.end && pendingTodos.length > 0) {
              const todo = pendingTodos[0];
              const needed = todo.remainingMinutes ?? todo.estimatedMinutes ?? 60;
              const available = slot.end - slotCursor;
              if (available < 15) break; // 15분 미만 슬롯은 스킵
              const blockDuration = Math.min(needed, available, 120); // 최대 2시간 블럭
              const startTime = minToTime(slotCursor);
              const endTime = minToTime(slotCursor + blockDuration);
              placed.push({ todoId: todo.id, title: todo.title, date: dateStr, startTime, endTime });
              await db.createScheduleBlock({
                userId: ctx.user.id,
                title: todo.title,
                blockType: "todo",
                todoId: todo.id,
                date: dateStr as any,
                startTime,
                endTime,
                durationMinutes: blockDuration,
              });
              slotCursor += blockDuration;
              // 해당 TODO의 남은 시간 감소
              todo.remainingMinutes = (todo.remainingMinutes ?? todo.estimatedMinutes ?? 60) - blockDuration;
              if (todo.remainingMinutes <= 0) pendingTodos.shift();
            }
          }
        }

        return { placed: placed.length, todos: placed };
      }),
  }),
  // ─── Reports ───────────────────────────────────────────────────────────────
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
    notifications: protectedProcedure.query(() => adminProxy.fetchNotifications()),
    notificationCount: protectedProcedure.query(() => adminProxy.fetchNotificationCount()),
    emergencyNotice: protectedProcedure.query(() => adminProxy.fetchEmergencyNotice()),
    // 어드민 직접 링크 URL 반환
    links: protectedProcedure.query(() => adminProxy.ADMIN_LINKS),
    // 회원 UID 기반 상세 정보 조회
    memberByUid: protectedProcedure
      .input(z.object({ uid: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        const role = ctx.user.tempoRole ?? "trainer";
        // 트레이너는 본인 회원 UID만 조회 가능
        if (role === "trainer") {
          const myMembers = await db.getTrainerMembers(ctx.user.id);
          const allowed = myMembers.some(m => m.memberUid === input.uid);
          if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "본인 담당 회원만 조회할 수 있습니다." });
        }
        return adminProxy.fetchMemberByUid(input.uid);
      }),
    memberPtSchedule: protectedProcedure
      .input(z.object({ uid: z.string().min(1) }))
      .query(({ input }) => adminProxy.fetchMemberPtSchedule(input.uid)),
    memberLectureProgress: protectedProcedure
      .input(z.object({ uid: z.string().min(1) }))
      .query(({ input }) => adminProxy.fetchMemberLectureProgress(input.uid)),
    memberThumbnailMaster: protectedProcedure
      .input(z.object({ uid: z.string().min(1) }))
      .query(({ input }) => adminProxy.fetchMemberThumbnailMaster(input.uid)),
  }),
  // ─── 팀 관리 (부책임센터장 이상) ──────────────────────────────────────────
  team: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const role = ctx.user.tempoRole ?? "trainer";
      if (["owner", "center_manager"].includes(role)) {
        return db.getAllTeams();
      } else if (role === "sub_manager") {
        return db.getTeamsByManager(ctx.user.id);
      }
      return db.getTeamsByMember(ctx.user.id);
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
    // ─── 팀 스케줄 가시성 ─────────────────────────────────────────────────
    schedules: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const role = ctx.user.tempoRole ?? "trainer";
        // 팀 멤버십 확인
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
        // 팀 멤버 ID 조회
        const memberIds = await db.getTeamMemberIds(input.teamId);
        // 멤버 기본 정보
        const memberInfos = await db.getUserBasicInfo(memberIds);
        // 스케줄 블럭 조회
        const blocks = await db.getScheduleBlocksByUserIds(memberIds, input.startDate, input.endDate);
        // private 블럭은 본인 외 제목 숨김
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
  }),
  // ─── 트레이너 회원 관리 (UID 등록/조회) ────────────────────────────────────
  trainerMember: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const role = ctx.user.tempoRole ?? "trainer";
      if (["owner", "center_manager"].includes(role)) {
        return db.getAllTrainerMembers();
      } else if (role === "sub_manager") {
        // 팀 내 트레이너들의 회원만
        const teams = await db.getTeamsByManager(ctx.user.id);
        const teamIds = teams.map(t => t.id);
        return db.getTrainerMembersByTeams(teamIds);
      }
      return db.getTrainerMembers(ctx.user.id);
    }),
    add: protectedProcedure
      .input(z.object({
        memberUid: z.string().min(1),
        memberName: z.string().optional(),
        memberPhone: z.string().optional(),
        ptType: z.string().optional(),
        remainingSessions: z.number().optional(),
        memo: z.string().optional(),
      }))
      .mutation(({ input, ctx }) => db.addTrainerMember({ ...input, trainerId: ctx.user.id })),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        memberName: z.string().optional(),
        memberPhone: z.string().optional(),
        ptType: z.string().optional(),
        remainingSessions: z.number().optional(),
        memo: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(({ input }) => db.updateTrainerMember(input)),
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.removeTrainerMember(input.id)),
  }),
  // ─── 사용자 역할 관리 (책임센터장 전용) ────────────────────────────────────
  userManagement: router({
    list: centerManagerProcedure.query(() => db.getAllUsers()),
    setRole: centerManagerProcedure
      .input(z.object({
        userId: z.number(),
        tempoRole: z.enum(["owner", "center_manager", "sub_manager", "trainer", "viewer"]),
      }))
      .mutation(({ input }) => db.setUserTempoRole(input.userId, input.tempoRole)),
  }),
});

export type AppRouter = typeof appRouter;
