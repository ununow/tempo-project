import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getUserById: vi.fn().mockResolvedValue({ id: 1, name: "Test User", tempoRole: "trainer" }),
  getTodos: vi.fn().mockResolvedValue([]),
  createTodo: vi.fn().mockResolvedValue({ id: 1, title: "Test Todo", status: "pending" }),
  updateTodo: vi.fn().mockResolvedValue({ id: 1, title: "Updated", status: "done" }),
  deleteTodo: vi.fn().mockResolvedValue({ success: true }),
  getTodoWeekSplits: vi.fn().mockResolvedValue([]),
  upsertTodoWeekSplit: vi.fn().mockResolvedValue({ id: 1 }),
  getScheduleBlocks: vi.fn().mockResolvedValue([]),
  createScheduleBlock: vi.fn().mockResolvedValue({ id: 1, title: "Block" }),
  updateScheduleBlock: vi.fn().mockResolvedValue({ id: 1 }),
  deleteScheduleBlock: vi.fn().mockResolvedValue({ success: true }),
  getScheduleTemplates: vi.fn().mockResolvedValue([]),
  createScheduleTemplate: vi.fn().mockResolvedValue({ id: 1 }),
  getDailyReport: vi.fn().mockResolvedValue(null),
  getDailyReports: vi.fn().mockResolvedValue([]),
  upsertDailyReport: vi.fn().mockResolvedValue({ id: 1 }),
  getWeeklyReport: vi.fn().mockResolvedValue(null),
  upsertWeeklyReport: vi.fn().mockResolvedValue({ id: 1 }),
  getApprovalRequests: vi.fn().mockResolvedValue([]),
  createApprovalRequest: vi.fn().mockResolvedValue({ id: 1 }),
  updateApprovalRequest: vi.fn().mockResolvedValue({ id: 1 }),
  getMemberInterviews: vi.fn().mockResolvedValue([]),
  createMemberInterview: vi.fn().mockResolvedValue({ id: 1 }),
  updateMemberInterview: vi.fn().mockResolvedValue({ id: 1 }),
  getOrganizations: vi.fn().mockResolvedValue([]),
  getUsersByOrg: vi.fn().mockResolvedValue([]),
  createOrganization: vi.fn().mockResolvedValue({ id: 1 }),
  updateUserProfile: vi.fn().mockResolvedValue({ success: true }),
  getAdminCache: vi.fn().mockResolvedValue(null),
  setAdminCache: vi.fn().mockResolvedValue(undefined),
  getAdminSession: vi.fn().mockResolvedValue(null),
  saveAdminSession: vi.fn().mockResolvedValue(undefined),
  // 새로 추가된 함수
  getTodosForAutoSchedule: vi.fn().mockResolvedValue([]),
  getTeamMemberIds: vi.fn().mockResolvedValue([1, 2]),
  getUserBasicInfo: vi.fn().mockResolvedValue([{ id: 1, name: "Alice", tempoRole: "trainer" }]),
  getScheduleBlocksByUserIds: vi.fn().mockResolvedValue([]),
  getAllTeams: vi.fn().mockResolvedValue([]),
  getTeamsByManager: vi.fn().mockResolvedValue([]),
  getTeamsByMember: vi.fn().mockResolvedValue([]),
  createTeam: vi.fn().mockResolvedValue({ id: 1 }),
  updateTeam: vi.fn().mockResolvedValue({ id: 1 }),
  deleteTeam: vi.fn().mockResolvedValue({ success: true }),
  addTeamMember: vi.fn().mockResolvedValue({ success: true }),
  removeTeamMember: vi.fn().mockResolvedValue({ success: true }),
  getAllTrainerMembers: vi.fn().mockResolvedValue([]),
  getTrainerMembers: vi.fn().mockResolvedValue([]),
  getTrainerMembersByTeams: vi.fn().mockResolvedValue([]),
  addTrainerMember: vi.fn().mockResolvedValue({ id: 1 }),
  updateTrainerMember: vi.fn().mockResolvedValue({ id: 1 }),
  removeTrainerMember: vi.fn().mockResolvedValue({ success: true }),
  invalidateAdminSession: vi.fn().mockResolvedValue(undefined),
  applyScheduleTemplate: vi.fn().mockResolvedValue({ created: 0 }),
  getScheduleTemplateBlocks: vi.fn().mockResolvedValue([]),
  createScheduleTemplateBlock: vi.fn().mockResolvedValue({ id: 1 }),
  deleteScheduleTemplateBlock: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("./adminProxy", () => ({
  loginToAdmin: vi.fn().mockResolvedValue({ success: true }),
  checkAdminSession: vi.fn().mockResolvedValue(false),
  fetchTrainers: vi.fn().mockResolvedValue([]),
  fetchTodayMemberStats: vi.fn().mockResolvedValue(null),
  fetchCancellationList: vi.fn().mockResolvedValue([]),
  fetchNewMemberList: vi.fn().mockResolvedValue([]),
  fetchRevenueData: vi.fn().mockResolvedValue(null),
  fetchTrainerSchedule: vi.fn().mockResolvedValue([]),
  fetchNotifications: vi.fn().mockResolvedValue([]),
}));

import * as db from "./db";

describe("DB mock sanity checks", () => {
  it("getTodos returns empty array", async () => {
    const result = await db.getTodos(1, {});
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("createTodo returns object with id", async () => {
    const result = await db.createTodo({
      userId: 1,
      title: "Test",
      periodType: "monthly",
    } as any);
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("title", "Test Todo");
  });

  it("getScheduleBlocks returns empty array", async () => {
    const result = await db.getScheduleBlocks(1, "2026-04-01", "2026-04-07");
    expect(Array.isArray(result)).toBe(true);
  });

  it("getDailyReport returns null when no report", async () => {
    const result = await db.getDailyReport(1, "2026-04-03");
    expect(result).toBeNull();
  });

  it("getApprovalRequests returns empty array", async () => {
    const result = await db.getApprovalRequests(undefined, undefined);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Admin proxy mock checks", () => {
  it("checkAdminSession returns false when not logged in", async () => {
    const { checkAdminSession } = await import("./adminProxy");
    const result = await checkAdminSession();
    expect(result).toBe(false);
  });

  it("fetchTrainers returns array", async () => {
    const { fetchTrainers } = await import("./adminProxy");
    const result = await fetchTrainers();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("New feature mock checks", () => {
  it("getTodosForAutoSchedule returns empty array by default", async () => {
    const result = await db.getTodosForAutoSchedule(1);
    expect(Array.isArray(result)).toBe(true);
  });

  it("getTeamMemberIds returns array of user ids", async () => {
    const result = await db.getTeamMemberIds(1);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain(1);
  });

  it("getUserBasicInfo returns member info array", async () => {
    const result = await db.getUserBasicInfo([1]);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("tempoRole");
  });

  it("getScheduleBlocksByUserIds returns empty array", async () => {
    const result = await db.getScheduleBlocksByUserIds([1, 2], "2026-04-01", "2026-04-07");
    expect(Array.isArray(result)).toBe(true);
  });
});
