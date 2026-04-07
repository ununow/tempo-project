import { eq, and, inArray, sql } from "drizzle-orm";
import { InsertUser, users } from "../../drizzle/schema";
import { getDb } from "./connection";
import { ENV } from '../_core/env';

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
    if (user.openId === ENV.ownerOpenId) {
      values.tempoRole = 'owner';
      values.role = 'admin';
      updateSet.tempoRole = 'owner';
      updateSet.role = 'admin';
    } else if (user.tempoRole !== undefined) {
      values.tempoRole = user.tempoRole;
      updateSet.tempoRole = user.tempoRole;
    } else {
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

export async function setOnboardingDone(userId: number) {
  const database = await getDb();
  if (!database) return;
  await database.update(users).set({ onboardingDone: true }).where(eq(users.id, userId));
}

export async function setUserTempoRole(userId: number, tempoRole: string) {
  const database = await getDb();
  if (!database) return null;
  return database.update(users).set({ tempoRole: tempoRole as any, updatedAt: new Date() }).where(eq(users.id, userId));
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
