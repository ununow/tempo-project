import { z } from "zod";
import { router, protectedProcedure, TRPCError } from "./middleware";
import * as db from "../db";

export const scheduleRouter = router({
  blocks: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(({ ctx, input }) => db.getScheduleBlocks(ctx.user.id, input.startDate, input.endDate, ctx.user.organizationId ?? undefined)),

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
    .mutation(({ input, ctx }) => db.deleteScheduleTemplate(input.id, ctx.user.id)),

  favoriteBlocks: protectedProcedure.query(({ ctx }) => db.getFavoriteBlocks(ctx.user.id)),

  saveFavoriteBlock: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      blockType: z.enum(["todo", "free", "team_task", "private"]),
      durationMinutes: z.number().min(15).max(480),
      color: z.string().optional(),
      note: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => db.createFavoriteBlock({ ...input, userId: ctx.user.id })),

  deleteFavoriteBlock: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => db.deleteFavoriteBlock(input.id, ctx.user.id)),

  dropFavoriteBlock: protectedProcedure
    .input(z.object({
      favoriteId: z.number(),
      date: z.string(),
      startTime: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const fav = await db.getFavoriteBlockById(input.favoriteId, ctx.user.id);
      if (!fav) throw new TRPCError({ code: "NOT_FOUND" });
      const [h, m] = input.startTime.split(":").map(Number);
      const endMin = h * 60 + m + fav.durationMinutes;
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      return db.createScheduleBlock({
        userId: ctx.user.id,
        title: fav.title,
        blockType: fav.blockType as any,
        date: input.date as any,
        startTime: input.startTime,
        endTime,
        durationMinutes: fav.durationMinutes,
        color: fav.color ?? undefined,
        note: fav.note ?? undefined,
      });
    }),

  autoSchedule: protectedProcedure
    .input(z.object({
      weekStartDate: z.string(),
      workStartHour: z.number().default(9),
      workEndHour: z.number().default(21),
      breakMinutes: z.number().default(60),
      breakStartHour: z.number().default(12),
      excludeWeekends: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { weekStartDate, workStartHour, workEndHour, breakMinutes, breakStartHour, excludeWeekends } = input;
      const startDate = new Date(weekStartDate);
      const endDate = new Date(weekStartDate);
      endDate.setDate(endDate.getDate() + 6);
      const endDateStr = endDate.toISOString().split("T")[0];

      const existingBlocks = await db.getScheduleBlocks(ctx.user.id, weekStartDate, endDateStr);
      const pendingTodos = await db.getTodosForAutoSchedule(ctx.user.id);

      const placed: Array<{ todoId: number; title: string; date: string; startTime: string; endTime: string }> = [];

      function timeToMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
      function minToTime(m: number) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + dayOffset);
        const dayOfWeek = date.getDay();
        if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

        const dateStr = date.toISOString().split("T")[0];
        const dayBlocks = (existingBlocks as any[]).filter((b: any) => {
          const bd = new Date(b.date).toISOString().split("T")[0];
          return bd === dateStr;
        });

        const busySlots = dayBlocks.map((b: any) => ({
          start: timeToMin(b.startTime),
          end: timeToMin(b.endTime),
        })).sort((a, b) => a.start - b.start);

        busySlots.push({ start: breakStartHour * 60, end: breakStartHour * 60 + breakMinutes });
        busySlots.sort((a, b) => a.start - b.start);

        const freeSlots: Array<{ start: number; end: number }> = [];
        let cursor = workStartHour * 60;
        for (const busy of busySlots) {
          if (busy.start > cursor) freeSlots.push({ start: cursor, end: busy.start });
          cursor = Math.max(cursor, busy.end);
        }
        if (cursor < workEndHour * 60) freeSlots.push({ start: cursor, end: workEndHour * 60 });

        for (const slot of freeSlots) {
          let slotCursor = slot.start;
          while (slotCursor < slot.end && pendingTodos.length > 0) {
            const todo = pendingTodos[0];
            const needed = todo.remainingMinutes ?? todo.estimatedMinutes ?? 60;
            const available = slot.end - slotCursor;
            if (available < 15) break;
            const blockDuration = Math.min(needed, available, 120);
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
            todo.remainingMinutes = (todo.remainingMinutes ?? todo.estimatedMinutes ?? 60) - blockDuration;
            if (todo.remainingMinutes <= 0) pendingTodos.shift();
          }
        }
      }

      return { placed: placed.length, todos: placed };
    }),
});
