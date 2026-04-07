# Tempo 스키마 마이그레이션 계획

> Claude Code 실행용 — 이 문서대로 순서대로 실행할 것
> DB: MySQL (TiDB) + Drizzle ORM (mysql-core)

---

## 변경 요약

| # | 테이블 | 컬럼 | 타입 | 목적 |
|---|--------|------|------|------|
| 1 | todos | `assignedTo` | INT NULL | 팀 TODO 배정 대상 |
| 2 | todos | `carryOverReason` | VARCHAR(50) NULL | 이월 사유 (자기객관화) |
| 3 | organizations | `tenantCode` | VARCHAR(20) UNIQUE | SaaS 멀티테넌시 식별자 |
| 4 | users | `onboardingDone` | BOOLEAN DEFAULT false | localStorage → DB 전환 |

---

## 1. 마이그레이션 SQL

파일명: `drizzle/0005_tempo_mvp_schema.sql`

```sql
-- 1. todos에 assignedTo 추가 (팀 배정 대상)
ALTER TABLE `todos` ADD COLUMN `assignedTo` int NULL AFTER `assignedBy`;
--> statement-breakpoint

-- 2. todos에 carryOverReason 추가 (이월 사유)
ALTER TABLE `todos` ADD COLUMN `carryOverReason` varchar(50) NULL AFTER `isCarriedOver`;
--> statement-breakpoint

-- 3. organizations에 tenantCode 추가 (SaaS 식별자)
ALTER TABLE `organizations` ADD COLUMN `tenantCode` varchar(20) NULL AFTER `name`;
--> statement-breakpoint
ALTER TABLE `organizations` ADD UNIQUE INDEX `organizations_tenantCode_unique` (`tenantCode`);
--> statement-breakpoint

-- 4. users에 onboardingDone 추가 (localStorage 대체)
ALTER TABLE `users` ADD COLUMN `onboardingDone` boolean NOT NULL DEFAULT false AFTER `isActive`;
```

---

## 2. Drizzle 스키마 변경

### 2.1 drizzle/schema.ts — todos 테이블 (L117-120 사이에 추가)

```typescript
// 현재 (L116-120):
  category: varchar("category", { length: 50 }),
  // 조직 배정 (관리자가 팀원에게 배정)
  assignedBy: int("assignedBy"),
  organizationId: int("organizationId"),
  isTeamTask: boolean("isTeamTask").default(false).notNull(),

// 변경 후:
  category: varchar("category", { length: 50 }),
  // 조직 배정 (관리자가 팀원에게 배정)
  assignedBy: int("assignedBy"),
  assignedTo: int("assignedTo"),           // ← 추가: 배정받은 사용자 ID
  organizationId: int("organizationId"),
  isTeamTask: boolean("isTeamTask").default(false).notNull(),
```

### 2.2 drizzle/schema.ts — todos 테이블 (L125-126 사이에 추가)

```typescript
// 현재 (L125-126):
  isCarriedOver: boolean("isCarriedOver").default(false).notNull(),
  originalDate: date("originalDate"),

// 변경 후:
  isCarriedOver: boolean("isCarriedOver").default(false).notNull(),
  carryOverReason: varchar("carryOverReason", { length: 50 }),  // ← 추가
  originalDate: date("originalDate"),
```

### 2.3 drizzle/schema.ts — organizations 테이블 (L45 이후에 추가)

```typescript
// 현재 (L45):
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["company", "center", "team", "tf"]).notNull(),

// 변경 후:
  name: varchar("name", { length: 100 }).notNull(),
  tenantCode: varchar("tenantCode", { length: 20 }).unique(),  // ← 추가
  type: mysqlEnum("type", ["company", "center", "team", "tf"]).notNull(),
```

### 2.4 drizzle/schema.ts — users 테이블 (L36 이후에 추가)

```typescript
// 현재 (L36):
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),

// 변경 후:
  isActive: boolean("isActive").default(true).notNull(),
  onboardingDone: boolean("onboardingDone").default(false).notNull(),  // ← 추가
  createdAt: timestamp("createdAt").defaultNow().notNull(),
```

---

## 3. 쿼리 변경 (db.ts)

### 3.1 getTodos — assignedTo 조건 추가

```typescript
// 현재 (db.ts L138):
const conditions = [eq(todos.userId, userId)];

// 변경 후:
const conditions = [
  or(
    eq(todos.userId, userId),
    eq(todos.assignedTo, userId)
  )
];
```

### 3.2 carryOver 뮤테이션 — carryOverReason 저장

```typescript
// routers.ts carryOver input에 추가:
.input(z.object({
  todoIds: z.array(z.number()),
  targetPeriodType: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  targetDate: z.string().optional(),
  carryOverReason: z.enum([
    "other_urgent",      // 타업무 긴급
    "underestimated",    // 예상시간 부족
    "condition",         // 컨디션 난조
    "external",          // 외부 요인
    "postponed",         // 단순 미룸
  ]).optional(),
}))

// createTodo 호출 시 추가:
const newTodo = await db.createTodo({
  // ... 기존 필드들
  carryOverReason: input.carryOverReason,  // ← 추가
});
```

### 3.3 onboardingDone — DB 기반 조회/업데이트

```typescript
// db.ts에 추가:
export async function setOnboardingDone(userId: number) {
  const database = await getDb();
  if (!database) return;
  await database.update(users)
    .set({ onboardingDone: true })
    .where(eq(users.id, userId));
}

// routers.ts auth 섹션에 추가:
setOnboardingDone: protectedProcedure
  .mutation(async ({ ctx }) => {
    await db.setOnboardingDone(ctx.user.id);
    return { success: true };
  }),
```

### 3.4 프론트엔드 — localStorage 제거

```typescript
// App.tsx에서 변경:
// 현재 (L54-57):
const [dismissed, setDismissed] = useState(() => {
  return localStorage.getItem("tempo_onboarding_dismissed") === "1";
});
const [ownerSetupDone, setOwnerSetupDone] = useState(() => {
  return localStorage.getItem("tempo_owner_setup_done") === "1";
});

// 변경 후:
// tRPC로 user.onboardingDone 조회
const { data: me } = trpc.auth.me.useQuery();
const [dismissed, setDismissed] = useState(false);
useEffect(() => {
  if (me?.onboardingDone) setDismissed(true);
}, [me]);

// 온보딩 완료 버튼:
// localStorage.setItem(...) 대신
trpc.auth.setOnboardingDone.useMutation();
```

---

## 4. 이월 사유 선택지 (한국어)

프론트엔드 UI에서 사용할 선택지:

| 코드 | 한국어 | 설명 |
|------|--------|------|
| `other_urgent` | 타 업무 긴급 | 다른 긴급 업무가 발생해서 |
| `underestimated` | 예상시간 부족 | 생각보다 오래 걸려서 |
| `condition` | 컨디션 난조 | 체력/컨디션 문제 |
| `external` | 외부 요인 | 회의, 교육 등 외부 일정 |
| `postponed` | 단순 미룸 | 특별한 사유 없음 |

→ 주간 성찰 리포트에서 "이번 주 이월 사유 분포" 차트로 시각화 가능

---

## 5. 실행 순서 (Claude Code에서)

```
1단계: drizzle/schema.ts에 4개 컬럼 추가 (위 코드 그대로)
2단계: npx drizzle-kit generate 실행 → 마이그레이션 파일 자동 생성 확인
3단계: npx drizzle-kit push 또는 마이그레이션 적용
4단계: db.ts의 getTodos 쿼리 수정 (assignedTo 조건 추가)
5단계: routers.ts carryOver에 carryOverReason 입력/저장 추가
6단계: db.ts에 setOnboardingDone 함수 추가
7단계: routers.ts auth에 setOnboardingDone 뮤테이션 추가
8단계: npm test 실행
9단계: git commit -m "feat: add assignedTo, carryOverReason, tenantCode, onboardingDone"
```

## 6. 주의사항

- TiDB Serverless는 일부 ALTER TABLE 문법이 표준 MySQL과 다를 수 있음
  - UNIQUE INDEX 추가 시 `ADD UNIQUE INDEX` 사용 (TiDB 호환)
- 기존 데이터에 영향 없음 (모든 새 컬럼이 NULL 또는 DEFAULT 값)
- carryOverReason은 optional — 기존 이월된 TODO에는 null로 유지
- onboardingDone 전환 후 localStorage 코드는 삭제할 것
