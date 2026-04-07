import { z } from "zod";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { router, protectedProcedure, managerProcedure } from "./middleware";
import * as db from "../db";

export const orgRouter = router({
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
});

export const todoRouter = router({
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

  addActualMinutes: protectedProcedure
    .input(z.object({
      id: z.number(),
      minutes: z.number().min(1),
    }))
    .mutation(({ ctx, input }) => db.addActualMinutesAtomic(input.id, ctx.user.id, input.minutes)),

  carryOver: protectedProcedure
    .input(z.object({
      todoIds: z.array(z.number()),
      targetPeriodType: z.enum(["daily", "weekly", "monthly"]).default("daily"),
      targetDate: z.string().optional(),
      carryOverReason: z.enum([
        "other_urgent",
        "underestimated",
        "condition",
        "external",
        "postponed",
      ]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { todoIds, targetPeriodType, targetDate, carryOverReason } = input;
      const now = new Date();
      const targetD = targetDate ? new Date(targetDate) : now;
      const month = targetD.getMonth() + 1;
      const weekNum = getISOWeek(targetD);
      const year = getISOWeekYear(targetD);

      const allTodos = await db.getTodos(ctx.user.id, {});
      return db.carryOverTodos(ctx.user.id, todoIds, allTodos as any[], {
        targetPeriodType, year, month, weekNum, targetDate, carryOverReason,
      });
    }),
});
