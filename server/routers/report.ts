import { z } from "zod";
import { router, protectedProcedure } from "./middleware";
import * as db from "../db";

export const reportRouter = router({
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
});
