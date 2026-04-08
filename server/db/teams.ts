import { eq, and, inArray } from "drizzle-orm";
import { teams, teamMembers, trainerMembers, users } from "../../drizzle/schema";
import { getDb, tenantFilter } from "./connection";

export async function getAllTeams(organizationId?: number) {
  const database = await getDb();
  if (!database) return [];
  const conditions: any[] = [eq(teams.isActive, true)];
  const tf = tenantFilter(teams, organizationId);
  if (tf) conditions.push(tf);
  return database.select().from(teams).where(and(...conditions));
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

export async function getTeamMemberIds(teamId: number) {
  const database = await getDb();
  if (!database) return [];
  const members = await database.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  return members.map(m => m.userId);
}

export async function getAllTrainerMembers(organizationId?: number) {
  const database = await getDb();
  if (!database) return [];
  const conditions: any[] = [eq(trainerMembers.isActive, true)];
  const tf = tenantFilter(trainerMembers, organizationId);
  if (tf) conditions.push(tf);
  return database.select().from(trainerMembers).where(and(...conditions));
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
