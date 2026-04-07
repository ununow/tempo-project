# Tempo 파일 분리 설계서

> Claude Code 실행용 — 이 문서대로 순서대로 실행할 것
> 기능 변경 없이 구조만 변경. 모든 테스트 통과해야 함.

---

## 1. 목표

```
변경 전:
  server/routers.ts    831줄 (모든 도메인)
  server/db.ts         763줄 (모든 쿼리)

변경 후:
  server/routers/index.ts       (mergeRouters, 약 30줄)
  server/routers/middleware.ts   (권한 guard, 약 25줄)
  server/routers/auth.ts         (인증, 약 30줄)
  server/routers/todo.ts         (TODO CRUD + 이월, 약 140줄)
  server/routers/schedule.ts     (스케줄 블럭 + 자동배치, 약 200줄)
  server/routers/report.ts       (일일/주간 보고서, 약 80줄)
  server/routers/admin.ts        (어드민 프록시, 약 50줄)
  server/routers/team.ts         (팀 + 승인 + 면담, 약 120줄)
  server/routers/member.ts       (트레이너 회원 관리, 약 45줄)
  server/routers/system.ts       (유저관리 + 초대 + 게시판 + 설정, 약 120줄)

  server/db/index.ts             (getDb + re-export, 약 30줄)
  server/db/users.ts             (유저 CRUD, 약 80줄)
  server/db/todos.ts             (TODO 쿼리, 약 60줄)
  server/db/schedule.ts          (스케줄 쿼리, 약 120줄)
  server/db/reports.ts           (보고서 쿼리, 약 60줄)
  server/db/teams.ts             (팀 + 멤버 쿼리, 약 120줄)
  server/db/admin.ts             (캐시 + 세션, 약 50줄)
  server/db/community.ts         (게시판 + 즐겨찾기 + 링크, 약 100줄)
  server/db/invitations.ts       (초대, 약 40줄)
```

---

## 2. routers 분리 — 상세 매핑

### 2.1 server/routers/middleware.ts

소스: routers.ts L10-26 (Role guard helpers)

```typescript
// 이 파일에 포함할 것:
export { protectedProcedure, publicProcedure, router } from "../_core/trpc";
export { managerProcedure };      // L11-17
export { centerManagerProcedure }; // L20-26
// + TRPCError re-export
```

### 2.2 server/routers/auth.ts

소스: routers.ts L32-54 (auth router)

```typescript
import { router, publicProcedure, protectedProcedure } from "./middleware";
import * as db from "../db";

export const authRouter = router({
  me: ...,        // L33-37
  logout: ...,    // L38-42
  updateProfile: ..., // L43-53
});
```

db.ts 함수 의존: `getUserById`, `updateUserProfile`

### 2.3 server/routers/todo.ts

소스: routers.ts L57-72 (org) + L75-203 (todo)

```typescript
import { router, protectedProcedure, managerProcedure } from "./middleware";
import * as db from "../db";
import { getISOWeek, getISOWeekYear } from "date-fns";

export const orgRouter = router({ ... });   // L57-72
export const todoRouter = router({
  list: ...,              // L76-90
  create: ...,            // L91-118
  update: ...,            // L119-130
  delete: ...,            // L131-133
  weekSplits: ...,        // L134-137
  upsertWeekSplit: ...,   // L138-146
  addActualMinutes: ...,  // L148-159  ← 원자적 업데이트로 수정됨
  carryOver: ...,         // L161-202  ← ISO week + N+1 + 트랜잭션 수정됨
});
```

db.ts 함수 의존: `getTodos`, `createTodo`, `updateTodo`, `deleteTodo`, `getTodoWeekSplits`, `upsertTodoWeekSplit`, `addActualMinutesAtomic`(신규), `withTransaction`(신규), `getOrganizations`, `createOrganization`, `getUsersByOrg`

### 2.4 server/routers/schedule.ts

소스: routers.ts L206-426 (schedule — 가장 큰 블록)

```typescript
import { router, protectedProcedure } from "./middleware";
import * as db from "../db";

export const scheduleRouter = router({
  blocks: ...,          // L207-209
  createBlock: ...,     // L211-230
  updateBlock: ...,     // L231-245
  deleteBlock: ...,     // L246-249
  templates: ...,       // L250-252
  createTemplate: ...,  // L253-280
  applyTemplates: ...,  // L281-292
  deleteTemplate: ...,  // L293-295  ← userId 검증 추가됨
  favoriteBlocks: ...,  // L297-299
  saveFavoriteBlock: ..., // L300-320
  deleteFavoriteBlock: ..., // L321-333
  autoSchedule: ...,    // L334-426  ← 가장 복잡한 로직
});
```

db.ts 함수 의존: `getScheduleBlocks`, `createScheduleBlock`, `updateScheduleBlock`, `deleteScheduleBlock`, `getScheduleTemplates`, `createScheduleTemplate`, `deleteScheduleTemplate`, `getFavoriteBlocks`, `getFavoriteBlockById`, `createFavoriteBlock`, `deleteFavoriteBlock`, `getTodosForAutoSchedule`

### 2.5 server/routers/report.ts

소스: routers.ts L428-498 (report)

```typescript
import { router, protectedProcedure } from "./middleware";
import * as db from "../db";

export const reportRouter = router({
  daily: ...,         // L429 (get)
  dailyList: ...,     // L432 (list)
  upsertDaily: ...,   // L435-460
  weekly: ...,        // L461 (get)
  upsertWeekly: ...,  // L470-497
});
```

db.ts 함수 의존: `getDailyReport`, `getDailyReports`, `upsertDailyReport`, `getWeeklyReport`, `upsertWeeklyReport`

### 2.6 server/routers/admin.ts

소스: routers.ts L578-612 (admin)

```typescript
import { router, protectedProcedure, centerManagerProcedure } from "./middleware";
import * as db from "../db";
import * as adminProxy from "../adminProxy";

export const adminRouter = router({
  login: centerManagerProcedure...,  // L579  ← 수정됨
  sessionStatus: ...,    // L583
  trainers: ...,         // L584
  notifications: ...,    // L585
  notificationCount: ..., // L586
  emergencyNotice: ...,  // L587
  links: ...,            // L589
  memberByUid: ...,      // L591-602  ← 권한 체크 있음
  memberPtSchedule: ..., // L603-605  ← 권한 체크 추가됨
  memberLectureProgress: ..., // L606-608  ← 권한 체크 추가됨
  memberThumbnailMaster: ..., // L609-611  ← 권한 체크 추가됨
});
```

db.ts 함수 의존: `getTrainerMembers` (권한 체크용)

### 2.7 server/routers/team.ts

소스: routers.ts L500-533 (approval) + L536-575 (interview) + L614-693 (team)

```typescript
import { router, protectedProcedure, managerProcedure } from "./middleware";
import * as db from "../db";

export const approvalRouter = router({ ... }); // L501-533
export const interviewRouter = router({ ... }); // L536-575  ← trainerId 검증 추가됨
export const teamRouter = router({ ... });       // L614-693
```

db.ts 함수 의존: `getApprovalRequests`, `createApprovalRequest`, `updateApprovalRequest`, `getMemberInterviews`, `createMemberInterview`, `updateMemberInterview`, `getTeamsWithMembers`, `getTeamsByManager`, `getTeamsByMember`, `createTeam`, `updateTeam`, `deleteTeam`, `addTeamMember`, `removeTeamMember`, `getTeamMemberIds`, `getScheduleBlocksByUserIds`, `getUserBasicInfo`

### 2.8 server/routers/member.ts

소스: routers.ts L694-731 (trainerMember)

```typescript
import { router, protectedProcedure } from "./middleware";
import * as db from "../db";

export const trainerMemberRouter = router({
  list: ...,    // L695-706
  add: ...,     // L707-716
  update: ...,  // L717-727  ← 소유권 체크 추가됨
  remove: ...,  // L728-730  ← 소유권 체크 추가됨
});
```

db.ts 함수 의존: `getAllTrainerMembers`, `getTrainerMembers`, `getTrainerMembersByTeams`, `addTrainerMember`, `updateTrainerMember`, `removeTrainerMember`, `getTeamsByManager`

### 2.9 server/routers/system.ts

소스: routers.ts L733-831 (나머지 전부)

```typescript
import { router, protectedProcedure, managerProcedure, centerManagerProcedure } from "./middleware";
import * as db from "../db";

export const userManagementRouter = router({ ... }); // L733-741
export const invitationRouter = router({ ... });      // L744-765
export const boardRouter = router({ ... });           // L766-775
export const postRouter = router({ ... });            // L776-797
export const favoritesRouter = router({ ... });       // L798-808
export const externalLinkRouter = router({ ... });    // L809-819
export const profileRouter = router({ ... });         // L820-831
```

### 2.10 server/routers/index.ts (최종 합치기)

```typescript
import { router } from "./middleware";
import { systemRouter } from "../_core/systemRouter";
import { authRouter } from "./auth";
import { orgRouter, todoRouter } from "./todo";
import { scheduleRouter } from "./schedule";
import { reportRouter } from "./report";
import { adminRouter } from "./admin";
import { approvalRouter, interviewRouter, teamRouter } from "./team";
import { trainerMemberRouter } from "./member";
import {
  userManagementRouter, invitationRouter,
  boardRouter, postRouter,
  favoritesRouter, externalLinkRouter, profileRouter
} from "./system";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  org: orgRouter,
  todo: todoRouter,
  schedule: scheduleRouter,
  report: reportRouter,
  admin: adminRouter,
  approval: approvalRouter,
  interview: interviewRouter,
  team: teamRouter,
  trainerMember: trainerMemberRouter,
  userManagement: userManagementRouter,
  invitation: invitationRouter,
  board: boardRouter,
  post: postRouter,
  favorites: favoritesRouter,
  externalLink: externalLinkRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
```

---

## 3. db.ts 분리 — 상세 매핑

### 3.1 server/db/index.ts

```typescript
// DB 연결 + 모든 함수 re-export
export { getDb } from "./connection";
export * from "./users";
export * from "./todos";
export * from "./schedule";
export * from "./reports";
export * from "./teams";
export * from "./admin";
export * from "./community";
export * from "./invitations";
```

### 3.2 파일별 함수 매핑

| 파일 | 함수들 | 원본 라인 |
|------|--------|---------|
| `db/connection.ts` | `getDb`, `withTransaction`(신규) | L18-30 |
| `db/users.ts` | `upsertUser`, `getUserByOpenId`, `getUserById`, `updateUserProfile`, `getUsersByOrg`, `getAllUsers`, `setUserTempoRole`, `getUserBasicInfo` | L33-534 |
| `db/todos.ts` | `getTodos`, `createTodo`, `updateTodo`, `deleteTodo`, `getTodoWeekSplits`, `upsertTodoWeekSplit`, `addActualMinutesAtomic`(신규), `getTodosForAutoSchedule` | L129-555 |
| `db/schedule.ts` | `getScheduleBlocks`, `createScheduleBlock`, `updateScheduleBlock`, `deleteScheduleBlock`, `getScheduleTemplates`, `deleteScheduleTemplate`, `createScheduleTemplate`, `getFavoriteBlocks`, `getFavoriteBlockById`, `createFavoriteBlock`, `deleteFavoriteBlock`, `getScheduleBlocksByUserIds` | L181-634 |
| `db/reports.ts` | `getDailyReport`, `upsertDailyReport`, `getDailyReports`, `getWeeklyReport`, `upsertWeeklyReport` | L236-283 |
| `db/teams.ts` | `getAllTeams`, `getTeamsWithMembers`, `getTeamsByManager`, `getTeamsByMember`, `createTeam`, `updateTeam`, `deleteTeam`, `addTeamMember`, `removeTeamMember`, `getTeamMemberIds`, `getAllTrainerMembers`, `getTrainerMembers`, `getTrainerMembersByTeams`, `addTrainerMember`, `updateTrainerMember`, `removeTrainerMember` | L378-513 |
| `db/admin.ts` | `getAdminCache`, `setAdminCache`, `getAdminSession`, `saveAdminSession`, `invalidateAdminSession` | L329-375 |
| `db/community.ts` | `getBoards`, `createBoard`, `deleteBoard`, `getPosts`, `getPost`, `createPost`, `updatePost`, `deletePost`, `pinPost`, `getUserFavorites`, `addUserFavorite`, `removeUserFavorite`, `getExternalLinks`, `addExternalLink`, `removeExternalLink` | L673-763 |
| `db/invitations.ts` | `getInvitations`, `createInvitation`, `useInvitation`, `deleteInvitation` | L641-672 |
| `db/approval.ts` | `getApprovalRequests`, `createApprovalRequest`, `updateApprovalRequest`, `getMemberInterviews`, `createMemberInterview`, `updateMemberInterview`, `getOrganizations`, `createOrganization` | L115-327 |

---

## 4. 실행 순서 (Claude Code에서)

```
1단계: server/routers/ 디렉토리 생성
2단계: middleware.ts 생성 (권한 guard 추출)
3단계: 가장 작은 것부터 분리: auth.ts → member.ts → admin.ts
4단계: 중간 크기: report.ts → team.ts → system.ts
5단계: 가장 큰 것: todo.ts → schedule.ts
6단계: index.ts에서 mergeRouters
7단계: 기존 routers.ts 삭제 (import 경로 업데이트)
8단계: npm test 실행 — 12개 모두 통과 확인
9단계: 같은 방식으로 db/ 분리
10단계: 최종 npm test + git commit
```

## 5. 주의사항

- `import * as db from "./db"` 경로가 `import * as db from "../db"` 로 변경됨
- `import * as adminProxy from "./adminProxy"` → `"../adminProxy"`
- 기존 routers.ts를 삭제하기 전에 index.ts가 정확히 같은 `appRouter`를 export하는지 확인
- vite.config.ts나 다른 설정에서 routers.ts를 직접 참조하는 곳이 없는지 확인
- server/_core/systemRouter.ts의 import 경로는 변경 불필요
