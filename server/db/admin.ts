import { eq } from "drizzle-orm";
import { adminCache, adminSessions } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function getAdminCache(cacheKey: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(adminCache).where(eq(adminCache.cacheKey, cacheKey)).limit(1);
  if (result.length === 0) return null;
  const item = result[0];
  if (new Date() > new Date(item.expiresAt)) return null;
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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
