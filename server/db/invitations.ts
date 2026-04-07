import { eq, and, desc } from "drizzle-orm";
import { invitations, users } from "../../drizzle/schema";
import type { Invitation } from "../../drizzle/schema";
import { getDb } from "./connection";
import crypto from "crypto";

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
