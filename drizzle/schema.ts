import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  float,
  json,
  date,
  tinyint,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Tempo-specific fields
  tempoRole: mysqlEnum("tempoRole", [
    "owner",           // 대표/회사 오너
    "center_manager",  // 책임센터장
    "sub_manager",     // 부책임센터장
    "trainer",         // 트레이너
    "viewer",          // 열람 전용
  ]).default("trainer").notNull(),
  organizationId: int("organizationId"),  // 소속 센터 ID
  teamId: int("teamId"),                  // 소속 팀 ID
  bizPtTrainerId: varchar("bizPtTrainerId", { length: 64 }), // 어드민 트레이너 ID
  phone: varchar("phone", { length: 20 }),
  avatarUrl: text("avatarUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// ─── Organizations (회사 > 센터 > 팀) ─────────────────────────────────────────
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["company", "center", "team", "tf"]).notNull(),
  parentId: int("parentId"),  // 상위 조직 ID
  managerId: int("managerId"), // 담당자 user ID
  description: text("description"),
  color: varchar("color", { length: 20 }), // 팀 색상 (UI용)
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Teams (Tempo 자체 팀 설정 - 부책임센터장이 구성) ─────────────────────────
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  managerId: int("managerId").notNull(),   // 부책임센터장 user ID
  organizationId: int("organizationId"),   // 소속 센터 ID
  color: varchar("color", { length: 20 }),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Team Members (팀 소속 트레이너) ─────────────────────────────────────────
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  userId: int("userId").notNull(),   // 트레이너 user ID
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

// ─── Trainer Members (트레이너-회원 UID 매핑) ─────────────────────────────────
// 트레이너가 담당하는 회원의 어드민 UID를 Tempo에 등록
export const trainerMembers = mysqlTable("trainer_members", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(),       // Tempo user ID (트레이너)
  memberUid: varchar("memberUid", { length: 64 }).notNull(), // 어드민 회원 UID
  memberName: varchar("memberName", { length: 100 }), // 캐시된 이름
  memberPhone: varchar("memberPhone", { length: 20 }), // 캐시된 전화번호
  ptType: varchar("ptType", { length: 50 }),   // PT 유형 (캐시)
  remainingSessions: int("remainingSessions"), // 잔여 횟수 (캐시)
  lastSyncAt: timestamp("lastSyncAt"),         // 마지막 어드민 동기화 시각
  memo: text("memo"),                          // 트레이너 메모
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── TODOs ────────────────────────────────────────────────────────────────────
export const todos = mysqlTable("todos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  periodType: mysqlEnum("periodType", [
    "annual", "half_year", "quarter", "monthly", "weekly", "daily", "custom"
  ]).notNull().default("monthly"),
  // 기간 범위
  startDate: date("startDate"),
  endDate: date("endDate"),
  // 연도/월/주 (빠른 조회용)
  year: int("year"),
  month: int("month"),    // 1-12
  week: int("week"),      // ISO week number
  // 시간 관리
  estimatedMinutes: int("estimatedMinutes").default(0),
  actualMinutes: int("actualMinutes").default(0),
  // 상태
  status: mysqlEnum("status", ["pending", "in_progress", "done", "cancelled"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["urgent", "high", "medium", "low"]).default("medium").notNull(),
  category: varchar("category", { length: 50 }),
  // 조직 배정 (관리자가 팀원에게 배정)
  assignedBy: int("assignedBy"),
  organizationId: int("organizationId"), // 팀/센터 업무인 경우
  isTeamTask: boolean("isTeamTask").default(false).notNull(),
  // 상위 TODO (월간 → 주간 연결)
  parentTodoId: int("parentTodoId"),
  completionRate: float("completionRate").default(0),
  // 이월 관련
  isCarriedOver: boolean("isCarriedOver").default(false).notNull(),
  originalDate: date("originalDate"), // 원래 예정일 (이월된 경우)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── TODO 주단위 시간 분배 ────────────────────────────────────────────────────
export const todoWeekSplits = mysqlTable("todo_week_splits", {
  id: int("id").autoincrement().primaryKey(),
  todoId: int("todoId").notNull(),
  year: int("year").notNull(),
  week: int("week").notNull(),  // ISO week number
  plannedMinutes: int("plannedMinutes").default(0).notNull(),
  actualMinutes: int("actualMinutes").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Schedule Blocks (블럭형 스케줄러) ────────────────────────────────────────
export const scheduleBlocks = mysqlTable("schedule_blocks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  blockType: mysqlEnum("blockType", [
    "todo",       // TO-DO 연동 블럭
    "free",       // 자유 블럭
    "team_task",  // 팀/센터 배정 업무
    "template",   // 템플릿 블럭
    "private",    // 개인 일정 (내용 비공개)
  ]).default("free").notNull(),
  todoId: int("todoId"),          // 연동된 TODO ID
  date: date("date").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(), // "09:00"
  endTime: varchar("endTime", { length: 5 }).notNull(),     // "10:30"
  durationMinutes: int("durationMinutes").notNull(),
  color: varchar("color", { length: 20 }),
  note: text("note"),
  // 조직 배정
  assignedBy: int("assignedBy"),
  organizationId: int("organizationId"),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Schedule Templates (주별 기본 템플릿) ────────────────────────────────────
export const scheduleTemplates = mysqlTable("schedule_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),           // null이면 조직 공용 템플릿
  organizationId: int("organizationId"),
  name: varchar("name", { length: 100 }).notNull(),
  dayOfWeek: tinyint("dayOfWeek").notNull(), // 0=일, 1=월, ..., 6=토
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  blockType: mysqlEnum("blockType", ["todo", "free", "team_task", "private"]).default("free").notNull(),
  color: varchar("color", { length: 20 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Daily Reports (일일보고) ─────────────────────────────────────────────────
export const dailyReports = mysqlTable("daily_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId"),
  reportDate: date("reportDate").notNull(),
  // 섹션1: 실적 (어드민 연동 or 수동)
  totalMembers: int("totalMembers"),
  newMembers: int("newMembers").default(0),
  cancelledMembers: int("cancelledMembers").default(0),
  netChange: int("netChange").default(0),
  revenueTarget: float("revenueTarget"),
  revenueActual: float("revenueActual"),
  // 섹션2: 중요 안건
  importantMatters: json("importantMatters"), // [{title, content, priority}]
  // 섹션3: 스케줄 달성률
  scheduleAchievementRate: float("scheduleAchievementRate"),
  completedBlocks: int("completedBlocks").default(0),
  totalBlocks: int("totalBlocks").default(0),
  // 섹션4: 내일 중요 업무 (다음날 체크리스트로 이월)
  tomorrowTasks: json("tomorrowTasks"), // [{title, priority}]
  // 기타
  memo: text("memo"),
  status: mysqlEnum("status", ["draft", "submitted", "approved"]).default("draft").notNull(),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Weekly Reports (주간보고) ────────────────────────────────────────────────
export const weeklyReports = mysqlTable("weekly_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId"),
  year: int("year").notNull(),
  week: int("week").notNull(),
  weekStartDate: date("weekStartDate").notNull(),
  weekEndDate: date("weekEndDate").notNull(),
  // 주간 실적 요약
  totalMembers: int("totalMembers"),
  weeklyNewMembers: int("weeklyNewMembers").default(0),
  weeklyCancelledMembers: int("weeklyCancelledMembers").default(0),
  weeklyRevenue: float("weeklyRevenue"),
  revenueTarget: float("revenueTarget"),
  // TODO 달성률
  todoCompletionRate: float("todoCompletionRate"),
  completedTodos: int("completedTodos").default(0),
  totalTodos: int("totalTodos").default(0),
  // 주요 성과 및 이슈
  achievements: json("achievements"),
  issues: json("issues"),
  nextWeekPlan: json("nextWeekPlan"),
  memo: text("memo"),
  status: mysqlEnum("status", ["draft", "submitted", "approved"]).default("draft").notNull(),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Approval Requests (승인요청 로그) ────────────────────────────────────────
export const approvalRequests = mysqlTable("approval_requests", {
  id: int("id").autoincrement().primaryKey(),
  requesterId: int("requesterId").notNull(),
  approverId: int("approverId"),
  organizationId: int("organizationId"),
  type: mysqlEnum("type", ["cancel", "transfer", "exception", "other"]).notNull(),
  memberName: varchar("memberName", { length: 100 }),
  memberId: varchar("memberId", { length: 64 }),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approverComment: text("approverComment"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Member Interviews (면담기록) ─────────────────────────────────────────────
export const memberInterviews = mysqlTable("member_interviews", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(),
  memberName: varchar("memberName", { length: 100 }).notNull(),
  memberId: varchar("memberId", { length: 64 }),
  interviewDate: date("interviewDate").notNull(),
  interviewType: mysqlEnum("interviewType", ["regular", "complaint", "renewal", "cancellation", "other"]).default("regular").notNull(),
  content: text("content"),
  followUpActions: json("followUpActions"), // [{action, dueDate, status}]
  result: mysqlEnum("result", ["positive", "neutral", "negative", "pending"]).default("pending").notNull(),
  nextInterviewDate: date("nextInterviewDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Admin Cache (어드민 API 캐시) ────────────────────────────────────────────
export const adminCache = mysqlTable("admin_cache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 200 }).notNull().unique(),
  data: json("data").notNull(),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

// ─── Admin Sessions (어드민 로그인 세션) ──────────────────────────────────────
export const adminSessions = mysqlTable("admin_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: text("sessionToken"),   // next-auth.session-token 쿠키값
  csrfToken: text("csrfToken"),
  cookieJar: text("cookieJar"),         // 전체 쿠키 문자열 (JSON serialized)
  isValid: boolean("isValid").default(false).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type TrainerMember = typeof trainerMembers.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type TodoWeekSplit = typeof todoWeekSplits.$inferSelect;
export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect;
export type DailyReport = typeof dailyReports.$inferSelect;
export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type MemberInterview = typeof memberInterviews.$inferSelect;
export type AdminCache = typeof adminCache.$inferSelect;
