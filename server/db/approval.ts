import { eq, and, desc } from "drizzle-orm";
import { approvalRequests, memberInterviews } from "../../drizzle/schema";
import { getDb } from "./connection";

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
