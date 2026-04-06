# Tempo Phase 1 — 즉시 수정 가이드 (코드 검증 완료)

> **분석 기준**: tempo-fitness.zip 전체 코드베이스 직접 분석  
> **검증 결과**: 4건의 보고서에서 지적한 **모든 이슈 실재 확인**

---

## 수정 1: 어드민 로그인 권한 (5분)

**파일**: `server/routers.ts:579`  
**현재**: `protectedProcedure` — 트레이너도 어드민 세션 탈취 가능  
**수정**: `centerManagerProcedure`로 변경

```typescript
// ❌ 현재 (routers.ts:579)
login: protectedProcedure

// ✅ 수정
login: centerManagerProcedure
```

**추가**: IDOR 3건도 같이 수정 (routers.ts:603-611)

```typescript
// ❌ 현재 — memberPtSchedule, memberLectureProgress, memberThumbnailMaster에 권한 없음
memberPtSchedule: protectedProcedure
  .input(z.object({ uid: z.string().min(1) }))
  .query(({ input }) => adminProxy.fetchMemberPtSchedule(input.uid)),

// ✅ 수정 — memberByUid와 동일한 권한 체크 추가
memberPtSchedule: protectedProcedure
  .input(z.object({ uid: z.string().min(1) }))
  .query(async ({ input, ctx }) => {
    const role = ctx.user.tempoRole ?? "trainer";
    if (role === "trainer") {
      const myMembers = await db.getTrainerMembers(ctx.user.id);
      const allowed = myMembers.some(m => m.memberUid === input.uid);
      if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "본인 담당 회원만 조회할 수 있습니다." });
    }
    return adminProxy.fetchMemberPtSchedule(input.uid);
  }),
// memberLectureProgress, memberThumbnailMaster도 동일 패턴 적용
```

---

## 수정 2: ISO Week 계산 통일 (15분)

**파일**: `server/routers.ts:174-175`  
**현재**: 자체 수식 — 최대 52주 오차  
**수정**: date-fns getISOWeek 사용

```typescript
// ❌ 현재 (routers.ts:174-175)
const startOfYear = new Date(year, 0, 1);
const weekNum = Math.ceil(((targetD.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

// ✅ 수정
import { getISOWeek, getISOWeekYear } from "date-fns";
// ... carryOver 뮤테이션 내부:
const weekNum = getISOWeek(targetD);
const year = getISOWeekYear(targetD); // 기존 getFullYear() 대신
```

---

## 수정 3: carryOver N+1 쿼리 (10분)

**파일**: `server/routers.ts:178-179`  
**현재**: 루프 안에서 `db.getTodos()` 매번 호출  
**수정**: 루프 전 1회 조회

```typescript
// ❌ 현재 (routers.ts:177-181)
const created = [];
for (const todoId of todoIds) {
  const todos = await db.getTodos(ctx.user.id, {});  // ← N번 호출!
  const original = (todos as any[]).find((t: any) => t.id === todoId);

// ✅ 수정
const allTodos = await db.getTodos(ctx.user.id, {});  // ← 1번만 호출
const created = [];
for (const todoId of todoIds) {
  const original = (allTodos as any[]).find((t: any) => t.id === todoId);
```

---

## 수정 4: carryOver 트랜잭션 래핑 (30분)

**파일**: `server/routers.ts:182-200`  
**현재**: 원본 취소 + 신규 생성이 트랜잭션 없이 순차 실행  
**수정**: MySQL 트랜잭션으로 묶기

```typescript
// ✅ 수정 — db.ts에 트랜잭션 헬퍼 추가
export async function withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  const database = await getDb();
  if (!database) throw new Error("DB not available");
  return database.transaction(fn);
}

// ✅ 수정 — routers.ts carryOver 뮤테이션
.mutation(async ({ ctx, input }) => {
  const { todoIds, targetPeriodType, targetDate } = input;
  const now = new Date();
  const targetD = targetDate ? new Date(targetDate) : now;
  const weekNum = getISOWeek(targetD);
  const year = getISOWeekYear(targetD);
  const month = targetD.getMonth() + 1;

  const allTodos = await db.getTodos(ctx.user.id, {});

  return db.withTransaction(async (tx) => {
    const created = [];
    for (const todoId of todoIds) {
      const original = (allTodos as any[]).find((t: any) => t.id === todoId);
      if (!original) continue;
      // 원본 취소 (트랜잭션 내)
      await tx.update(todos).set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(todos.id, todoId), eq(todos.userId, ctx.user.id)));
      // 새 TODO 생성 (트랜잭션 내)
      const result = await tx.insert(todos).values({
        userId: ctx.user.id,
        title: original.title,
        description: original.description,
        periodType: targetPeriodType,
        year, month,
        week: targetPeriodType === "daily" || targetPeriodType === "weekly" ? weekNum : undefined,
        estimatedMinutes: Math.max(0, (original.estimatedMinutes ?? 0) - (original.actualMinutes ?? 0)),
        priority: original.priority,
        category: original.category,
        isCarriedOver: true,
        originalDate: original.startDate ?? (targetDate ? new Date(targetDate) as any : undefined),
      });
      created.push(result[0]);
    }
    return { carried: created.length };
  });
}),
```

---

## 수정 5: addActualMinutes 경쟁조건 (15분)

**파일**: `server/routers.ts:153-158`  
**현재**: read → calculate → write (동시 타이머 시 lost update)  
**수정**: SQL 원자적 업데이트

```typescript
// ❌ 현재 (routers.ts:153-158)
const todos = await db.getTodos(ctx.user.id, {});
const todo = (todos as any[]).find((t: any) => t.id === input.id);
if (!todo) throw new TRPCError({ code: "NOT_FOUND" });
const newActual = (todo.actualMinutes ?? 0) + input.minutes;
return db.updateTodo(input.id, ctx.user.id, { actualMinutes: newActual });

// ✅ 수정 — db.ts에 원자적 업데이트 함수 추가
export async function addActualMinutesAtomic(todoId: number, userId: number, minutes: number) {
  const database = await getDb();
  if (!database) throw new Error("DB not available");
  const result = await database.update(todos)
    .set({ actualMinutes: sql`COALESCE(${todos.actualMinutes}, 0) + ${minutes}`, updatedAt: new Date() })
    .where(and(eq(todos.id, todoId), eq(todos.userId, userId)));
  return result;
}

// ✅ 수정 — routers.ts
addActualMinutes: protectedProcedure
  .input(z.object({ id: z.number(), minutes: z.number().min(1) }))
  .mutation(({ ctx, input }) => db.addActualMinutesAtomic(input.id, ctx.user.id, input.minutes)),
```

---

## 수정 6: 권한 누락 4건 일괄 (30분)

### 6a. trainerMember.update/remove — trainerId 소유권 체크

```typescript
// ❌ 현재 (routers.ts:727)
update: protectedProcedure
  .input(z.object({ id: z.number(), ... }))
  .mutation(({ input }) => db.updateTrainerMember(input)),

// ✅ 수정
update: protectedProcedure
  .input(z.object({ id: z.number(), ... }))
  .mutation(async ({ input, ctx }) => {
    const role = ctx.user.tempoRole ?? "trainer";
    if (role === "trainer") {
      // 본인 소유 회원만 수정 가능
      const myMembers = await db.getTrainerMembers(ctx.user.id);
      if (!myMembers.some(m => m.id === input.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "본인 담당 회원만 수정할 수 있습니다." });
      }
    }
    return db.updateTrainerMember(input);
  }),
// remove도 동일 패턴 적용
```

### 6b. interview.update — trainerId 검증

```typescript
// ❌ 현재 (routers.ts:568) — 누구나 아무 면담 수정 가능
.mutation(({ input }) => {
  const { id, nextInterviewDate, ...rest } = input;
  return db.updateMemberInterview(id, { ... });
}),

// ✅ 수정 — db.ts에 소유권 체크 추가
export async function updateMemberInterview(id: number, trainerId: number, data: ...) {
  const database = await getDb();
  if (!database) throw new Error("DB not available");
  // trainerId가 일치하는 경우만 업데이트
  await database.update(memberInterviews)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(memberInterviews.id, id), eq(memberInterviews.trainerId, trainerId)));
}
```

### 6c. deleteScheduleTemplate — userId 검증

```typescript
// ❌ 현재 (routers.ts:295 + db.ts:221)
deleteTemplate: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(({ input }) => db.deleteScheduleTemplate(input.id)),

// db.ts:221 — userId 체크 없음
export async function deleteScheduleTemplate(id: number) {
  await db.delete(scheduleTemplates).where(eq(scheduleTemplates.id, id));
}

// ✅ 수정 — routers.ts
deleteTemplate: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(({ input, ctx }) => db.deleteScheduleTemplate(input.id, ctx.user.id)),

// ✅ 수정 — db.ts
export async function deleteScheduleTemplate(id: number, userId: number) {
  const database = await getDb();
  if (!database) throw new Error("DB not available");
  // userId가 null인 공용 템플릿은 관리자만 삭제 가능 (별도 체크 필요)
  // 개인 템플릿은 본인만 삭제
  await database.delete(scheduleTemplates)
    .where(and(eq(scheduleTemplates.id, id), eq(scheduleTemplates.userId, userId)));
  return { success: true };
}
```

---

## 수정 7: assignedTo 컬럼 + 팀 TODO 조회 (1시간)

### 7a. 스키마에 assignedTo 추가

```typescript
// drizzle/schema.ts — todos 테이블에 추가 (line 118 이후)
assignedBy: int("assignedBy"),
assignedTo: int("assignedTo"),           // ← 추가: 배정받은 사용자 ID
organizationId: int("organizationId"),
```

### 7b. 마이그레이션 SQL

```sql
ALTER TABLE todos ADD COLUMN assignedTo INT NULL AFTER assignedBy;
```

### 7c. getTodos 쿼리 수정

```typescript
// ❌ 현재 (db.ts:138)
const conditions = [eq(todos.userId, userId)];

// ✅ 수정 — 본인 TODO + 배정받은 TODO 모두 조회
const conditions = [
  or(
    eq(todos.userId, userId),
    eq(todos.assignedTo, userId)
  )
];
```

---

## 수정 8: 타임존 처리 통일 (1시간)

현재 서버에서 `new Date()`가 서버 타임존(UTC-4/5)을 따름.

**원칙**: 날짜는 클라이언트에서 YYYY-MM-DD 문자열로 전달, 서버는 이 문자열을 그대로 저장.

주요 수정 포인트:
- `routers.ts:169-170`: carryOver에서 `new Date()` → 클라이언트 전달 날짜 사용
- 프론트엔드에서 로컬 날짜를 `format(new Date(), 'yyyy-MM-dd')` 로 생성

---

## 배포 아키텍처 확정

코드 확인 결과 **MySQL(TiDB) + drizzle-orm/mysql-core** 사용 중.

```
확정 아키텍처:
┌──────────────────────────┐
│  Railway (Node.js)       │
│  ├─ React 프론트엔드      │
│  ├─ tRPC + Express 백엔드 │
│  └─ 어드민 프록시          │
└────────┬─────────────────┘
         │
    ┌────▼──────────┐    ┌──────────────┐
    │ TiDB Serverless│    │ admin.biz-pt │
    │ (MySQL 호환)    │    │ (HTML 파싱)   │
    └───────────────┘    └──────────────┘
```

**이유**: 
- 현재 코드가 mysql-core 기반이라 PostgreSQL 전환 시 스키마 전체 수정 필요
- TiDB Serverless는 MySQL 호환 + 서버리스 + 무료 티어 충분
- Railway는 Node.js 서버 직접 배포, 어드민 프록시 세션 유지에 제약 없음

---

## 수정 우선순위 (실행 순서)

| 순서 | 항목 | 소요 | 파일 |
|------|------|------|------|
| 1 | 어드민 로그인 권한 | 5분 | routers.ts:579 |
| 2 | IDOR 3건 권한 추가 | 15분 | routers.ts:603-611 |
| 3 | ISO Week 수정 | 15분 | routers.ts:174-175 |
| 4 | N+1 쿼리 수정 | 5분 | routers.ts:178-179 |
| 5 | addActualMinutes 원자화 | 15분 | routers.ts:153-158 + db.ts |
| 6 | carryOver 트랜잭션 | 30분 | routers.ts:167-202 + db.ts |
| 7 | 권한 누락 4건 | 30분 | routers.ts 여러 곳 |
| 8 | assignedTo 추가 | 1시간 | schema.ts + db.ts + migration |
| **합계** | | **~3시간** | |
