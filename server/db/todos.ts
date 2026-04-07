import { eq, and, asc, desc, or, sql } from "drizzle-orm";
import { todos, todoWeekSplits, organizations } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function getOrganizations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).where(eq(organizations.isActive, true)).orderBy(asc(organizations.type));
}

export async function createOrganization(data: typeof organizations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(organizations).values(data);
  return result[0];
}

export async function getTodos(userId: number, filters: {
  periodType?: string;
  year?: number;
  month?: number;
  week?: number;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(todos.userId, userId)];
  if (filters.periodType) conditions.push(eq(todos.periodType, filters.periodType as any));
  if (filters.year) conditions.push(eq(todos.year, filters.year));
  if (filters.month) conditions.push(eq(todos.month, filters.month));
  if (filters.week) conditions.push(eq(todos.week, filters.week));
  if (filters.status) conditions.push(eq(todos.status, filters.status as any));
  return db.select().from(todos).where(and(...conditions)).orderBy(asc(todos.priority), desc(todos.createdAt));
}

export async function createTodo(data: typeof todos.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(todos).values(data);
  return result[0];
}

export async function updateTodo(id: number, userId: number, data: Partial<typeof todos.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(todos).set({ ...data, updatedAt: new Date() }).where(and(eq(todos.id, id), eq(todos.userId, userId)));
}

export async function addActualMinutesAtomic(todoId: number, userId: number, minutes: number) {
  const database = await getDb();
  if (!database) throw new Error("DB not available");
  const result = await database.update(todos)
    .set({ actualMinutes: sql`COALESCE(${todos.actualMinutes}, 0) + ${minutes}`, updatedAt: new Date() })
    .where(and(eq(todos.id, todoId), eq(todos.userId, userId)));
  if (!result[0] || (result[0] as any).affectedRows === 0)
    throw new Error("TODO를 찾을 수 없습니다.");
  return result;
}

export async function carryOverTodos(
  userId: number,
  todoIds: number[],
  allTodos: any[],
  opts: {
    targetPeriodType: "daily" | "weekly" | "monthly";
    year: number; month: number; weekNum: number; targetDate?: string;
  }
) {
  const database = await getDb();
  if (!database) throw new Error("DB not available");
  return database.transaction(async (tx) => {
    const created = [];
    for (const todoId of todoIds) {
      const original = allTodos.find((t: any) => t.id === todoId);
      if (!original) continue;
      await tx.update(todos).set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(todos.id, todoId), eq(todos.userId, userId)));
      const newTodo = await tx.insert(todos).values({
        userId,
        title: original.title,
        description: original.description,
        periodType: opts.targetPeriodType,
        year: opts.year,
        month: opts.month,
        week: opts.targetPeriodType === "daily" || opts.targetPeriodType === "weekly" ? opts.weekNum : undefined,
        estimatedMinutes: Math.max(0, (original.estimatedMinutes ?? 0) - (original.actualMinutes ?? 0)),
        priority: original.priority,
        category: original.category,
        isCarriedOver: true,
        originalDate: original.startDate ?? (opts.targetDate ? new Date(opts.targetDate) as any : undefined),
      });
      created.push(newTodo);
    }
    return { carried: created.length };
  });
}

export async function deleteTodo(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId)));
}

export async function getTodoWeekSplits(todoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(todoWeekSplits).where(eq(todoWeekSplits.todoId, todoId));
}

export async function upsertTodoWeekSplit(data: typeof todoWeekSplits.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(todoWeekSplits).values(data).onDuplicateKeyUpdate({
    set: { plannedMinutes: data.plannedMinutes, actualMinutes: data.actualMinutes, updatedAt: new Date() }
  });
}

export async function getTodosForAutoSchedule(userId: number) {
  const database = await getDb();
  if (!database) return [];
  const rows = await database.select().from(todos).where(
    and(
      eq(todos.userId, userId),
      or(eq(todos.status, "pending"), eq(todos.status, "in_progress")),
      sql`${todos.estimatedMinutes} > 0`
    )
  ).orderBy(
    sql`FIELD(${todos.priority}, 'urgent', 'high', 'medium', 'low')`,
    asc(todos.createdAt)
  );
  return rows.map(t => ({
    ...t,
    remainingMinutes: Math.max(0, (t.estimatedMinutes ?? 60) - (t.actualMinutes ?? 0)),
  }));
}
