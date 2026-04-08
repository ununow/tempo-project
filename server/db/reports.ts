import { eq, and, gte, lte, desc } from "drizzle-orm";
import { dailyReports, weeklyReports } from "../../drizzle/schema";
import { getDb, tenantFilter } from "./connection";

export async function getDailyReport(userId: number, reportDate: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [eq(dailyReports.userId, userId), eq(dailyReports.reportDate, reportDate as any)];
  const tf = tenantFilter(dailyReports, organizationId);
  if (tf) conditions.push(tf);
  const result = await db.select().from(dailyReports).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertDailyReport(data: typeof dailyReports.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(dailyReports).values(data).onDuplicateKeyUpdate({
    set: { ...data, updatedAt: new Date() }
  });
}

export async function getDailyReports(userId: number, startDate: string, endDate: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [
    eq(dailyReports.userId, userId),
    gte(dailyReports.reportDate, startDate as any),
    lte(dailyReports.reportDate, endDate as any),
  ];
  const tf = tenantFilter(dailyReports, organizationId);
  if (tf) conditions.push(tf);
  return db.select().from(dailyReports).where(and(...conditions)).orderBy(desc(dailyReports.reportDate));
}

export async function getWeeklyReport(userId: number, year: number, week: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [eq(weeklyReports.userId, userId), eq(weeklyReports.year, year), eq(weeklyReports.week, week)];
  const tf = tenantFilter(weeklyReports, organizationId);
  if (tf) conditions.push(tf);
  const result = await db.select().from(weeklyReports).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertWeeklyReport(data: typeof weeklyReports.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(weeklyReports).values(data).onDuplicateKeyUpdate({
    set: { ...data, updatedAt: new Date() }
  });
}
