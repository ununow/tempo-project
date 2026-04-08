# Tempo Week 2 설계서

> Claude Code 실행용 — 이 문서대로 순서대로 실행할 것
> 코드베이스가 이미 파일 분리 완료 상태 (server/routers/*.ts, server/db/*.ts)

---

## 작업 목록 (총 9건)

| # | 항목 | 소요 | 난이도 |
|---|------|------|--------|
| 1 | organizationId 전체 쿼리 필터 | 2시간 | 중 |
| 2 | 어드민 세션 사용자별 분리 | 1시간 | 중 |
| 3 | cheerio DOM 파싱 전환 | 2시간 | 중 |
| 4 | Graceful Degradation | 1시간 | 쉬움 |
| 5 | 어드민 세션 만료 감지 + 재연동 | 1시간 | 쉬움 |
| 6 | 주간 성찰 기본 템플릿 | 2시간 | 중 |
| 7 | 게시판 allowedRoles/canWrite 활성화 | 30분 | 쉬움 |
| 8 | 타임존 처리 통일 | 1시간 | 쉬움 |
| 9 | 핵심 로직 단위 테스트 추가 | 1.5시간 | 쉬움 |

---

## 1. organizationId 전체 쿼리 필터 (withTenant 헬퍼)

### 문제
organizationId가 스키마에 있지만 쿼리에서 실제 필터로 사용하는 곳이 2곳뿐.
멀티 센터 시 데이터가 섞임.

### 수정

#### 1a. db/connection.ts에 withTenant 헬퍼 추가

```typescript
import { eq, and, SQL } from "drizzle-orm";

// 모든 조회 쿼리에서 사용할 테넌트 필터
export function tenantFilter(table: any, organizationId: number | undefined): SQL | undefined {
  if (!organizationId) return undefined;
  return eq(table.organizationId, organizationId);
}
```

#### 1b. 필터 적용이 필요한 함수 목록

다음 함수들에 organizationId 파라미터를 추가하고 조건에 포함:

| 함수 | 파일 | 현재 | 변경 |
|------|------|------|------|
| `getTodos` | db/todos.ts | userId만 필터 | + organizationId 조건 |
| `getScheduleBlocks` | db/schedule.ts | userId만 필터 | + organizationId 조건 |
| `getScheduleTemplates` | db/schedule.ts | userId만 필터 | + organizationId 조건 |
| `getDailyReport` | db/reports.ts | userId만 필터 | + organizationId 조건 |
| `getDailyReports` | db/reports.ts | userId만 필터 | + organizationId 조건 |
| `getWeeklyReport` | db/reports.ts | userId만 필터 | + organizationId 조건 |
| `getAllTeams` | db/teams.ts | 전체 조회 | + organizationId 조건 |
| `getAllTrainerMembers` | db/teams.ts | 전체 조회 | + organizationId 조건 |
| `getAllUsers` | db/users.ts | 전체 조회 | + organizationId 조건 |
| `getBoards` | db/community.ts | 전체 조회 | + organizationId 조건 (optional) |

#### 1c. router에서 ctx.user.organizationId 전달

모든 라우터에서 DB 조회 시 `ctx.user.organizationId`를 전달:

```typescript
// 예: routers/todo.ts
list: protectedProcedure
  .input(z.object({ ... }))
  .query(({ ctx, input }) => db.getTodos(ctx.user.id, {
    ...input,
    organizationId: ctx.user.organizationId ?? undefined,
  })),
```

#### 1d. 주의사항
- organizationId가 null인 사용자(아직 센터에 배정 안 된)는 필터 없이 본인 데이터만 보여야 함
- owner는 organizationId 필터 없이 전체 데이터 조회 가능해야 함
- 기존 테스트 12개가 깨지지 않아야 함

---

## 2. 어드민 세션 사용자별 분리

### 문제
현재 admin_sessions 테이블에 세션이 1개만 저장됨.
한 사용자가 로그인하면 다른 사용자의 세션을 덮어씀.

### 수정

#### 2a. admin_sessions 테이블에 userId 컬럼 추가

```typescript
// drizzle/schema.ts - adminSessions 테이블
export const adminSessions = mysqlTable("admin_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),  // ← 추가: 어떤 사용자의 세션인지
  sessionToken: text("sessionToken"),
  csrfToken: text("csrfToken"),
  cookieJar: text("cookieJar"),
  isValid: boolean("isValid").default(false).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

마이그레이션 SQL:
```sql
ALTER TABLE `admin_sessions` ADD COLUMN `userId` int NULL AFTER `id`;
```

#### 2b. db/admin.ts 수정

```typescript
// getAdminSession → userId 파라미터 추가
export async function getAdminSession(userId?: number) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [eq(adminSessions.isValid, true)];
  if (userId) conditions.push(eq(adminSessions.userId, userId));
  const result = await db.select().from(adminSessions).where(and(...conditions)).limit(1);
  if (result.length === 0) return null;
  const session = result[0];
  if (session.expiresAt && new Date() > new Date(session.expiresAt)) return null;
  return session;
}

// saveAdminSession → userId 파라미터 추가
export async function saveAdminSession(userId: number, sessionToken: string, csrfToken: string, cookieJar?: string) {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 해당 사용자의 기존 세션만 무효화 (다른 사용자 세션은 유지)
  await db.update(adminSessions).set({ isValid: false })
    .where(and(eq(adminSessions.isValid, true), eq(adminSessions.userId, userId)));
  await db.insert(adminSessions).values({
    userId, sessionToken, csrfToken, isValid: true, lastLoginAt: new Date(), expiresAt,
    ...(cookieJar ? { cookieJar } : {}),
  });
}
```

#### 2c. adminProxy.ts 수정

쿠키 로딩을 userId 기반으로 변경:

```typescript
// loadCookieJar → userId 파라미터 추가
async function loadCookieJar(userId?: number) {
  const session = await getAdminSession(userId);
  // ...
}
```

#### 2d. routers/admin.ts 수정

```typescript
login: centerManagerProcedure
  .input(z.object({ id: z.string(), password: z.string() }))
  .mutation(({ input, ctx }) => adminProxy.loginToAdmin(input.id, input.password, ctx.user.id)),
```

---

## 3. cheerio DOM 파싱 전환

### 문제
정규식 기반 HTML 파싱은 어드민 UI 변경 시 즉시 깨짐.

### 수정

#### 3a. cheerio 설치

```bash
npm install cheerio
```

#### 3b. adminProxy.ts 파싱 함수 교체

```typescript
import * as cheerio from 'cheerio';

// parseMemberHtml → cheerio 버전
function parseMemberHtml(html: string, uid: string): MemberDetail {
  const $ = cheerio.load(html);

  // __NEXT_DATA__ JSON이 있으면 우선 사용
  const nextData = $('script#__NEXT_DATA__').text();
  if (nextData) {
    try {
      const json = JSON.parse(nextData);
      const pageProps = json?.props?.pageProps;
      if (pageProps?.member) {
        const m = pageProps.member;
        return {
          uid,
          name: m.name ?? uid,
          phone: m.phone,
          ptType: m.ptType,
          trainerName: m.trainerName,
          centerName: m.centerName,
          ptCancelRequested: m.ptCancelRequested ?? false,
          instagramUrl: m.instagramUrl,
          adminUrl: `${ADMIN_BASE}/manage/members/${uid}`,
          tabs: { /* 기존과 동일 */ },
        };
      }
    } catch { /* JSON 파싱 실패 시 DOM 파싱으로 fallback */ }
  }

  // DOM 파싱 fallback
  const name = $('dt:contains("이름")').next('dd').text().trim() || uid;
  const phone = $('dt:contains("휴대전화")').next('dd').text().trim();
  const ptType = $('[class*="badge"], [class*="label"]')
    .filter((_, el) => /PT골드|PT실버|핵심 개념|수료후강의반|강의반|그레이|버건디|블루|커맨드/.test($(el).text()))
    .first().text().trim() || undefined;
  const trainerName = $('dt:contains("담당 트레이너")').next('dd').text().trim() || undefined;
  const ptCancelRequested = $('body').text().includes('PT 탈퇴 신청');

  return {
    uid, name, phone, ptType, trainerName,
    centerName: undefined, ptCancelRequested,
    instagramUrl: undefined,
    adminUrl: `${ADMIN_BASE}/manage/members/${uid}`,
    tabs: {
      ptSchedule: `${ADMIN_BASE}/manage/members/${uid}?tab=PtSchedule`,
      lectureProgress: `${ADMIN_BASE}/manage/members/${uid}?tab=lectureProgress`,
      thumbnailMaster: `${ADMIN_BASE}/manage/members/${uid}?tab=thumbnailMaster`,
      prodDiary: `${ADMIN_BASE}/manage/members/${uid}?tab=prodDiary`,
      payment: `${ADMIN_BASE}/manage/members/${uid}?tab=payment`,
      contents: `${ADMIN_BASE}/manage/members/${uid}?tab=contents`,
    },
  };
}

// parsePtScheduleHtml → cheerio 버전
function parsePtScheduleHtml(html: string): any {
  const $ = cheerio.load(html);
  const schedules: Array<{ date: string; time: string; type: string; status: string }> = [];
  $('table tr').slice(1, 30).each((_, row) => {
    const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get();
    if (cells.length >= 3 && cells[0]) {
      schedules.push({ date: cells[0], time: cells[1] ?? "", type: cells[2] ?? "", status: cells[3] ?? "" });
    }
  });
  return { schedules };
}

// parseLectureProgressHtml → cheerio 버전
function parseLectureProgressHtml(html: string): any {
  const $ = cheerio.load(html);
  // 강의 목록 테이블에서 "완료" 상태인 행만 카운트
  const rows = $('table tr, [class*="lecture"], [class*="progress"]');
  let completed = 0;
  let total = 0;
  rows.each((_, el) => {
    const text = $(el).text();
    if (text.includes('강의') || text.includes('레슨')) {
      total++;
      if (text.includes('완료')) completed++;
    }
  });
  // fallback: 텍스트 전체에서 카운트
  if (total === 0) {
    completed = ($('body').text().match(/완료/g) ?? []).length;
    total = Math.max(($('body').text().match(/강의/g) ?? []).length, completed);
  }
  return {
    completed, total,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// parseThumbnailMasterHtml → cheerio 버전
function parseThumbnailMasterHtml(html: string): any {
  const $ = cheerio.load(html);
  const text = $('body').text();
  return {
    thumbnailMasterDone: text.includes('썸끝') && (text.includes('완료') || text.includes('달성')),
    wonMasterDone: text.includes('원끝') && (text.includes('완료') || text.includes('달성')),
  };
}
```

---

## 4. Graceful Degradation (파싱 실패 fallback)

### 수정: 모든 fetch 함수에 try-catch + fallback 반환

```typescript
// adminProxy.ts의 각 fetch 함수에 적용
export async function fetchMemberByUid(uid: string): Promise<MemberDetail | null> {
  try {
    const cacheKey = `member:${uid}`;
    const cached = await getAdminCache(cacheKey);
    if (cached) return cached as MemberDetail;

    const html = await adminFetchHtml(`/manage/members/${uid}`);
    if (!html) return { uid, name: uid, adminUrl: `${ADMIN_BASE}/manage/members/${uid}`,
      _parseError: true, _message: "어드민 데이터를 가져올 수 없습니다" } as any;

    const member = parseMemberHtml(html, uid);
    if (member) await setAdminCache(cacheKey, member, MEMBER_CACHE_TTL);
    return member;
  } catch (error: any) {
    console.error(`[AdminProxy] fetchMemberByUid(${uid}) failed:`, error.message);
    return { uid, name: uid, adminUrl: `${ADMIN_BASE}/manage/members/${uid}`,
      _parseError: true, _message: error.message } as any;
  }
}
```

프론트엔드에서 `_parseError` 필드 확인:
```tsx
{member._parseError && (
  <div className="text-amber-500 text-xs p-2 bg-amber-500/10 rounded">
    어드민 데이터를 가져올 수 없습니다.
    <a href={member.adminUrl} target="_blank" className="underline ml-1">어드민에서 직접 확인</a>
  </div>
)}
```

---

## 5. 어드민 세션 만료 감지 + 재연동 알림

### 수정

#### 5a. adminProxy.ts — 세션 만료 감지

```typescript
// getAuthHeaders에서 null 반환 시 세션 만료 의미
// checkAdminSession에 만료 정보 추가
export async function checkAdminSession(): Promise<{
  connected: boolean;
  expired: boolean;
  lastLoginAt?: string;
  expiresAt?: string;
}> {
  const session = await getAdminSession();
  if (!session) return { connected: false, expired: false };
  const isExpired = session.expiresAt ? new Date() > new Date(session.expiresAt) : false;
  return {
    connected: !isExpired,
    expired: isExpired,
    lastLoginAt: session.lastLoginAt?.toISOString(),
    expiresAt: session.expiresAt?.toISOString(),
  };
}
```

#### 5b. 프론트엔드 — 재연동 알림

```tsx
// Dashboard.tsx 또는 TempoLayout.tsx에서
const { data: sessionStatus } = trpc.admin.sessionStatus.useQuery();

{sessionStatus?.expired && (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
    <AlertCircle className="w-4 h-4 text-amber-500" />
    <span className="text-sm text-amber-500">어드민 세션이 만료되었습니다.</span>
    <Link href="/admin-settings">
      <Button size="sm" variant="outline">재연동</Button>
    </Link>
  </div>
)}
```

---

## 6. 주간 성찰 기본 템플릿

### 목표
주간 보고서에 "성찰" 섹션을 추가. 이번 주 데이터를 자동 요약하고 성찰 질문 제시.

### 6a. 스키마 추가 — weeklyReports에 성찰 필드

```typescript
// drizzle/schema.ts weeklyReports에 추가
reflection: json("reflection"),  // {whatWentWell, whatToImprove, lessonsLearned, nextWeekFocus}
```

마이그레이션 SQL:
```sql
ALTER TABLE `weekly_reports` ADD COLUMN `reflection` json NULL AFTER `memo`;
```

### 6b. 프론트엔드 — ReportPage.tsx에 성찰 섹션

주간 보고서 작성 UI에 성찰 탭/섹션 추가:

```tsx
// 자동 계산되는 주간 요약 데이터
const weekSummary = useMemo(() => {
  if (!todos) return null;
  const weekTodos = todos.filter(t => t.week === currentWeek && t.year === currentYear);
  const completed = weekTodos.filter(t => t.status === "done");
  const carried = weekTodos.filter(t => t.isCarriedOver);

  // 이월 사유 분포
  const reasonCounts: Record<string, number> = {};
  carried.forEach(t => {
    if (t.carryOverReason) reasonCounts[t.carryOverReason] = (reasonCounts[t.carryOverReason] || 0) + 1;
  });

  // 카테고리별 시간
  const categoryTime: Record<string, number> = {};
  completed.forEach(t => {
    const cat = t.category || "other";
    categoryTime[cat] = (categoryTime[cat] || 0) + (t.actualMinutes || 0);
  });

  // 예측 정확도
  const withTime = completed.filter(t => t.estimatedMinutes && t.actualMinutes);
  const avgAccuracy = withTime.length > 0
    ? Math.round(withTime.reduce((acc, t) =>
        acc + Math.min(t.estimatedMinutes!, t.actualMinutes!) / Math.max(t.estimatedMinutes!, t.actualMinutes!) * 100
      , 0) / withTime.length)
    : null;

  return {
    totalPlanned: weekTodos.length,
    completed: completed.length,
    completionRate: weekTodos.length > 0 ? Math.round(completed.length / weekTodos.length * 100) : 0,
    carriedOver: carried.length,
    topCarryReason: Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0],
    categoryTime,
    predictionAccuracy: avgAccuracy,
  };
}, [todos, currentWeek, currentYear]);
```

성찰 질문 UI:
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-base">주간 성찰</CardTitle>
    <CardDescription>이번 주를 돌아보며 다음 주를 준비합니다</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* 자동 요약 */}
    {weekSummary && (
      <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
        <p>이번 주 달성률: <strong>{weekSummary.completionRate}%</strong> ({weekSummary.completed}/{weekSummary.totalPlanned})</p>
        {weekSummary.carriedOver > 0 && <p>이월: {weekSummary.carriedOver}건 (주 사유: {REASON_LABELS[weekSummary.topCarryReason?.[0]] ?? "없음"})</p>}
        {weekSummary.predictionAccuracy && <p>예측 정확도: {weekSummary.predictionAccuracy}%</p>}
      </div>
    )}

    {/* 성찰 입력 */}
    <div>
      <Label className="text-xs text-muted-foreground">잘한 점</Label>
      <Textarea placeholder="이번 주 잘한 점은?" className="mt-1 h-20"
        value={reflection.whatWentWell}
        onChange={e => setReflection(r => ({ ...r, whatWentWell: e.target.value }))} />
    </div>
    <div>
      <Label className="text-xs text-muted-foreground">개선할 점</Label>
      <Textarea placeholder="다음 주에 개선할 점은?" className="mt-1 h-20"
        value={reflection.whatToImprove}
        onChange={e => setReflection(r => ({ ...r, whatToImprove: e.target.value }))} />
    </div>
    <div>
      <Label className="text-xs text-muted-foreground">배운 점</Label>
      <Textarea placeholder="이번 주 배운 것은?" className="mt-1 h-20"
        value={reflection.lessonsLearned}
        onChange={e => setReflection(r => ({ ...r, lessonsLearned: e.target.value }))} />
    </div>
    <div>
      <Label className="text-xs text-muted-foreground">다음 주 집중 포인트</Label>
      <Textarea placeholder="다음 주에 가장 집중할 것은?" className="mt-1 h-20"
        value={reflection.nextWeekFocus}
        onChange={e => setReflection(r => ({ ...r, nextWeekFocus: e.target.value }))} />
    </div>
  </CardContent>
</Card>
```

### 6c. 이월 사유 상수 (공유)

```typescript
// shared/const.ts에 추가
export const CARRY_OVER_REASONS = {
  other_urgent: "타 업무 긴급",
  underestimated: "예상시간 부족",
  condition: "컨디션 난조",
  external: "외부 요인",
  postponed: "단순 미룸",
} as const;

export const CATEGORY_LABELS = {
  pt_lesson: "PT 수업",
  member_mgmt: "회원 관리",
  education: "교육",
  marketing: "마케팅",
  admin_work: "행정 업무",
  report: "보고/문서",
  meeting: "회의",
  other: "기타",
} as const;
```

---

## 7. 게시판 allowedRoles/canWrite 활성화

### 현재: 스키마에 allowedRoles/canWrite 있지만 조회 시 미사용

### 수정: routers/system.ts의 board.list에서 역할 필터 적용

```typescript
// board.list 수정
list: protectedProcedure.query(async ({ ctx }) => {
  const boards = await db.getBoards();
  const role = ctx.user.tempoRole ?? "trainer";

  // allowedRoles 필터
  return boards.filter(board => {
    if (!board.allowedRoles || board.allowedRoles === "all") return true;
    try {
      const allowed = JSON.parse(board.allowedRoles);
      return Array.isArray(allowed) ? allowed.includes(role) : true;
    } catch { return true; }
  });
}),

// post.create 수정 — canWrite 체크
create: protectedProcedure
  .input(z.object({ boardId: z.number(), title: z.string(), content: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const boards = await db.getBoards();
    const board = boards.find(b => b.id === input.boardId);
    if (!board) throw new TRPCError({ code: "NOT_FOUND" });

    const role = ctx.user.tempoRole ?? "trainer";
    if (board.canWrite && board.canWrite !== "all") {
      try {
        const canWrite = JSON.parse(board.canWrite);
        if (Array.isArray(canWrite) && !canWrite.includes(role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "이 게시판에 글을 작성할 권한이 없습니다." });
        }
      } catch (e) { if (e instanceof TRPCError) throw e; }
    }

    return db.createPost({ ...input, authorId: ctx.user.id });
  }),
```

---

## 8. 타임존 처리 통일

### 문제
서버에서 `new Date().toISOString().split("T")[0]` 사용 시 UTC 기준 날짜 생성.
한국(UTC+9) 자정 이후 → 서버에서 하루 전 날짜로 저장됨.

### 수정 원칙
- 날짜 문자열은 **항상 클라이언트에서 로컬 YYYY-MM-DD로 생성**해서 전달
- 서버에서 `new Date().toISOString().split("T")[0]` 패턴 사용 금지

### 수정 위치

```typescript
// routers/schedule.ts — autoSchedule 내부 (기존 L274, L349, L369, L371)
// 현재:
const dateStr = date.toISOString().split("T")[0];
// 변경:
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
const dateStr = toLocalDateStr(date);
```

이 헬퍼를 `shared/const.ts`에 추가하고 서버/클라이언트 모두에서 사용:

```typescript
// shared/const.ts에 추가
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
```

---

## 9. 핵심 로직 단위 테스트 추가

### 추가할 테스트 목록

```typescript
// server/tests/carryOver.test.ts
import { describe, it, expect } from "vitest";
import { getISOWeek, getISOWeekYear } from "date-fns";

describe("ISO Week 계산", () => {
  it("2026-01-01은 1주차", () => {
    const d = new Date(2026, 0, 1);
    expect(getISOWeek(d)).toBe(1);
  });
  it("2026-12-31은 53주차", () => {
    const d = new Date(2026, 11, 31);
    expect(getISOWeek(d)).toBe(53);
  });
  it("2026-04-06은 15주차", () => {
    const d = new Date(2026, 3, 6);
    expect(getISOWeek(d)).toBe(15);
  });
});

describe("이월 사유 유효성", () => {
  const validReasons = ["other_urgent", "underestimated", "condition", "external", "postponed"];
  it("유효한 사유만 허용", () => {
    validReasons.forEach(r => expect(validReasons.includes(r)).toBe(true));
  });
  it("빈 문자열은 undefined로 처리", () => {
    expect("" || undefined).toBeUndefined();
  });
});

describe("카테고리 상수", () => {
  const CATEGORY_LABELS = {
    pt_lesson: "PT 수업", member_mgmt: "회원 관리", education: "교육",
    marketing: "마케팅", admin_work: "행정 업무", report: "보고/문서",
    meeting: "회의", other: "기타",
  };
  it("8개 카테고리 존재", () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(8);
  });
});

describe("toLocalDateStr", () => {
  it("한국 날짜 형식 정확", () => {
    const d = new Date(2026, 3, 7); // 2026-04-07
    const result = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    expect(result).toBe("2026-04-07");
  });
});
```

---

## 실행 순서 (Claude Code에서)

```
1단계: npm install cheerio (3번 사전 준비)
2단계: 작업 8 — 타임존 헬퍼 추가 (shared/const.ts, 가장 간단)
3단계: 작업 7 — 게시판 allowedRoles/canWrite (간단)
4단계: 작업 2 — 어드민 세션 사용자별 분리 (스키마 + DB + 라우터)
5단계: 작업 3 — cheerio DOM 파싱 전환
6단계: 작업 4 — Graceful Degradation
7단계: 작업 5 — 세션 만료 감지 + 재연동 UI
8단계: 작업 1 — organizationId 전체 쿼리 필터 (가장 범위 넓음, 마지막)
9단계: 작업 6 — 주간 성찰 템플릿 (프론트엔드 UI)
10단계: 작업 9 — 테스트 추가 + 전체 테스트 실행
11단계: git commit + push
```

## 주의사항

- cheerio는 서버사이드 전용. 클라이언트에 import하지 말 것
- organizationId 필터 추가 시 기존 테스트가 깨질 수 있음 — 테스트에서 organizationId를 undefined로 전달하면 기존 동작 유지
- 주간 성찰 UI는 ReportPage.tsx의 주간 보고서 탭에 추가 (새 페이지 아님)
- 어드민 세션 분리 후 기존 세션은 userId=null로 남아있을 수 있음 — 이건 무시해도 됨
