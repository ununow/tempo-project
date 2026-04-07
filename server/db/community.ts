import { eq, and, desc } from "drizzle-orm";
import { boards, posts, userFavorites, externalLinks } from "../../drizzle/schema";
import { getDb } from "./connection";

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

export async function getUserFavorites(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userFavorites).where(eq(userFavorites.userId, userId)).orderBy(userFavorites.sortOrder, userFavorites.createdAt);
}

export async function addUserFavorite(input: { userId: number; href: string; label: string; icon?: string }) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await db.select().from(userFavorites).where(eq(userFavorites.userId, input.userId));
  if (existing.length >= 5) throw new Error("즐겨찾기는 최대 5개까지 등록할 수 있습니다.");
  const [result] = await db.insert(userFavorites).values({ userId: input.userId, href: input.href, label: input.label, icon: input.icon ?? "Star" });
  return { id: (result as any).insertId };
}

export async function removeUserFavorite(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(userFavorites).where(and(eq(userFavorites.id, id), eq(userFavorites.userId, userId)));
}

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
