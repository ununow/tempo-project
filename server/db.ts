import { eq, and, gte, lte, desc, asc, isNull, or, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  organizations, todos, todoWeekSplits,
  scheduleBlocks, scheduleTemplates,
  dailyReports, weeklyReports,
  approvalRequests, memberInterviews,
  adminCache, adminSessions,
  teams, teamMembers, trainerMembers,
  favoriteBlocks,
  invitations, boards, posts, userFavorites, externalLinks,
} from "../drizzle/schema";
import type { Invitation } from "../drizzle/schema";
import crypto from "crypto";
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
    // 1순위: OWNER_OPEN_ID 일치 시 tempoRole=owner 자동 부여
    if (user.openId === ENV.ownerOpenId) {
      values.tempoRole = 'owner';
      values.role = 'admin';
      // onDuplicateKeyUpdate에서도 owner/admin 유지
      updateSet.tempoRole = 'owner';
      updateSet.role = 'admin';
    } else if (user.tempoRole !== undefined) {
      values.tempoRole = user.tempoRole;
      updateSet.tempoRole = user.tempoRole;
    } else {
      // 2순위: DB에 아무 사용자도 없으면 첫 번째 가입자를 owner로
      try {
        const existingCount = await db.select({ count: sql`COUNT(*)` }).from(users);
        const count = Number((existingCount[0] as any).count);
        if (count === 0) {
          values.tempoRole = 'owner';
          values.role = 'admin';
          updateSet.tempoRole = 'owner';
          updateSet.role = 'admin';
        }
      } catch {
        // count 실패 시 기본값(trainer) 유지
      }
    }
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

export async function updateMemberInterview(id: number, trainerId: number, data: Partial<typeof memberInterviews.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(memberInterviews).set({ ...data, updatedAt: new Date() }).where(and(eq(memberInterviews.id, id), eq(memberInterviews.trainerId, trainerId)));
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

export async function saveAdminSession(sessionToken: string, csrfToken: string, cookieJar?: string) {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일
  // clear old sessions
  await db.update(adminSessions).set({ isValid: false }).where(eq(adminSessions.isValid, true));
  await db.insert(adminSessions).values({
    sessionToken, csrfToken, isValid: true, lastLoginAt: new Date(), expiresAt,
    ...(cookieJar ? { cookieJar } : {}),
  });
}

export async function invalidateAdminSession() {
  const db = await getDb();
  if (!db) return;
  await db.update(adminSessions).set({ isValid: false }).where(eq(adminSessions.isValid, true));
}

// ─── 팀 관리 ──────────────────────────────────────────────────────────────────
export async function getAllTeams() {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(teams).where(eq(teams.isActive, true));
}

export async function getTeamsWithMembers(teamIds?: number[]) {
  const database = await getDb();
  if (!database) return [];
  const teamList = teamIds && teamIds.length > 0
    ? await database.select().from(teams).where(and(inArray(teams.id, teamIds), eq(teams.isActive, true)))
    : await database.select().from(teams).where(eq(teams.isActive, true));
  if (teamList.length === 0) return [];
  const allTeamIds = teamList.map(t => t.id);
  const memberships = await database
    .select({
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      userName: users.name,
      userRole: users.tempoRole,
      userEmail: users.email,
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .where(inArray(teamMembers.teamId, allTeamIds));
  return teamList.map(team => ({
    ...team,
    members: memberships.filter(m => m.teamId === team.id),
  }));
}

export async function getTeamsByManager(managerId: number) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(teams).where(
    and(eq(teams.managerId, managerId), eq(teams.isActive, true))
  );
}

export async function getTeamsByMember(userId: number) {
  const database = await getDb();
  if (!database) return [];
  const memberships = await database.select().from(teamMembers).where(eq(teamMembers.userId, userId));
  if (memberships.length === 0) return [];
  const teamIds = memberships.map(m => m.teamId);
  return database.select().from(teams).where(
    and(inArray(teams.id, teamIds), eq(teams.isActive, true))
  );
}

export async function createTeam(data: { name: string; managerId: number; color?: string; description?: string }) {
  const database = await getDb();
  if (!database) return null;
  const result = await database.insert(teams).values({ ...data, isActive: true });
  return result;
}

export async function updateTeam(data: { id: number; name?: string; color?: string; description?: string }) {
  const database = await getDb();
  if (!database) return null;
  const { id, ...rest } = data;
  return database.update(teams).set({ ...rest, updatedAt: new Date() }).where(eq(teams.id, id));
}

export async function deleteTeam(id: number) {
  const database = await getDb();
  if (!database) return null;
  return database.update(teams).set({ isActive: false, updatedAt: new Date() }).where(eq(teams.id, id));
}

export async function addTeamMember(teamId: number, userId: number) {
  const database = await getDb();
  if (!database) return null;
  return database.insert(teamMembers).values({ teamId, userId });
}

export async function removeTeamMember(teamId: number, userId: number) {
  const database = await getDb();
  if (!database) return null;
  return database.delete(teamMembers).where(
    and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
  );
}

// ─── 트레이너 회원 관리 ────────────────────────────────────────────────────────
export async function getAllTrainerMembers() {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(trainerMembers).where(eq(trainerMembers.isActive, true));
}

export async function getTrainerMembers(trainerId: number) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(trainerMembers).where(
    and(eq(trainerMembers.trainerId, trainerId), eq(trainerMembers.isActive, true))
  );
}

export async function getTrainerMembersByTeams(teamIds: number[]) {
  if (teamIds.length === 0) return [];
  const database = await getDb();
  if (!database) return [];
  // 팀 멤버(트레이너) 목록 조회
  const members = await database.select().from(teamMembers).where(inArray(teamMembers.teamId, teamIds));
  if (members.length === 0) return [];
  const trainerIds = Array.from(new Set(members.map(m => m.userId)));
  return database.select().from(trainerMembers).where(
    and(inArray(trainerMembers.trainerId, trainerIds), eq(trainerMembers.isActive, true))
  );
}

export async function addTrainerMember(data: {
  trainerId: number; memberUid: string; memberName?: string;
  memberPhone?: string; ptType?: string; remainingSessions?: number; memo?: string;
}) {
  const database = await getDb();
  if (!database) return null;
  return database.insert(trainerMembers).values({ ...data, isActive: true });
}

export async function updateTrainerMember(data: {
  id: number; memberName?: string; memberPhone?: string; ptType?: string;
  remainingSessions?: number; memo?: string; isActive?: boolean;
}) {
  const database = await getDb();
  if (!database) return null;
  const { id, ...rest } = data;
  return database.update(trainerMembers).set({ ...rest, updatedAt: new Date() }).where(eq(trainerMembers.id, id));
}

export async function removeTrainerMember(id: number) {
  const database = await getDb();
  if (!database) return null;
  return database.update(trainerMembers).set({ isActive: false, updatedAt: new Date() }).where(eq(trainerMembers.id, id));
}

// ─── 사용자 역할 관리 ──────────────────────────────────────────────────────────
export async function getAllUsers() {
  const database = await getDb();
  if (!database) return [];
  return database.select({
    id: users.id,
    name: users.name,
    email: users.email,
    tempoRole: users.tempoRole,
    createdAt: users.createdAt,
  }).from(users);
}

export async function setUserTempoRole(userId: number, tempoRole: string) {
  const database = await getDb();
  if (!database) return null;
  return database.update(users).set({ tempoRole: tempoRole as any, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ─── 자동 스케줄링용 TODO 조회 ─────────────────────────────────────────────────
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
    // 우선순위: urgent > high > medium > low
    sql`FIELD(${todos.priority}, 'urgent', 'high', 'medium', 'low')`,
    asc(todos.createdAt)
  );
  // 각 TODO에 remainingMinutes 필드 추가 (actualMinutes 차감)
  return rows.map(t => ({
    ...t,
    remainingMinutes: Math.max(0, (t.estimatedMinutes ?? 60) - (t.actualMinutes ?? 0)),
  }));
}

// ─── 팀 스케줄 가시성 ─────────────────────────────────────────────────────────
export async function getTeamMemberIds(teamId: number) {
  const database = await getDb();
  if (!database) return [];
  const members = await database.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  return members.map(m => m.userId);
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
    // private 블럭은 제목 숨김 처리 (서버에서)
  }).from(scheduleBlocks).where(
    and(
      inArray(scheduleBlocks.userId, userIds),
      gte(scheduleBlocks.date, start as any),
      lte(scheduleBlocks.date, end as any)
    )
  ).orderBy(asc(scheduleBlocks.date), asc(scheduleBlocks.startTime));
}

export async function getUserBasicInfo(userIds: number[]) {
  if (userIds.length === 0) return [];
  const database = await getDb();
  if (!database) return [];
  return database.select({
    id: users.id,
    name: users.name,
    tempoRole: users.tempoRole,
  }).from(users).where(inArray(users.id, userIds));
}

// ─── 즐겨찾기 블럭 ────────────────────────────────────────────────────────────
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

// ─── Invitations ──────────────────────────────────────────────────────────────────────────────────
export async function getInvitations(invitedBy: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(invitations).where(eq(invitations.invitedBy, invitedBy)).orderBy(desc(invitations.createdAt));
}

export async function createInvitation(input: {
  invitedBy: number; tempoRole: Invitation["tempoRole"]; email?: string; teamId?: number; expiresInDays: number;
}) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86400000);
  await db.insert(invitations).values({ token, invitedBy: input.invitedBy, tempoRole: input.tempoRole, email: input.email ?? null, teamId: input.teamId ?? null, expiresAt });
  return { token, expiresAt };
}

export async function useInvitation(token: string, userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [inv] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
  if (!inv) throw new Error("초대 링크가 유효하지 않습니다.");
  if (inv.usedBy) throw new Error("이미 사용된 초대 링크입니다.");
  if (new Date() > inv.expiresAt) throw new Error("만료된 초대 링크입니다.");
  await db.update(invitations).set({ usedBy: userId, usedAt: new Date() }).where(eq(invitations.token, token));
  await db.update(users).set({ tempoRole: inv.tempoRole, ...(inv.teamId ? { teamId: inv.teamId } : {}) }).where(eq(users.id, userId));
  return { tempoRole: inv.tempoRole };
}

export async function deleteInvitation(id: number, invitedBy: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(invitations).where(and(eq(invitations.id, id), eq(invitations.invitedBy, invitedBy)));
}

// ─── Boards ───────────────────────────────────────────────────────────────────
export async function getBoards() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(boards).where(eq(boards.isActive, true)).orderBy(boards.sortOrder, boards.createdAt);
}

export async function createBoard(input: { name: string; description?: string; icon?: string; createdBy: number }) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(boards).values({ name: input.name, description: input.description ?? null, icon: input.icon ?? "MessageSquare", createdBy: input.createdBy });
  return { id: (result as any).insertId };
}

export async function deleteBoard(id: number) {
  const db = await getDb(); if (!db) return;
  await db.update(boards).set({ isActive: false }).where(eq(boards.id, id));
}

// ─── Posts ────────────────────────────────────────────────────────────────────
export async function getPosts(boardId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(posts).where(eq(posts.boardId, boardId)).orderBy(desc(posts.isPinned), desc(posts.createdAt));
}

export async function getPost(id: number) {
  const db = await getDb(); if (!db) return null;
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (post) await db.update(posts).set({ viewCount: post.viewCount + 1 }).where(eq(posts.id, id));
  return post ?? null;
}

export async function createPost(input: { boardId: number; authorId: number; title: string; content: string }) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(posts).values(input);
  return { id: (result as any).insertId };
}

export async function updatePost(id: number, authorId: number, input: { title?: string; content?: string }) {
  const db = await getDb(); if (!db) return;
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title) set.title = input.title;
  if (input.content) set.content = input.content;
  await db.update(posts).set(set).where(and(eq(posts.id, id), eq(posts.authorId, authorId)));
}

export async function deletePost(id: number, authorId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(posts).where(and(eq(posts.id, id), eq(posts.authorId, authorId)));
}

export async function pinPost(id: number, isPinned: boolean) {
  const db = await getDb(); if (!db) return;
  await db.update(posts).set({ isPinned }).where(eq(posts.id, id));
}

// ─── UserFavorites ────────────────────────────────────────────────────────────
export async function getUserFavorites(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userFavorites).where(eq(userFavorites.userId, userId)).orderBy(userFavorites.sortOrder, userFavorites.createdAt);
}

export async function addUserFavorite(input: { userId: number; href: string; label: string; icon?: string }) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  // 최대 5개 제한
  const existing = await db.select().from(userFavorites).where(eq(userFavorites.userId, input.userId));
  if (existing.length >= 5) throw new Error("즐겨찾기는 최대 5개까지 등록할 수 있습니다.");
  const [result] = await db.insert(userFavorites).values({ userId: input.userId, href: input.href, label: input.label, icon: input.icon ?? "Star" });
  return { id: (result as any).insertId };
}

export async function removeUserFavorite(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(userFavorites).where(and(eq(userFavorites.id, id), eq(userFavorites.userId, userId)));
}

// ─── ExternalLinks ────────────────────────────────────────────────────────────
export async function getExternalLinks(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(externalLinks).where(eq(externalLinks.userId, userId)).orderBy(externalLinks.sortOrder, externalLinks.createdAt);
}

export async function addExternalLink(input: { userId: number; title: string; url: string; icon?: string; category?: string }) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(externalLinks).values({ userId: input.userId, title: input.title, url: input.url, icon: input.icon ?? "Link", category: input.category ?? "custom" });
  return { id: (result as any).insertId };
}

export async function removeExternalLink(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(externalLinks).where(and(eq(externalLinks.id, id), eq(externalLinks.userId, userId)));
}

// ─── Profile (updateUserProfile은 상단에 이미 존재) ──────────────────────────────────────────────────────────────────────────────────────────────
// updateUserProfile 이미 정의됨 (line 79) - 중복 제거