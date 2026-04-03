import { eq, and, gte, lte, desc, asc, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  organizations, todos, todoWeekSplits,
  scheduleBlocks, scheduleTemplates,
  dailyReports, weeklyReports,
  approvalRequests, memberInterviews,
  adminCache, adminSessions,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(id: number, data: Partial<typeof users.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function getUsersByOrg(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(and(eq(users.organizationId, organizationId), eq(users.isActive, true)));
}

// ─── Organizations ────────────────────────────────────────────────────────────
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

// ─── TODOs ────────────────────────────────────────────────────────────────────
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

// ─── Schedule Blocks ──────────────────────────────────────────────────────────
export async function getScheduleBlocks(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduleBlocks).where(
    and(
      eq(scheduleBlocks.userId, userId),
      gte(scheduleBlocks.date, startDate as any),
      lte(scheduleBlocks.date, endDate as any)
    )
  ).orderBy(asc(scheduleBlocks.date), asc(scheduleBlocks.startTime));
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

// ─── Schedule Templates ───────────────────────────────────────────────────────
export async function getScheduleTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduleTemplates).where(
    and(eq(scheduleTemplates.isActive, true), or(eq(scheduleTemplates.userId, userId), isNull(scheduleTemplates.userId)))
  ).orderBy(asc(scheduleTemplates.dayOfWeek), asc(scheduleTemplates.startTime));
}

export async function deleteScheduleTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(scheduleTemplates).where(eq(scheduleTemplates.id, id));
  return { success: true };
}

export async function createScheduleTemplate(data: typeof scheduleTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(scheduleTemplates).values(data);
  return result[0];
}

// ─── Daily Reports ────────────────────────────────────────────────────────────
export async function getDailyReport(userId: number, reportDate: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dailyReports).where(
    and(eq(dailyReports.userId, userId), eq(dailyReports.reportDate, reportDate as any))
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertDailyReport(data: typeof dailyReports.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(dailyReports).values(data).onDuplicateKeyUpdate({
    set: { ...data, updatedAt: new Date() }
  });
}

export async function getDailyReports(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyReports).where(
    and(
      eq(dailyReports.userId, userId),
      gte(dailyReports.reportDate, startDate as any),
      lte(dailyReports.reportDate, endDate as any)
    )
  ).orderBy(desc(dailyReports.reportDate));
}

// ─── Weekly Reports ───────────────────────────────────────────────────────────
export async function getWeeklyReport(userId: number, year: number, week: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(weeklyReports).where(
    and(eq(weeklyReports.userId, userId), eq(weeklyReports.year, year), eq(weeklyReports.week, week))
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertWeeklyReport(data: typeof weeklyReports.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(weeklyReports).values(data).onDuplicateKeyUpdate({
    set: { ...data, updatedAt: new Date() }
  });
}

// ─── Approval Requests ────────────────────────────────────────────────────────
export async function getApprovalRequests(organizationId?: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (organizationId) conditions.push(eq(approvalRequests.organizationId, organizationId));
  if (status) conditions.push(eq(approvalRequests.status, status as any));
  return db.select().from(approvalRequests)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(approvalRequests.requestedAt));
}

export async function createApprovalRequest(data: typeof approvalRequests.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(approvalRequests).values(data);
  return result[0];
}

export async function updateApprovalRequest(id: number, data: Partial<typeof approvalRequests.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(approvalRequests).set({ ...data, updatedAt: new Date() }).where(eq(approvalRequests.id, id));
}

// ─── Member Interviews ────────────────────────────────────────────────────────
export async function getMemberInterviews(trainerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memberInterviews).where(eq(memberInterviews.trainerId, trainerId)).orderBy(desc(memberInterviews.interviewDate));
}

export async function createMemberInterview(data: typeof memberInterviews.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(memberInterviews).values(data);
  return result[0];
}

export async function updateMemberInterview(id: number, data: Partial<typeof memberInterviews.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(memberInterviews).set({ ...data, updatedAt: new Date() }).where(eq(memberInterviews.id, id));
}

// ─── Admin Cache ──────────────────────────────────────────────────────────────
export async function getAdminCache(cacheKey: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(adminCache).where(eq(adminCache.cacheKey, cacheKey)).limit(1);
  if (result.length === 0) return null;
  const item = result[0];
  if (new Date() > new Date(item.expiresAt)) return null; // expired
  return item.data;
}

export async function setAdminCache(cacheKey: string, data: unknown, ttlSeconds = 300) {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await db.insert(adminCache).values({ cacheKey, data: data as any, expiresAt }).onDuplicateKeyUpdate({
    set: { data: data as any, fetchedAt: new Date(), expiresAt }
  });
}

// ─── Admin Sessions ───────────────────────────────────────────────────────────
export async function getAdminSession() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(adminSessions).where(eq(adminSessions.isValid, true)).limit(1);
  if (result.length === 0) return null;
  const session = result[0];
  if (session.expiresAt && new Date() > new Date(session.expiresAt)) return null;
  return session;
}

export async function saveAdminSession(sessionToken: string, csrfToken: string) {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  // clear old sessions
  await db.update(adminSessions).set({ isValid: false }).where(eq(adminSessions.isValid, true));
  await db.insert(adminSessions).values({
    sessionToken, csrfToken, isValid: true, lastLoginAt: new Date(), expiresAt
  });
}

export async function invalidateAdminSession() {
  const db = await getDb();
  if (!db) return;
  await db.update(adminSessions).set({ isValid: false }).where(eq(adminSessions.isValid, true));
}
