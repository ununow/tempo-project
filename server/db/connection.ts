import { drizzle } from "drizzle-orm/mysql2";
import { eq, SQL } from "drizzle-orm";

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

/** 모든 조회 쿼리에서 사용할 테넌트 필터. organizationId가 없으면 undefined 반환 */
export function tenantFilter(table: any, organizationId: number | undefined): SQL | undefined {
  if (!organizationId) return undefined;
  return eq(table.organizationId, organizationId);
}
