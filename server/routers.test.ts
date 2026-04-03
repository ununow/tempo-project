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
