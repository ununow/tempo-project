import { eq, and, gte, lte, asc, isNull, or, inArray } from "drizzle-orm";
import { scheduleBlocks, scheduleTemplates, favoriteBlocks } from "../../drizzle/schema";
import { getDb, tenantFilter } from "./connection";

export async function getScheduleBlocks(userId: number, startDate: string, endDate: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [
    eq(scheduleBlocks.userId, userId),
    gte(scheduleBlocks.date, startDate as any),
    lte(scheduleBlocks.date, endDate as any),
  ];
  const tf = tenantFilter(scheduleBlocks, organizationId);
  if (tf) conditions.push(tf);
  return db.select().from(scheduleBlocks).where(and(...conditions))
    .orderBy(asc(scheduleBlocks.date), asc(scheduleBlocks.startTime));
}

export async function createScheduleBlock(data: typeof scheduleBlocks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(scheduleBlocks).values(data);
  return result[0];
}

export async function updateScheduleBlock(id: number, userId: number, data: Partial<typeof scheduleBlocks.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(scheduleBlocks).set({ ...data, updatedAt: new Date() }).where(and(eq(scheduleBlocks.id, id), eq(scheduleBlocks.userId, userId)));
}

export async function deleteScheduleBlock(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(scheduleBlocks).where(and(eq(scheduleBlocks.id, id), eq(scheduleBlocks.userId, userId)));
}

export async function getScheduleTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduleTemplates).where(
    and(eq(scheduleTemplates.isActive, true), or(eq(scheduleTemplates.userId, userId), isNull(scheduleTemplates.userId)))
  ).orderBy(asc(scheduleTemplates.dayOfWeek), asc(scheduleTemplates.startTime));
}

export async function deleteScheduleTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(scheduleTemplates).where(and(eq(scheduleTemplates.id, id), eq(scheduleTemplates.userId, userId)));
  return { success: true };
}

export async function createScheduleTemplate(data: typeof scheduleTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(scheduleTemplates).values(data);
  return result[0];
}

export async function getFavoriteBlocks(userId: number) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(favoriteBlocks).where(eq(favoriteBlocks.userId, userId));
}

export async function getFavoriteBlockById(id: number, userId: number) {
  const database = await getDb();
  if (!database) return null;
  const rows = await database.select().from(favoriteBlocks)
    .where(and(eq(favoriteBlocks.id, id), eq(favoriteBlocks.userId, userId)));
  return rows[0] ?? null;
}

export async function createFavoriteBlock(data: {
  userId: number;
  title: string;
  blockType: "todo" | "free" | "team_task" | "private";
  durationMinutes: number;
  color?: string;
  note?: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("DB unavailable");
  await database.insert(favoriteBlocks).values(data);
}

export async function deleteFavoriteBlock(id: number, userId: number) {
  const database = await getDb();
  if (!database) throw new Error("DB unavailable");
  await database.delete(favoriteBlocks).where(and(eq(favoriteBlocks.id, id), eq(favoriteBlocks.userId, userId)));
}

export async function getScheduleBlocksByUserIds(
  userIds: number[],
  startDate: string,
  endDate: string
) {
  if (userIds.length === 0) return [];
  const database = await getDb();
  if (!database) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  return database.select({
    id: scheduleBlocks.id,
    userId: scheduleBlocks.userId,
    title: scheduleBlocks.title,
    blockType: scheduleBlocks.blockType,
    date: scheduleBlocks.date,
    startTime: scheduleBlocks.startTime,
    endTime: scheduleBlocks.endTime,
    durationMinutes: scheduleBlocks.durationMinutes,
    color: scheduleBlocks.color,
    isCompleted: scheduleBlocks.isCompleted,
  }).from(scheduleBlocks).where(
    and(
      inArray(scheduleBlocks.userId, userIds),
      gte(scheduleBlocks.date, start as any),
      lte(scheduleBlocks.date, end as any)
    )
  ).orderBy(asc(scheduleBlocks.date), asc(scheduleBlocks.startTime));
}
